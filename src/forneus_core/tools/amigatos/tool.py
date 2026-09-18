"""Amigatos as a registered Forneus tool.

This is the only place that knows both the amigatos solver and the shared
contract. `solve()` validates input, runs the optimizer and returns a
`ToolResult` - totals, generic rows and translatable notices - so the API
and the exporters never import anything amigatos-specific.
"""
from collections import Counter

from ...contract import Notice, ToolError, ToolResult, ToolSpec
from ...registry import register
from .data import (COST_UNIT, COST_UNIT_KEY, DATA_TIER, DISPLAY_NAMES,
                   DISPLAY_ORDER, EFFECTIVENESS_RATE, MAX_SAFE_INTEGER,
                   MAX_TEAM_SIZE, TABLES)
from .optimizer import optimize

COLUMNS = ['display_name', 'level', 'cost', 'effective_power']
NUMERIC_COLUMNS = ['cost', 'raw_power', 'effective_power']


def data_notices():
    """Caveats that apply to every amigatos result, as translation keys."""
    return [Notice('notice.amigatos.currencies_excluded', level='warning')]


def _validated(counts, total_jelly):
    if not isinstance(counts, dict):
        raise ToolError('error.counts.missing')
    for key, quantity in counts.items():
        if key not in TABLES:
            raise ToolError('error.category.unknown', category=key)
        if type(quantity) is not int or not 0 <= quantity <= MAX_TEAM_SIZE:
            raise ToolError('error.counts.range', max=MAX_TEAM_SIZE)
    if sum(counts.values()) > MAX_TEAM_SIZE:
        raise ToolError('error.team.too_large', max=MAX_TEAM_SIZE)
    # Exact integers only: the value crosses the JavaScript/JSON boundary.
    if type(total_jelly) is not int or not 0 <= total_jelly <= MAX_SAFE_INTEGER:
        raise ToolError('error.jelly.range', max=MAX_SAFE_INTEGER)
    return counts, total_jelly


def solve(counts, total_jelly):
    """Run the optimizer and wrap its output in the shared contract."""
    counts, total_jelly = _validated(counts, total_jelly)
    result = optimize(counts, total_jelly)

    rows = [{
        'category': allocation.catpal_type,
        'display_name': DISPLAY_NAMES[allocation.catpal_type],
        'level': allocation.level,
        'cost': allocation.cost,
        'raw_power': allocation.raw_power,
        'effective_power': allocation.effective_power,
        'tier': list(DATA_TIER[allocation.catpal_type]),
        'effectiveness_rate': EFFECTIVENESS_RATE[allocation.catpal_type],
    } for allocation in result.allocations]

    return ToolResult(
        tool='amigatos',
        totals={
            'budget': result.total_jelly,
            'entry_cost': result.total_entry_cost,
            'leveling_cost': result.total_leveling_cost,
            'spent': result.total_cost,
            'leftover': result.jelly_leftover,
            'raw_power': result.total_raw_power,
            'effective_power': result.total_effective_power,
        },
        rows=rows,
        notices=data_notices(),
        meta={
            'cost_unit': COST_UNIT,
            'cost_unit_key': COST_UNIT_KEY,
            'counts': dict(Counter(row['category'] for row in rows)),
            'display_order': DISPLAY_ORDER,
            'data_tiers': {key: list(tier) for key, tier in DATA_TIER.items()},
            'effectiveness_rates': dict(EFFECTIVENESS_RATE),
            'max_team_size': MAX_TEAM_SIZE,
        },
    )


SPEC = register(ToolSpec(
    name='amigatos',
    title_key='tool.amigatos.title',
    description_key='tool.amigatos.description',
    solve=solve,
    columns=COLUMNS,
    numeric_columns=NUMERIC_COLUMNS,
    dataset='amigatos',
))
