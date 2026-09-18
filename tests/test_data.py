"""Game data lives in JSON and is validated - not hardcoded in Python."""
import copy
import json

import pytest

from forneus_core.dataio import (DATA_ROOT, SCHEMA_PATH, DataError,
                                 load_dataset, provisional_categories,
                                 validate_dataset)


def test_amigatos_dataset_loads_at_maximum_tier():
    dataset = load_dataset('amigatos')
    assert dataset['cost_unit'] == 'fish_jelly_r1'
    assert set(dataset['categories']) == {'Purple', 'GoldR1', 'GoldR2',
                                          'RedR1', 'RedR2'}
    assert all(category['tier'] == [6, 6]
               for category in dataset['categories'].values())


def test_python_data_module_holds_no_numbers_of_its_own():
    """A rebalance must be a JSON edit, never a code edit."""
    source = (DATA_ROOT.parent / 'tools' / 'amigatos' / 'data.py').read_text('utf-8')
    body = '\n'.join(line for line in source.splitlines()
                     if not line.strip().startswith('#'))
    assert '9350' not in body and '370020' not in body


def test_dataset_matches_the_published_schema():
    jsonschema = pytest.importorskip('jsonschema')
    schema = json.loads(SCHEMA_PATH.read_text('utf-8'))
    jsonschema.validate(load_dataset('amigatos'), schema)


@pytest.mark.parametrize('mutate,fragment', [
    (lambda d: d.update(schema_version=99), 'schema_version'),
    (lambda d: d['categories']['Purple'].update(effectiveness_rate=0), 'effectiveness_rate'),
    (lambda d: d['categories']['Purple'].update(tier=[7, 6]), 'exceeds'),
    (lambda d: d['categories']['Purple']['levels'].append(
        {'level': 10, 'bracket_cost': 1, 'raw_power': 1}), 'duplicated'),
    (lambda d: d['categories']['Purple']['levels'].append(
        {'level': 999, 'bracket_cost': -5, 'raw_power': 1}), 'bracket_cost'),
    (lambda d: d.update(display_order=['Purple']), 'display_order'),
])
def test_malformed_datasets_are_rejected_with_a_pointed_message(mutate, fragment):
    document = copy.deepcopy(load_dataset('amigatos'))
    mutate(document)
    with pytest.raises(DataError) as error:
        validate_dataset(document, source='test')
    assert fragment in str(error.value)


def test_missing_dataset_names_the_tool():
    with pytest.raises(DataError) as error:
        load_dataset('fantasmas')
    assert 'fantasmas' in str(error.value)
