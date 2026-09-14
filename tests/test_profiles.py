import pytest

from forneus_core.tools.amigatos.profiles import optimize_profile


def test_profile_compares_keep_and_full_refund_redistribution():
    profile = {
        'name': 'Equipe principal',
        'catpals': [
            {'id': 'cat-1', 'name': 'A', 'catpal_type': 'Purple', 'current_level': 100},
            {'id': 'cat-2', 'name': 'B', 'catpal_type': 'Purple', 'current_level': 10},
        ],
    }

    result = optimize_profile(profile, new_jelly=0)

    assert result['current']['invested_jelly'] == 3000
    assert result['keep']['total_effective_power'] == 54250 * 0.30
    assert result['keep']['additional_jelly_spent'] == 0
    assert result['redistribute']['available_jelly'] == 3000
    assert result['redistribute']['total_effective_power'] == 57720 * 0.30
    assert result['redistribute']['jelly_leftover'] == 200
    assert result['recommendation'] == 'redistribute'
    assert [(change['name'], change['from_level'], change['to_level'])
            for change in result['redistribute']['changes']] == [
                ('B', 10, 60), ('A', 100, 80),
            ]


def test_keep_scenario_never_reduces_current_levels():
    profile = {
        'name': 'Sem reset',
        'catpals': [
            {'id': 'one', 'name': '', 'catpal_type': 'Purple', 'current_level': 100},
            {'id': 'two', 'name': '', 'catpal_type': 'Purple', 'current_level': 10},
        ],
    }
    result = optimize_profile(profile, new_jelly=70)
    levels = {item['id']: item for item in result['keep']['allocations']}
    assert levels['one']['target_level'] >= 100 or levels['one']['target_level'] == 'Max'
    assert levels['two']['target_level'] >= 10 or levels['two']['target_level'] == 'Max'
    assert result['keep']['additional_jelly_spent'] <= 70


@pytest.mark.parametrize('profile,new_jelly', [
    ({'name': '', 'catpals': []}, -1),
    ({'name': '', 'catpals': [{'id': 'x', 'catpal_type': 'Unknown', 'current_level': 10}]}, 0),
    ({'name': '', 'catpals': [{'id': 'x', 'catpal_type': 'Purple', 'current_level': 15}]}, 0),
    ({'name': '', 'catpals': [
        {'id': str(i), 'catpal_type': 'Purple', 'current_level': 10} for i in range(19)
    ]}, 0),
    ({'name': '', 'catpals': [
        {'id': 'same', 'catpal_type': 'Purple', 'current_level': 10},
        {'id': 'same', 'catpal_type': 'Purple', 'current_level': 10},
    ]}, 0),
])
def test_invalid_profile_is_rejected(profile, new_jelly):
    with pytest.raises(ValueError):
        optimize_profile(profile, new_jelly)
