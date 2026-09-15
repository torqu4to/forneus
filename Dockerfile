# Forneus API.
#
# One small container running the solver inline. No queue and no worker: the
# optimizer's worst case is bounded by the game data (~1 s), not by caller
# input — see src/forneus_core/api/app.py and tests/test_solver_bounds.py.
FROM python:3.12-slim AS build
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir --prefix=/install ".[api]"

FROM python:3.12-slim
# Never run as root; nothing here writes to disk.
RUN useradd --create-home --uid 10001 forneus
WORKDIR /app
COPY --from=build /install /usr/local
COPY --from=build /app/src ./src
USER forneus

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=4).status==200 else 1)"

# One worker is the right default here: the solver holds the GIL for its whole
# run, so extra workers buy real concurrency, but each also holds its own copy
# of the DP arrays (~11 MB peak). Raise this only alongside the memory limit,
# and move the rate limiter to shared storage first — it is per process.
CMD ["uvicorn", "forneus_core.api:create_app", "--factory", \
     "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
