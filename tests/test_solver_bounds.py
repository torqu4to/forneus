"""The API relies on the solver's worst case being bounded by the DATA, not by
what a caller sends. If that ever stops being true, the deployment needs a
queue or a timeout — so it is pinned here rather than left as a comment.
"""
import time

import pytest

from forneus_core.tools.amigatos import solve
from forneus_core.tools.amigatos.data import MAX_TEAM_SIZE, TABLES

MAX_SAFE_INTEGER = 9_007_199_254_740_991


def dp_ceiling():
    """The largest leveling budget the DP can ever be asked to cover: beyond
    it every catpal is already maxed and the optimizer short-circuits."""
    return MAX_TEAM_SIZE * max(sum(row[1] for row in table) for table in TABLES.values())


def test_absurd_budgets_short_circuit():
    """A caller cannot buy work by sending a bigger number."""
    start = time.perf_counter()
    result = solve({'RedR2': MAX_TEAM_SIZE}, MAX_SAFE_INTEGER)
    elapsed = time.perf_counter() - start
    assert result.totals['leftover'] > 0
    assert elapsed < 0.5, f'huge budget took {elapsed:.2f}s — the short-circuit broke'


def test_worst_case_is_bounded(capsys):
    """The most expensive reachable request must stay comfortably sub-second.

    The threshold is loose on purpose: this guards against an algorithmic
    regression (a lost short-circuit, a dropped accelerator), not against a
    slow CI runner.
    """
    start = time.perf_counter()
    solve({'RedR2': MAX_TEAM_SIZE}, dp_ceiling() - 1)
    elapsed = time.perf_counter() - start
    with capsys.disabled():
        print(f'\n  worst reachable case: {elapsed * 1000:.0f} ms')
    assert elapsed < 5.0, (
        f'worst case took {elapsed:.1f}s. The API assumes this is bounded and '
        'runs the solver inline; revisit that before shipping.'
    )


@pytest.mark.parametrize('counts', [
    {'RedR2': MAX_TEAM_SIZE},
    {'Purple': MAX_TEAM_SIZE},
    {'RedR2': 4, 'RedR1': 4, 'GoldR2': 4, 'GoldR1': 3, 'Purple': 3},
])
def test_no_team_escapes_the_ceiling(counts):
    """Whatever the team, the work is capped by the same data-derived number."""
    ceiling = dp_ceiling()
    start = time.perf_counter()
    solve(counts, ceiling // 2)
    assert time.perf_counter() - start < 5.0
