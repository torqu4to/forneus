"""Exports are generic over ToolResult - they must not know about amigatos."""
import csv
import io
import json

import pytest

from forneus_core.exports import format_csv, format_json
from forneus_core.tools.amigatos import solve


@pytest.mark.parametrize('counts,jelly', [
    ({'Purple': 2, 'RedR2': 1}, 1000000), ({}, 70), ({'Purple': 1}, 0)])
def test_csv_carries_one_summary_row_then_one_row_per_entity(counts, jelly):
    result = solve(counts, jelly)
    text = format_csv(result)
    assert text.startswith('﻿')

    rows = list(csv.DictReader(io.StringIO(text.lstrip('﻿')), delimiter=';'))
    summary, *entities = rows
    assert summary['row_type'] == 'summary'
    assert int(summary['total_budget']) == jelly
    assert int(summary['total_spent']) == result.totals['spent']
    assert int(summary['total_leftover']) == result.totals['leftover']
    assert (float(summary['total_effective_power'].replace(',', '.'))
            == result.totals['effective_power'])
    assert 'Silverleaf' in summary['messages'] and '4/6' in summary['messages']

    assert len(entities) == len(result.rows)
    for row, source in zip(entities, result.rows):
        assert row['row_type'] == 'row'
        assert row['level'] == str(source['level'])
        assert int(row['cost']) == source['cost']
        # Totals stay off entity rows so summing a column cannot double-count.
        assert row['total_spent'] == ''
        assert (float(row['effective_power'].replace(',', '.'))
                == source['effective_power'])
        assert row['tier'] == ('4/6' if source['category'] == 'RedR2' else '6/6')


def test_total_and_row_columns_with_the_same_name_do_not_collide():
    """`raw_power` is both a per-row value and a total; both must survive."""
    text = format_csv(solve({'Purple': 1}, 1000))
    header = text.lstrip('﻿').splitlines()[0].split(';')
    assert 'raw_power' in header and 'total_raw_power' in header
    assert len(header) == len(set(header))


def test_json_preserves_result_and_data_provenance():
    result = solve({'Purple': 1, 'RedR2': 1}, 1000000)
    document = json.loads(format_json(result))

    assert document['schema_version'] == 2
    assert document['tool'] == 'amigatos'
    assert document['totals'] == result.totals
    assert document['meta']['counts'] == {'Purple': 1, 'RedR2': 1}
    assert document['meta']['cost_unit'] == 'fish_jelly_r1'
    assert document['meta']['cost_unit_label'] == 'Fish Jelly r1'
    assert document['meta']['data_tiers']['RedR2'] == [4, 6]
    assert document['meta']['effectiveness_rates']['RedR2'] == 0.6
    assert all(row['level'] == 'Max' for row in document['rows'])
    assert document['rows'][0]['cost'] == result.rows[0]['cost']

    messages = ' '.join(document['messages'])
    assert 'Silverleaf' in messages and 'Dried Fish' in messages


def test_notices_travel_as_keys_and_resolve_per_locale():
    """No Portuguese prose inside the result - only keys the UI resolves."""
    result = solve({'RedR2': 1}, 1000)
    keys = [notice.key for notice in result.notices]
    assert 'notice.amigatos.currencies_excluded' in keys
    assert 'notice.amigatos.provisional_tier' in keys

    portuguese = json.loads(format_json(result, 'pt-BR'))['messages']
    english = json.loads(format_json(result, 'en-US'))['messages']
    assert any('não são considerados' in message for message in portuguese)
    assert any('are not modeled' in message for message in english)
    assert portuguese != english
