import importlib.util
import json


def test_api_includes_downloads_for_exact_displayed_result():
    from forneus_core.web import create_app
    client = create_app().test_client()
    data = client.post('/api/optimize', json={
        'counts': {'Purple': 1}, 'total_jelly': 70,
    }).get_json()
    assert 'exports' in data
    exported = json.loads(data['exports']['json'])
    assert exported['rows'] == data['rows']
    assert exported['totals']['spent'] == data['totals']['spent'] == 70
    assert exported['totals']['effective_power'] == data['totals']['effective_power']
    assert data['exports']['csv'].startswith('\ufeffrow_type;')
    assert 'exports' not in exported
    html = client.get('/').get_data(as_text=True)
    assert 'id="export-csv"' in html and 'id="export-json"' in html


import pytest


def test_profile_optimizer_endpoint_and_profile_controls():
    from forneus_core.web import create_app
    client = create_app().test_client()
    profile = {'name': 'Main', 'catpals': [
        {'id': 'a', 'name': 'A', 'catpal_type': 'Purple', 'current_level': 100},
        {'id': 'b', 'name': 'B', 'catpal_type': 'Purple', 'current_level': 10},
    ]}
    response = client.post('/api/profile-optimize', json={
        'profile': profile, 'new_jelly': 0,
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['recommendation'] == 'redistribute'
    assert data['current']['invested_jelly'] == 3000
    assert data['redistribute']['jelly_leftover'] == 200

    invalid = client.post('/api/profile-optimize', json={
        'profile': {'name': '', 'catpals': []}, 'new_jelly': -1,
    })
    assert invalid.status_code == 400
    assert invalid.get_json()['error']

    html = client.get('/').get_data(as_text=True)
    for element_id in ('profile-select', 'profile-name', 'catpal-list',
                       'add-catpal', 'save-profile', 'delete-profile',
                       'backup-profiles', 'import-profiles', 'new-jelly',
                       'profile-calculate', 'comparison'):
        assert f'id="{element_id}"' in html


@pytest.mark.parametrize('payload', [
    None, [], {}, {'counts': [], 'total_jelly': 0},
    {'counts': {'Unknown': 1}, 'total_jelly': 0},
    *[{'counts': {'Purple': value}, 'total_jelly': 0}
      for value in (-1, 1.5, True, '1', None, 19)],
    *[{'counts': {'Purple': 1}, 'total_jelly': value}
      for value in (-1, 1.5, True, '100', None, 9007199254740992)],
    {'counts': {'Purple': 10, 'RedR1': 9}, 'total_jelly': 0},
])
def test_invalid_input_returns_readable_error(payload):
    from forneus_core.web import create_app
    response = create_app().test_client().post('/api/optimize', json=payload)
    assert response.status_code == 400
    assert response.get_json()['error']


@pytest.mark.parametrize('jelly', [100001, 1000000, 9007199254740991])
def test_large_jelly_and_eighteen_catpals(jelly):
    from forneus_core.web import create_app
    response = create_app().test_client().post('/api/optimize', json={
        'counts': {'Purple': 18}, 'total_jelly': jelly,
    })
    assert response.status_code == 200
    data = response.get_json()
    assert len(data['rows']) == 18
    assert data['totals']['spent'] <= jelly
    assert data['totals']['leftover'] == jelly - data['totals']['spent']


def test_empty_team_is_valid():
    from forneus_core.web import create_app
    response = create_app().test_client().post('/api/optimize', json={
        'counts': {}, 'total_jelly': 70,
    })
    assert response.status_code == 200
    assert response.get_json()['rows'] == []
    assert response.get_json()['totals']['leftover'] == 70



def test_calculation_matches_core():
    from forneus_core.web import create_app
    from forneus_core.tools.amigatos.optimizer import optimize
    counts = {'Purple': 2, 'RedR1': 1}
    expected = optimize(counts, 1000)
    response = create_app().test_client().post('/api/optimize', json={
        'counts': counts, 'total_jelly': 1000,
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['totals']['effective_power'] == expected.total_effective_power
    assert data['totals']['spent'] == expected.total_cost
    assert data['totals']['leftover'] == expected.jelly_leftover
    assert len(data['rows']) == 3



def test_home_has_accessible_form_and_data_warnings():
    assert importlib.util.find_spec('forneus_core.web') is not None
    from forneus_core.web import create_app
    response = create_app().test_client().get('/')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert 'lang="pt-BR"' in html
    assert 'name="Purple"' in html
    assert 'name="total_jelly"' in html
    assert '6/6' in html
    assert 'Silverleaf' in html and 'Dried Fish' in html


def test_errors_carry_a_translation_key_and_follow_accept_language():
    """The API must never hardcode one language in an error message."""
    from forneus_core.web import create_app
    client = create_app().test_client()
    payload = {'counts': {'Unknown': 1}, 'total_jelly': 0}

    portuguese = client.post('/api/optimize', json=payload).get_json()
    assert portuguese['error_key'] == 'error.category.unknown'
    assert portuguese['params'] == {'category': 'Unknown'}
    assert 'desconhecida' in portuguese['error']

    english = client.post('/api/optimize', json=payload,
                          headers={'Accept-Language': 'en-US,en;q=0.9'}).get_json()
    assert english['error_key'] == portuguese['error_key']
    assert english['error'] == 'Unknown catpal category.'


def test_tool_index_is_driven_by_the_registry():
    from forneus_core.web import create_app
    tools = create_app().test_client().get('/api/tools').get_json()['tools']
    by_name = {tool['name']: tool for tool in tools}
    assert by_name['amigatos']['status'] == 'available'
    assert by_name['fantasmas']['status'] == 'planned'
    assert by_name['florais']['status'] == 'planned'
    assert by_name['amigatos']['title'] == 'Otimizador de Amigatos'
