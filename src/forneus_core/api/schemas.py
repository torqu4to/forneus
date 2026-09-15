"""Request and response shapes.

The response mirrors `ToolResult.as_document()` exactly — the API adds
`messages` (notices resolved in the caller's locale) and nothing else, so the
frontend's types and the Python contract stay one thing.
"""
from typing import Any, Dict, List, Union

from pydantic import BaseModel, Field


class SolveRequest(BaseModel):
    """Amigatos input. Bounds are repeated from the tool deliberately: a
    malformed body should be rejected before it reaches the solver, and the
    tool still validates independently for non-HTTP callers."""
    model_config = {'extra': 'forbid'}

    counts: Dict[str, int] = Field(default_factory=dict)
    total_jelly: int = Field(ge=0, le=9_007_199_254_740_991)


class NoticeOut(BaseModel):
    key: str
    params: Dict[str, Any] = Field(default_factory=dict)
    level: str


class SolveResponse(BaseModel):
    schema_version: int
    tool: str
    totals: Dict[str, Union[int, float]]
    rows: List[Dict[str, Any]]
    notices: List[NoticeOut]
    meta: Dict[str, Any]
    locale: str
    messages: List[str]


class ToolOut(BaseModel):
    name: str
    status: str
    title: str
    description: str
    title_key: str
    description_key: str
    columns: List[str]
    numeric_columns: List[str] = Field(default_factory=list)
    dataset: Union[str, None] = None


class ToolsResponse(BaseModel):
    locale: str
    tools: List[ToolOut]


class ErrorResponse(BaseModel):
    """Errors carry the key AND the resolved text: the key is what a client
    branches on, the text is what it shows if it has no catalog of its own."""
    error: str
    error_key: str
    params: Dict[str, Any] = Field(default_factory=dict)
