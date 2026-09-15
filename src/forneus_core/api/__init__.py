"""HTTP layer for forneus.wiki.

Deliberately thin: validation lives in the tools, message text lives in the
locale catalogs, and the solvers know nothing about HTTP. Everything here is
wiring, error translation and abuse control.

`create_app` is resolved lazily so that `schemas` and `ratelimit` — which are
plain Python and carry their own tests — stay importable where FastAPI is not
installed.
"""
__all__ = ['create_app']


def __getattr__(name):
    if name == 'create_app':
        from .app import create_app
        return create_app
    raise AttributeError(name)
