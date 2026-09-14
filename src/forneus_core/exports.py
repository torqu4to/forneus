"""Portable reports, generic over `ToolResult`. Pure serialization, no I/O.

These work for any registered tool: they read `totals`, `rows` and
`notices` from the contract and never import a tool module. A new tool gets
CSV and JSON export without writing a line of serialization code.
"""
import csv
import io
import json

from .contract import ToolResult
from .i18n import DEFAULT_LOCALE, translate, translate_notice

BOM = '﻿'


def report_document(result, locale=DEFAULT_LOCALE):
    """Plain-data snapshot with notices resolved into the viewer's language."""
    document = result.as_document()
    document['locale'] = locale
    document['messages'] = [translate_notice(notice, locale)
                            for notice in result.notices]
    unit_key = result.meta.get('cost_unit_key')
    if unit_key:
        document['meta']['cost_unit_label'] = translate(unit_key, locale=locale)
    return document


def _localize(value, locale):
    """Decimal commas for pt-BR spreadsheets; plain points everywhere else."""
    if isinstance(value, float) and locale == 'pt-BR':
        return str(value).replace('.', ',')
    if isinstance(value, (list, tuple)):
        return '/'.join(map(str, value))
    return value


def format_csv(result, locale=DEFAULT_LOCALE):
    """UTF-8 with BOM and semicolons - what Excel pt-BR opens cleanly.

    One `summary` row carries the totals and the caveats; each `row` line
    carries one entity. Totals stay off the entity rows so summing a column
    never multiplies the report totals by the team size.
    """
    document = report_document(result, locale)
    # Totals are prefixed: a tool may legitimately use the same key for a
    # per-row value and for its total (raw_power, effective_power), and two
    # identical column names would silently collapse into one.
    totals = {f'total_{key}': value for key, value in document['totals'].items()}
    row_columns = sorted({key for row in document['rows'] for key in row})
    columns = ['row_type', *row_columns, *totals, 'messages']

    output = io.StringIO(newline='')
    output.write(BOM)
    writer = csv.DictWriter(output, fieldnames=columns, delimiter=';',
                            extrasaction='ignore')
    writer.writeheader()

    summary = dict(totals)
    summary['row_type'] = 'summary'
    summary['messages'] = ' '.join(document['messages'])

    for row in [summary, *({'row_type': 'row', **row} for row in document['rows'])]:
        writer.writerow({key: _localize(value, locale)
                         for key, value in row.items()})
    return output.getvalue()


def format_json(result, locale=DEFAULT_LOCALE):
    """UTF-8 JSON text: numeric values, provenance and resolved messages."""
    return json.dumps(report_document(result, locale), ensure_ascii=False,
                      indent=2, allow_nan=False) + '\n'
