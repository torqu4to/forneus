"""
Core optimization logic for the Forneus amigatos optimizer
(multiple-choice knapsack via dynamic programming).

This module has NO input/output side effects - it only takes data in and
returns data structures out. That makes it safe to import directly from a
CLI, a web backend (Flask/FastAPI), a notebook, or anything else that gets
built on top of this project later.

All jelly amounts passed to `optimize()` are expected to be in Fish Jelly
r1 units - see the README "Usage guide" for the in-game conversion steps.
Silverleaf currency and Dried Fish cookie costs are not modeled here yet.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Union

from ...contract import ToolError
from .data import TABLES, EFFECTIVENESS_RATE, DISPLAY_NAMES, DISPLAY_ORDER

try:                                    # optional accelerator, see _solve
    import numpy as _np
except ImportError:                     # pragma: no cover - exercised by CI matrix
    _np = None

Level = Union[int, str]  # int for normal levels, "Max" for the extra step


@dataclass
class Allocation:
    """One chosen upgrade outcome for a single catpal instance."""
    catpal_type: str          # internal key, e.g. "RedR1"
    level: Level               # e.g. 70 or "Max"
    cost: int                  # extra jelly spent to reach this level
    raw_power: float           # power value straight from the table
    effective_power: float     # raw_power * effectiveness rate


@dataclass
class OptimizationResult:
    allocations: List[Allocation] = field(default_factory=list)
    total_entry_cost: int = 0
    total_leveling_cost: int = 0
    total_jelly: int = 0
    total_raw_power: float = 0.0
    total_effective_power: float = 0.0

    @property
    def total_cost(self) -> int:
        return self.total_entry_cost + self.total_leveling_cost

    @property
    def jelly_leftover(self) -> int:
        return self.total_jelly - self.total_cost


def cumulative_options(table, effectiveness_rate: float):
    """
    Converts a raw table (level, bracket_cost, raw_power) into a list of
    options (cumulative_cost, effective_power, raw_power, level), including
    the option of staying at the base level (0 extra cost).
    """
    base_level, entry_cost, base_power = table[0]
    options = [(0, base_power * effectiveness_rate, base_power, base_level)]
    cum = 0
    for level, bracket_cost, power in table[1:]:
        cum += bracket_cost
        options.append((cum, power * effectiveness_rate, power, level))
    return options, entry_cost


def _solve_python(items, budget: int):
    """
    Multiple-choice knapsack: each item is (name, options) where options is
    a list of (cost, effective_power, raw_power, level). Picks exactly one
    option per item to maximize the sum of effective power within budget.

    Reference implementation: dependency-free and readable. It is O(budget x
    items x options) in interpreted Python, which at realistic budgets means
    seconds - see `_solve_numpy` for the accelerated path and `_solve` for
    how one is chosen.
    """
    dp_prev = [0] * (budget + 1)
    choice_history = []

    for name, options in items:
        dp_cur = [-1] * (budget + 1)
        choice_cur = [-1] * (budget + 1)
        for c in range(budget + 1):
            best = -1
            best_idx = -1
            for oi, (cost, eff_power, raw_power, level) in enumerate(options):
                if cost <= c and dp_prev[c - cost] >= 0:
                    value = dp_prev[c - cost] + eff_power
                    if value > best:
                        best = value
                        best_idx = oi
            dp_cur[c] = best
            choice_cur[c] = best_idx
        choice_history.append(choice_cur)
        dp_prev = dp_cur

    best_c = max(range(budget + 1), key=lambda c: dp_prev[c])

    c = best_c
    chosen = [None] * len(items)
    for idx in range(len(items) - 1, -1, -1):
        oi = choice_history[idx][c]
        name, options = items[idx]
        chosen[idx] = options[oi]
        c -= options[oi][0]

    return chosen


def _solve_numpy(items, budget: int):
    """
    Same recurrence as `_solve_python`, with the inner loop over budget moved
    into numpy.

    The Python version walks every (budget, option) pair one at a time; here
    each option is one vectorized pass over the whole budget axis, so the work
    happens in C. Measured on the real tables: the worst reachable case (18
    Red r2, budget just below the point where every catpal can be maxed) drops
    from ~21 s to ~0.65 s, and a typical team from ~1.1 s to ~0.02 s.

    Tie-breaking is deliberately identical to the reference: `cand > cur` is
    strict, so the earliest option wins a tie, and `argmax` returns the first
    maximum, so the cheapest budget wins. `test_solvers_agree` pins this.
    """
    neg = -_np.inf
    previous = _np.zeros(budget + 1, dtype=_np.float64)
    history = []

    for _name, options in items:
        current = _np.full(budget + 1, neg)
        picked = _np.zeros(budget + 1, dtype=_np.int16)
        for index, (cost, effective_power, _raw, _level) in enumerate(options):
            if cost > budget:
                continue
            candidate = _np.full(budget + 1, neg)
            if cost:
                _np.add(previous[:budget + 1 - cost], effective_power,
                        out=candidate[cost:])
            else:
                _np.add(previous, effective_power, out=candidate)
            better = candidate > current
            _np.copyto(current, candidate, where=better)
            picked[better] = index
        history.append(picked)
        previous = current

    budget_used = int(_np.argmax(previous))
    chosen = [None] * len(items)
    for index in range(len(items) - 1, -1, -1):
        option = items[index][1][int(history[index][budget_used])]
        chosen[index] = option
        budget_used -= option[0]
    return chosen


def _solve(items, budget: int):
    """Pick the fastest available exact solver.

    numpy is an optional dependency: without it the package still works and
    returns the same numbers, just slower. Nothing else in the codebase knows
    which one ran.
    """
    if _np is not None:
        return _solve_numpy(items, budget)
    return _solve_python(items, budget)


def optimize(counts: Dict[str, int], total_jelly: int) -> OptimizationResult:
    """
    Main entry point for consumers of this package (CLI, API, notebook, etc).

    counts: dict mapping catpal type key -> quantity, e.g.
        {"Purple": 5, "GoldR1": 5, "GoldR2": 4, "RedR1": 1, "RedR2": 1}
        Unspecified keys default to 0. Valid keys are the keys of
        jelly_optimizer.data.TABLES.
    total_jelly: total amount of jelly available.

    Returns an OptimizationResult. Raises ValueError if total_jelly is not
    even enough to cover the mandatory entry cost of the requested catpals.
    """
    for key in counts:
        if key not in TABLES:
            raise ToolError('error.category.unknown', category=key)

    items = []
    total_entry_cost = 0
    for key, table in TABLES.items():
        qty = counts.get(key, 0)
        if qty <= 0:
            continue
        options, entry_cost = cumulative_options(table, EFFECTIVENESS_RATE[key])
        total_entry_cost += qty * entry_cost
        items += [(key, options)] * qty

    leveling_budget = total_jelly - total_entry_cost
    if leveling_budget < 0:
        raise ToolError('error.jelly.insufficient',
                        available=total_jelly, required=total_entry_cost)

    if not items:
        return OptimizationResult(
            allocations=[], total_entry_cost=total_entry_cost,
            total_leveling_cost=0, total_jelly=total_jelly,
        )

    # Once every item's best power is affordable, extra budget cannot help.
    # On power ties choose the cheapest option, preserving minimal spending.
    best_options = [max(options, key=lambda option: (option[1], -option[0]))
                    for _, options in items]
    if sum(option[0] for option in best_options) <= leveling_budget:
        chosen = best_options
    else:
        chosen = _solve(items, leveling_budget)

    allocations = [
        Allocation(catpal_type=name, level=level, cost=cost,
                   raw_power=raw_power, effective_power=eff_power)
        for (name, _), (cost, eff_power, raw_power, level) in zip(items, chosen)
    ]

    return OptimizationResult(
        allocations=allocations,
        total_entry_cost=total_entry_cost,
        total_leveling_cost=sum(a.cost for a in allocations),
        total_jelly=total_jelly,
        total_raw_power=sum(a.raw_power for a in allocations),
        total_effective_power=sum(a.effective_power for a in allocations),
    )
