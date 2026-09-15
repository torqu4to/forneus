"""The FastAPI application.

Design notes worth keeping:

* **No queue, no worker, no timeout.** The solver's worst case over *any*
  input is bounded by the game data, not by what the caller sends: above the
  cost of maxing every catpal (623 700 jelly today) the optimizer returns the
  best options directly without building arrays, so a budget of nine
  quadrillion is instant. Measured worst case is ~0.9 s. A timeout you cannot
  enforce (you cannot cancel a running thread) would be theatre; a bounded
  worst case is the real guarantee. `test_worst_case_is_bounded` pins it.

* **Locale is negotiated once per request** and applied only when turning
  notices into text. Nothing below this layer knows the caller's language.

* **Errors are keys first.** A client branches on `error_key` and renders its
  own catalog; `error` is the resolved fallback.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .. import i18n
from ..contract import ToolError
from ..exports import format_csv, format_json, report_document
from ..registry import all_specs, get as get_tool
from ..tools import amigatos as _amigatos  # noqa: F401  (registers the tools)
from .ratelimit import RateLimiter
from .schemas import (ErrorResponse, SolveRequest, SolveResponse, ToolOut,
                      ToolsResponse)

ALLOWED_ORIGINS = [
    'https://forneus.wiki',
    'https://www.forneus.wiki',
    'http://localhost:4321',   # astro dev
]


def client_key(request: Request) -> str:
    """Identify the caller for rate limiting.

    Behind a proxy the socket address is the proxy's, so the first hop of
    X-Forwarded-For is used when present. That header is caller-controlled and
    therefore spoofable: it is fine for limiting accidental hammering, and it
    is NOT an identity. Only trust it because the deployment puts a proxy in
    front; strip it at the edge if that ever stops being true.
    """
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'


def create_app(limiter: RateLimiter = None) -> FastAPI:
    app = FastAPI(
        title='Forneus API',
        version='1.0.0',
        description='Optimization tools for Tree of Savior Neo.',
        docs_url='/api/docs',
        openapi_url='/api/openapi.json',
    )
    app.state.limiter = limiter or RateLimiter()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,   # no cookies yet; flip when accounts land
        allow_methods=['GET', 'POST'],
        allow_headers=['content-type', 'accept-language'],
    )

    def locale_of(request: Request) -> str:
        return i18n.negotiate(request.headers.get('accept-language'))

    @app.exception_handler(ToolError)
    async def tool_error(request: Request, error: ToolError):
        notice = error.notice
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=i18n.translate_notice(notice, locale_of(request)),
                error_key=notice.key,
                params=notice.params,
            ).model_dump(),
        )

    @app.middleware('http')
    async def rate_limit(request: Request, call_next):
        if request.method == 'POST':
            key = client_key(request)
            if not app.state.limiter.allow(key):
                retry = app.state.limiter.retry_after(key)
                return JSONResponse(
                    status_code=429,
                    headers={'Retry-After': str(retry)},
                    content=ErrorResponse(
                        error=i18n.translate('error.rate_limited',
                                             {'seconds': retry},
                                             locale_of(request)),
                        error_key='error.rate_limited',
                        params={'seconds': retry},
                    ).model_dump(),
                )
        return await call_next(request)

    @app.get('/api/health')
    async def health():
        return {'status': 'ok', 'tools': [spec.name for spec in all_specs()]}

    @app.get('/api/tools', response_model=ToolsResponse)
    async def tools(request: Request):
        locale = locale_of(request)
        return ToolsResponse(
            locale=locale,
            tools=[
                ToolOut(
                    **{key: value for key, value in spec.as_dict().items()
                       if key in ToolOut.model_fields},
                    title=i18n.translate(spec.title_key, locale=locale),
                    description=i18n.translate(spec.description_key, locale=locale),
                )
                for spec in all_specs()
            ],
        )

    @app.post('/api/tools/amigatos/solve', response_model=SolveResponse,
              responses={400: {'model': ErrorResponse}, 429: {'model': ErrorResponse}})
    async def solve_amigatos(payload: SolveRequest, request: Request):
        """Run the amigatos optimizer.

        Defined per tool rather than as one generic `/tools/{name}/solve`
        because each tool's input is its own shape and deserves its own
        schema in the docs. A second tool is a second route beside this one.
        """
        locale = locale_of(request)
        result = get_tool('amigatos').solve(payload.counts, payload.total_jelly)
        document = report_document(result, locale)
        document['exports'] = {
            'csv': format_csv(result, locale),
            'json': format_json(result, locale),
        }
        return JSONResponse(document)

    return app
