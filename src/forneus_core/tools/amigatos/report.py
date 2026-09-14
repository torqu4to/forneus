"""
Text formatting for an OptimizationResult. Kept separate from optimizer.py
so the core logic stays UI-agnostic - a future web frontend would build its
own presentation layer instead of using this module.
"""

from collections import defaultdict

from .data import DISPLAY_NAMES, DISPLAY_ORDER, EFFECTIVENESS_RATE
from .optimizer import OptimizationResult


def _level_sort_key(level):
    """'Max' always counts as the highest possible level, for sorting purposes."""
    return float("inf") if level == "Max" else level


def format_report(result: OptimizationResult, counts: dict) -> str:
    lines = []
    lines.append("=" * 78)
    lines.append("OPTIMAL JELLY ALLOCATION REPORT")
    lines.append("=" * 78)

    counts_str = " | ".join(
        f"{counts.get(key, 0)} {DISPLAY_NAMES[key]}"
        for key in DISPLAY_ORDER
        if counts.get(key, 0) > 0
    )
    lines.append(f"Catpals: {counts_str or '(none)'}")
    lines.append("Effectiveness: Red 60% | Purple/Gold 30% of the table's power")
    lines.append(f"Jelly available: {result.total_jelly}")
    lines.append(f"Mandatory entry cost: {result.total_entry_cost}")
    lines.append(f"Remaining budget for leveling: {result.total_jelly - result.total_entry_cost}")
    lines.append("-" * 78)

    aggregated = defaultdict(int)
    for a in result.allocations:
        aggregated[(a.catpal_type, a.level, a.cost, a.effective_power, a.raw_power)] += 1

    for key in DISPLAY_ORDER:
        rows = sorted(
            [k for k in aggregated if k[0] == key],
            key=lambda k: -_level_sort_key(k[1])
        )
        if not rows:
            continue
        lines.append(f"\n-- {DISPLAY_NAMES[key]} (effectiveness {int(EFFECTIVENESS_RATE[key]*100)}%) --")
        for (name, level, cost, eff_power, raw_power) in rows:
            qty = aggregated[(name, level, cost, eff_power, raw_power)]
            lines.append(
                f"  {qty}x at level {str(level):>3}  |  extra cost: {cost:>7}  |  "
                f"raw power: {raw_power:>8.0f}  |  effective power: {eff_power:>9.1f}"
            )

    lines.append("-" * 78)
    lines.append(f"Total cost used (entry + leveling): {result.total_cost} of {result.total_jelly}")
    lines.append(f"Jelly left over: {result.jelly_leftover}")
    lines.append(f"Total raw power (table sum, before effectiveness): {result.total_raw_power:.0f}")
    lines.append(f"TOTAL EFFECTIVE POWER (what actually counts): {result.total_effective_power:.1f}")
    lines.append("=" * 78)

    return "\n".join(lines)
