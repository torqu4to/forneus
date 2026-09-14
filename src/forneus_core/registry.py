"""Tool registry: the single list the API and the frontend read from.

Adding a tool means appending a `ToolSpec` here. Nothing else in the API
layer needs to change - routes, exports and the tool index are generated
from what is registered.
"""
from .contract import ToolSpec

_REGISTRY = {}


def register(spec):
    if spec.name in _REGISTRY:
        raise ValueError(f'Tool {spec.name!r} is already registered.')
    _REGISTRY[spec.name] = spec
    return spec


def get(name):
    if name not in _REGISTRY:
        raise KeyError(name)
    return _REGISTRY[name]


def all_specs():
    return list(_REGISTRY.values())


def planned(name, title_key, description_key):
    """A tool announced on the site but not built yet."""
    return register(ToolSpec(
        name=name, title_key=title_key, description_key=description_key,
        solve=None, columns=[], status='planned'))
