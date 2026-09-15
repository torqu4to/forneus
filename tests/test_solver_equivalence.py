"""The accelerated solver must be an optimization, never a behavior change.

numpy is optional: the package works without it and must return the SAME
allocation either way — same total power, same jelly spent, same levels, and
the same tie-breaking. These tests are what let the fast path be trusted.
"""
import random

import pytest

from forneus_core.tools.amigatos import optimizer as op
from forneus_core.tools.amigatos.data import EFFECTIVENESS_RATE, TABLES

numpy_available = op._np is not None
requires_numpy = pytest.mark.skipif(not numpy_available, reason='numpy not installed')


def _items(counts):
    items = []
    for key, table in TABLES.items():
        quantity = counts.get(key, 0)
        if quantity <= 0:
            continue
        options, _entry = op.cumulative_options(table, EFFECTIVENESS_RATE[key])
        items += [(key, options)] * quantity
    return items


def _entry_cost(counts):
    return sum(
        quantity * op.cumulative_options(TABLES[key], EFFECTIVENESS_RATE[key])[1]
        for key, quantity in counts.items()
    )


def _summarize(chosen):
    """Compare on the numbers that reach the user, not on object identity."""
    return (
        round(sum(option[1] for option in chosen), 6),
        sum(option[0] for option in chosen),
        [option[3] for option in chosen],
    )


@requires_numpy
@pytest.mark.parametrize('seed', range(25))
def test_solvers_agree_on_random_teams(seed):
    random.seed(seed)
    counts = {}
    total = 0
    for key in TABLES:
        quantity = min(random.randint(0, 4), 18 - total)
        counts[key] = quantity
        total += quantity
    if total == 0:
        pytest.skip('empty team is handled before the solver')

    budget = random.randint(0, 60_000) - _entry_cost(counts)
    if budget < 0:
        pytest.skip('team is unaffordable at this budget')

    items = _items(counts)
    assert _summarize(op._solve_numpy(items, budget)) == \
           _summarize(op._solve_python(items, budget))


@requires_numpy
@pytest.mark.parametrize('counts,budget', [
    ({'Purple': 1}, 0),          # no budget at all
    ({'Purple': 1}, 70),         # exactly one bracket
    ({'RedR2': 2}, 1),           # budget below the cheapest step
    ({'GoldR1': 18}, 12_000),    # a full team of one category
])
def test_solvers_agree_on_edges(counts, budget):
    items = _items(counts)
    assert _summarize(op._solve_numpy(items, budget)) == \
           _summarize(op._solve_python(items, budget))


@requires_numpy
def test_ties_break_the_same_way():
    """Two options of equal power: both solvers must keep the cheaper one."""
    options = [(0, 0.0, 0.0, 10), (100, 5.0, 5.0, 20), (200, 5.0, 5.0, 30)]
    items = [('X', options)]
    assert op._solve_numpy(items, 500) == op._solve_python(items, 500)
    assert op._solve_numpy(items, 500)[0][0] == 100


def test_dispatcher_delegates_to_the_accelerator_when_present(monkeypatch):
    """`_solve` must actually route to numpy when numpy is there, and fall
    back cleanly when it is not — asserting on function identity would pass
    for the wrong reason, since `_solve` is its own function either way."""
    called = []
    monkeypatch.setattr(op, '_solve_numpy', lambda items, budget: called.append('numpy') or [])
    monkeypatch.setattr(op, '_solve_python', lambda items, budget: called.append('python') or [])

    monkeypatch.setattr(op, '_np', object())
    op._solve([], 10)
    assert called == ['numpy']

    monkeypatch.setattr(op, '_np', None)
    op._solve([], 10)
    assert called == ['numpy', 'python']
