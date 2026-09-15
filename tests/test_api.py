"""HTTP behavior. Requires FastAPI; skipped where it is not installed."""
import json

import pytest

fastapi = pytest.importorskip('fastapi')
from fastapi.testclient import TestClient  # noqa: E402

from forneus_core.api import create_app  # noqa: E402
from forneus_core.api.ratelimit import RateLimiter  # noqa: E402


@pytest.fixture
def client():
    # A generous bucket so ordinary tests are never rate limited.
    return TestClient(create_app(RateLimiter(rate=1000, burst=1000)))


def test_health_lists_registered_tools(client):
    body = client.get('/api/health').json()
    assert body['status'] == 'ok'
    assert set(body['tools']) == {'amigatos', 'fantasmas', 'florais'}


def test_tools_are_localized_by_accept_language(client):
    portuguese = client.get('/api/tools').json()
    english = client.get('/api/tools', headers={'Accept-Language': 'en-US'}).json()
    assert portuguese['locale'] == 'pt-BR' and english['locale'] == 'en-US'

    by_name = {tool['name']: tool for tool in portuguese['tools']}
    assert by_name['amigatos']['status'] == 'available'
    assert by_name['fantasmas']['status'] == 'planned'
    assert by_name['amigatos']['title'] != \
           {tool['name']: tool for tool in english['tools']}['amigatos']['title']


def test_solve_matches_the_core(client):
    from forneus_core.tools.amigatos import solve
    counts = {'Purple': 2, 'RedR1': 1}
    expected = solve(counts, 1000)

    body = client.post('/api/tools/amigatos/solve',
                       json={'counts': counts, 'total_jelly': 1000}).json()
    assert body['totals'] == expected.totals
    assert len(body['rows']) == len(expected.rows)
    assert body['schema_version'] == 2


def test_solve_carries_exports_for_the_exact_result(client):
    body = client.post('/api/tools/amigatos/solve',
                       json={'counts': {'Purple': 1}, 'total_jelly': 70}).json()
    exported = json.loads(body['exports']['json'])
    assert exported['rows'] == body['rows']
    assert exported['totals'] == body['totals']
    assert body['exports']['csv'].startswith('﻿row_type;')
    assert 'exports' not in exported


def test_notices_are_keys_and_resolved_text(client):
    body = client.post('/api/tools/amigatos/solve',
                       json={'counts': {'RedR2': 1}, 'total_jelly': 1000},
                       headers={'Accept-Language': 'en-US'}).json()
    keys = [notice['key'] for notice in body['notices']]
    assert 'notice.amigatos.provisional_tier' in keys
    assert any('tier 4/6' in message for message in body['messages'])


@pytest.mark.parametrize('payload,expected_key', [
    ({'counts': {'Nope': 1}, 'total_jelly': 0}, 'error.category.unknown'),
    ({'counts': {'Purple': 19}, 'total_jelly': 0}, 'error.counts.range'),
    ({'counts': {'Purple': 10, 'RedR1': 9}, 'total_jelly': 0}, 'error.team.too_large'),
])
def test_tool_errors_carry_a_key_and_text(client, payload, expected_key):
    response = client.post('/api/tools/amigatos/solve', json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body['error_key'] == expected_key
    assert body['error'] and body['error'] != expected_key


@pytest.mark.parametrize('payload', [
    {'counts': {}, 'total_jelly': -1},
    {'counts': {}, 'total_jelly': 'muita'},
    {'counts': {}, 'total_jelly': 1, 'extra': 'x'},
    {'total_jelly': 1, 'counts': {'Purple': 1.5}},
])
def test_malformed_bodies_are_rejected_before_the_solver(client, payload):
    assert client.post('/api/tools/amigatos/solve', json=payload).status_code == 422


def test_empty_team_is_valid():
    client = TestClient(create_app(RateLimiter(rate=1000, burst=1000)))
    body = client.post('/api/tools/amigatos/solve',
                       json={'counts': {}, 'total_jelly': 70}).json()
    assert body['rows'] == [] and body['totals']['leftover'] == 70


def test_rate_limit_refuses_and_says_when_to_retry():
    client = TestClient(create_app(RateLimiter(rate=0.5, burst=2)))
    body = {'counts': {'Purple': 1}, 'total_jelly': 70}
    assert client.post('/api/tools/amigatos/solve', json=body).status_code == 200
    assert client.post('/api/tools/amigatos/solve', json=body).status_code == 200

    refused = client.post('/api/tools/amigatos/solve', json=body)
    assert refused.status_code == 429
    assert int(refused.headers['Retry-After']) >= 1
    assert refused.json()['error_key'] == 'error.rate_limited'


def test_reads_are_not_rate_limited():
    """A throttled client must still be able to load the tool list."""
    client = TestClient(create_app(RateLimiter(rate=0.01, burst=1)))
    client.post('/api/tools/amigatos/solve',
                json={'counts': {'Purple': 1}, 'total_jelly': 70})
    for _ in range(5):
        assert client.get('/api/tools').status_code == 200


def test_cors_allows_the_site_and_refuses_others():
    client = TestClient(create_app(RateLimiter(rate=1000, burst=1000)))
    allowed = client.get('/api/tools', headers={'Origin': 'https://forneus.wiki'})
    assert allowed.headers.get('access-control-allow-origin') == 'https://forneus.wiki'

    other = client.get('/api/tools', headers={'Origin': 'https://evil.example'})
    assert 'access-control-allow-origin' not in other.headers
