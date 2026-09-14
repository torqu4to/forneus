"""Forneus - shared core for the forneus.wiki tool hub.

The solvers here are pure: no printing, no I/O, no user-facing prose. Each
tool registers a `ToolSpec` and returns a `ToolResult`, which the API, the
exporters and the frontend all consume through the same contract.
"""
from .contract import Notice, ToolError, ToolResult, ToolSpec, SCHEMA_VERSION
from .dataio import DataError, load_dataset
from . import registry

__all__ = [
    'Notice', 'ToolError', 'ToolResult', 'ToolSpec', 'SCHEMA_VERSION',
    'DataError', 'load_dataset', 'registry',
]

__version__ = '0.2.0'
