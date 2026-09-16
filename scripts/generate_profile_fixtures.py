"""Fixtures for the profile comparator (manter vs redistribuir)."""
import json, pathlib, random, sys
sys.path.insert(0, '/home/claude/verify/src')
from forneus_core.tools.amigatos.profiles import optimize_profile
from forneus_core.tools.amigatos.data import TABLES, MAX_TEAM_SIZE

KEYS = list(TABLES)
LEVELS = {k: [r[0] for r in t] for k, t in TABLES.items()}

def case(profile, new_jelly, note):
    out = optimize_profile(profile, new_jelly)
    slim = lambda scenario: {
        'available_jelly': scenario['available_jelly'],
        'additional_jelly_spent': scenario['additional_jelly_spent'],
        'jelly_leftover': scenario['jelly_leftover'],
        'total_effective_power': scenario['total_effective_power'],
        'allocations': [{'id': a['id'], 'catpal_type': a['catpal_type'],
                         'current_level': a['current_level'], 'target_level': a['target_level'],
                         'jelly_change': a['jelly_change'],
                         'effective_power': a['effective_power']} for a in scenario['allocations']],
        'changes': [a['id'] for a in scenario['changes']],
    }
    return {'note': note, 'input': {'profile': profile, 'new_jelly': new_jelly},
            'expected': {'recommendation': out['recommendation'],
                         'current': {'invested_jelly': out['current']['invested_jelly'],
                                     'total_effective_power': out['current']['total_effective_power']},
                         'keep': slim(out['keep']),
                         'redistribute': slim(out['redistribute'])}}

cases = [
    case({'name': 'vazio', 'catpals': []}, 1000, 'perfil vazio'),
    case({'name': 'um', 'catpals': [{'id': 'a', 'name': 'A', 'catpal_type': 'Purple',
                                     'current_level': 10}]}, 0, 'um amigato, zero jelly nova'),
    case({'name': 'desbalanceado', 'catpals': [
        {'id': 'a', 'name': 'A', 'catpal_type': 'Purple', 'current_level': 140},
        {'id': 'b', 'name': 'B', 'catpal_type': 'RedR2', 'current_level': 10}]}, 0,
        'redistribuir deveria valer a pena'),
]
random.seed(20260916)
for i in range(40):
    n = random.randint(1, 8)
    catpals = []
    for j in range(n):
        k = random.choice(KEYS)
        catpals.append({'id': f'c{j}', 'name': f'Cat {j}', 'catpal_type': k,
                        'current_level': random.choice(LEVELS[k])})
    cases.append(case({'name': f'r{i}', 'catpals': catpals},
                      random.randint(0, 30000), f'aleatorio #{i}'))

out = pathlib.Path('/home/claude/fase2b/web/test/profile-fixtures.json')
out.write_text(json.dumps({'generated_by': 'scripts/generate_profile_fixtures.py',
                           'cases': cases}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(cases), 'casos ->', out)
print('recomendações:', {c['expected']['recommendation'] for c in cases})
