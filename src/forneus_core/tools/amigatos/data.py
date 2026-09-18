"""Amigatos game data, loaded from `forneus_core/data/amigatos/tables.json`.

This module no longer holds any numbers. To record a rebalance, a new tier
or a recapture, edit the JSON file - the schema check in
`forneus_core.dataio` guards the shape, and nothing here changes.

Costs are Fish Jelly r1 units for every category, r2 included; see the
tool's usage guide for the in-game conversion. Silverleaf and Dried Fish
are still outside the model.

Each level row's cost is the cost OF THAT BRACKET (the marginal cost to
reach that level), not a cumulative total. The extra "Max" row is one more
step beyond the last numbered level.
"""
from ...dataio import load_dataset

DATASET = load_dataset('amigatos')
COST_UNIT = DATASET['cost_unit']
COST_UNIT_KEY = f'unit.{COST_UNIT}'

TABLES = {
    key: [(row['level'], row['bracket_cost'], row['raw_power'])
          for row in category['levels']]
    for key, category in DATASET['categories'].items()
}

EFFECTIVENESS_RATE = {key: category['effectiveness_rate']
                      for key, category in DATASET['categories'].items()}

DISPLAY_NAMES = {key: category['display_name']
                 for key, category in DATASET['categories'].items()}

DATA_TIER = {key: tuple(category['tier'])
             for key, category in DATASET['categories'].items()}

DISPLAY_ORDER = list(DATASET['display_order'])

MAX_TEAM_SIZE = 18
MAX_SAFE_INTEGER = 9_007_199_254_740_991
