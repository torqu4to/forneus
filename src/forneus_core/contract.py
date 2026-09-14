"""The shared shape every Forneus tool speaks.

A tool takes validated input and returns a `ToolResult`: totals, rows, and
notices. The API, the CSV/JSON exporters and the frontend components are
written against this shape only - so a new tool gets serialization,
provenance and the result table for free.

No tool ever returns human-readable prose. Every message is a `Notice`
carrying a translation key and its parameters; the presentation layer
resolves it in the viewer's language. See `forneus_core.i18n`.
"""
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Dict, List, Optional

SCHEMA_VERSION = 2


@dataclass(frozen=True)
class Notice:
    """A translatable message: a data caveat, a hint or a validation error."""
    key: str
    params: Dict[str, Any] = field(default_factory=dict)
    level: str = 'info'  # 'info' | 'warning' | 'error'

    def as_dict(self):
        return {'key': self.key, 'params': dict(self.params), 'level': self.level}


class ToolError(ValueError):
    """Invalid input, reported as a translatable notice rather than prose."""

    def __init__(self, key, **params):
        self.notice = Notice(key=key, params=params, level='error')
        super().__init__(key)


@dataclass
class ToolResult:
    """What every solver returns and every consumer reads."""
    tool: str
    totals: Dict[str, Any] = field(default_factory=dict)
    rows: List[Dict[str, Any]] = field(default_factory=list)
    notices: List[Notice] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def as_document(self):
        """Plain-data snapshot: the payload the API returns and JSON exports."""
        return {
            'schema_version': SCHEMA_VERSION,
            'tool': self.tool,
            'totals': dict(self.totals),
            'rows': [dict(row) for row in self.rows],
            'notices': [notice.as_dict() for notice in self.notices],
            'meta': dict(self.meta),
        }


@dataclass(frozen=True)
class ToolSpec:
    """Registry entry describing one tool to the API and the frontend."""
    name: str                       # url slug, e.g. 'amigatos'
    title_key: str                  # translation key for the display name
    description_key: str
    solve: Callable[..., ToolResult]
    columns: List[str]              # row keys, in display order
    numeric_columns: List[str] = field(default_factory=list)
    dataset: Optional[str] = None   # tool name under data/, when it has one
    status: str = 'available'       # 'available' | 'planned'

    def as_dict(self):
        document = asdict(self)
        document.pop('solve')
        return document
