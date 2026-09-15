"""Generate the oracle the TypeScript solver is tested against.

The Python core is the reference implementation: it is the one with the CLI,
the data loader and the schema checks. The browser solver must agree with it
exactly, so this writes a file of (input, expected output) cases produced BY
Python, and the Node test asserts TypeScript reproduces them.

Regenerate whenever the tables or the solver change:

    python scripts/generate_fixtures.py
"""
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'src'))

from forneus_core.tools.amigatos import solve            # noqa: E402
from forneus_core.tools.amigatos.data import (           # noqa: E402
    MAX_TEAM_SIZE, TABLES)

OUT = pathlib.Path(__file__).resolve().parents[1] / 'web' / 'test' / 'fixtures.json'
KEYS = list(TABLES)


def case(counts, total_jelly, note):
    """One case. Stores the totals and the rows, not the object graph."""
    result = solve(counts, total_jelly)
    return {
        'note': note,
        'input': {'counts': counts, 'total_jelly': total_jelly},
        'expected': {
            'totals': result.totals,
            'rows': [
                {'category': row['category'], 'level': row['level'], 'cost': row['cost'],
                 'effective_power': row['effective_power'], 'raw_power': row['raw_power']}
                for row in result.rows
            ],
            'notices': [notice.as_dict() for notice in result.notices],
        },
    }


def build():
    cases = [
        case({}, 70, 'empty team keeps all jelly'),
        case({'Purple': 1}, 0, 'zero budget stays at base level'),
        case({'Purple': 1}, 70, 'exactly one bracket'),
        case({'RedR2': 1}, 1, 'budget below the cheapest step'),
        case({'RedR2': 1, 'RedR1': 1, 'GoldR2': 4, 'GoldR1': 5, 'Purple': 5}, 43671,
             'the example team used across the site'),
        case({'Purple': MAX_TEAM_SIZE}, 5000, 'full team of the cheapest category'),
        case({'RedR2': MAX_TEAM_SIZE}, 100_000, 'full team of the priciest category'),
        case({'RedR2': MAX_TEAM_SIZE}, 9_007_199_254_740_991,
             'absurd budget must short-circuit, not overflow'),
    ]

    # Randomized cases catch the tie-breaks and off-by-ones that hand-picked
    # ones miss. The seed is fixed so a failure is reproducible.
    random.seed(20260915)
    for index in range(60):
        counts, total = {}, 0
        for key in KEYS:
            quantity = min(random.randint(0, 5), MAX_TEAM_SIZE - total)
            counts[key] = quantity
            total += quantity
        if total == 0:
            continue
        cases.append(case(counts, random.randint(0, 80_000), f'random #{index}'))

    return cases


if __name__ == '__main__':
    cases = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'generated_by': 'scripts/generate_fixtures.py',
                               'cases': cases}, ensure_ascii=False, indent=1) + '\n',
                   encoding='utf-8')
    print(f'{len(cases)} casos -> {OUT}')
