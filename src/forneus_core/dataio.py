"""Loading and structural validation of the JSON game-data files.

Game data lives in `forneus_core/data/<tool>/*.json`, never in Python source.
A rebalance, a new tier or a new tool is a data edit plus a schema check -
no code change. `validate_dataset` implements the subset of
`data/_schema/tool_tables.schema.json` that matters at runtime, so the
package stays dependency-free; CI validates against the full schema.
"""
from functools import lru_cache
import json
from pathlib import Path

DATA_ROOT = Path(__file__).resolve().parent / 'data'
SCHEMA_PATH = DATA_ROOT / '_schema' / 'tool_tables.schema.json'
SUPPORTED_SCHEMA_VERSION = 1


class DataError(ValueError):
    """The dataset on disk is missing, malformed or of an unsupported version."""


def _require(condition, message):
    if not condition:
        raise DataError(message)


def validate_dataset(document, source='<memory>'):
    """Check the invariants the solvers rely on. Returns the document."""
    _require(isinstance(document, dict), f'{source}: dataset must be an object.')
    _require(document.get('schema_version') == SUPPORTED_SCHEMA_VERSION,
             f'{source}: unsupported schema_version '
             f'{document.get("schema_version")!r}; expected {SUPPORTED_SCHEMA_VERSION}.')
    for field in ('tool', 'cost_unit', 'captured_at'):
        _require(isinstance(document.get(field), str) and document[field],
                 f'{source}: missing or empty {field!r}.')

    categories = document.get('categories')
    _require(isinstance(categories, dict) and categories,
             f'{source}: categories must be a nonempty object.')

    order = document.get('display_order')
    _require(isinstance(order, list) and order,
             f'{source}: display_order must be a nonempty list.')
    _require(set(order) == set(categories),
             f'{source}: display_order must list exactly the categories once each.')
    _require(len(order) == len(set(order)), f'{source}: display_order has duplicates.')

    for key, category in categories.items():
        where = f'{source}: category {key!r}'
        _require(isinstance(category, dict), f'{where} must be an object.')
        _require(isinstance(category.get('display_name'), str) and category['display_name'],
                 f'{where} needs a display_name.')

        rate = category.get('effectiveness_rate')
        _require(isinstance(rate, (int, float)) and not isinstance(rate, bool)
                 and 0 < rate <= 1, f'{where}: effectiveness_rate must be in (0, 1].')

        tier = category.get('tier')
        _require(isinstance(tier, list) and len(tier) == 2
                 and all(isinstance(value, int) and not isinstance(value, bool)
                         and value >= 1 for value in tier),
                 f'{where}: tier must be [captured, max] positive integers.')
        _require(tier[0] <= tier[1], f'{where}: captured tier exceeds the maximum tier.')

        levels = category.get('levels')
        _require(isinstance(levels, list) and levels, f'{where}: levels must be nonempty.')
        seen = set()
        for index, row in enumerate(levels):
            at = f'{where} level #{index}'
            _require(isinstance(row, dict), f'{at} must be an object.')
            level = row.get('level')
            _require(isinstance(level, (int, str)) and not isinstance(level, bool),
                     f'{at}: level must be an integer or a string.')
            _require(level not in seen, f'{at}: duplicated level {level!r}.')
            seen.add(level)
            cost = row.get('bracket_cost')
            _require(isinstance(cost, int) and not isinstance(cost, bool) and cost >= 0,
                     f'{at}: bracket_cost must be a nonnegative integer.')
            power = row.get('raw_power')
            _require(isinstance(power, (int, float)) and not isinstance(power, bool)
                     and power >= 0, f'{at}: raw_power must be a nonnegative number.')
        _require(levels[0]['bracket_cost'] >= 0,
                 f'{where}: the first row carries the entry cost.')
    return document


@lru_cache(maxsize=None)
def load_dataset(tool, name='tables'):
    """Read, validate and cache `data/<tool>/<name>.json`."""
    path = DATA_ROOT / tool / f'{name}.json'
    try:
        raw = path.read_text(encoding='utf-8')
    except FileNotFoundError:
        raise DataError(f'Missing dataset for tool {tool!r} at {path}.') from None
    try:
        document = json.loads(raw)
    except json.JSONDecodeError as error:
        raise DataError(f'{path}: invalid JSON ({error}).') from None
    return validate_dataset(document, source=str(path))


def provisional_categories(document):
    """Category keys whose data was captured below the maximum tier."""
    return [key for key, category in document['categories'].items()
            if category['tier'][0] != category['tier'][1]]
