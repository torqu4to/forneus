import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from forneus_core.tools.amigatos.optimizer import optimize


def test_fully_funded_team_skips_budget_sized_solver(monkeypatch):
    from forneus_core.tools.amigatos import optimizer
    from forneus_core.tools.amigatos.data import TABLES

    def unnecessary_solver(*args):
        raise AssertionError('Fully funded teams must not allocate budget-sized arrays')

    monkeypatch.setattr(optimizer, '_solve', unnecessary_solver)
    result = optimize({'Purple': 20}, total_jelly=10**12)
    assert all(a.level == 'Max' for a in result.allocations)
    assert result.total_cost == 20 * sum(row[1] for row in TABLES['Purple'])
    assert result.jelly_leftover == 10**12 - result.total_cost


def test_zero_jelly_keeps_everyone_at_base_level():
    result = optimize({"Purple": 1}, total_jelly=0)
    assert result.total_leveling_cost == 0
    assert len(result.allocations) == 1
    assert result.allocations[0].level == 10
    assert result.allocations[0].raw_power == 9350


def test_not_enough_jelly_for_entry_cost_raises():
    # Purple/Gold have 0 entry cost, so this should never raise for them.
    result = optimize({"Purple": 1}, total_jelly=0)
    assert result is not None


def test_effectiveness_rate_is_applied():
    result = optimize({"RedR1": 1}, total_jelly=0)
    alloc = result.allocations[0]
    # base RedR1 level 10 raw power is 30260, effectiveness is 60%
    assert alloc.raw_power == 30260
    assert alloc.effective_power == 30260 * 0.60


def test_more_jelly_never_decreases_total_effective_power():
    small = optimize({"Purple": 2, "GoldR1": 1}, total_jelly=1000)
    big = optimize({"Purple": 2, "GoldR1": 1}, total_jelly=5000)
    assert big.total_effective_power >= small.total_effective_power


def test_unknown_catpal_type_raises_value_error():
    try:
        optimize({"NotAType": 1}, total_jelly=1000)
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_matches_known_scenario():
    # Regression check against a previously verified manual run.
    counts = {"Purple": 5, "GoldR1": 5, "GoldR2": 4, "RedR1": 1, "RedR2": 1}
    result = optimize(counts, total_jelly=60000)
    assert result.total_cost <= 60000
    assert result.total_effective_power == 540123.0
