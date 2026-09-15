/**
 * CSV and JSON export, ported from `forneus_core.exports`.
 *
 * Generic over the result document, exactly like the Python version: it reads
 * `totals`, `rows` and `notices` and knows nothing about amigatos. A second
 * tool gets both formats for free.
 *
 * The CSV is what Excel pt-BR opens cleanly: UTF-8 with a BOM, semicolons,
 * and decimal commas. Total columns carry a `total_` prefix because a tool may
 * legitimately use one name for both a per-row value and its total —
 * `raw_power` does — and two identical column headers silently collapse.
 */
import type { ToolResultDocument } from './solver/index.ts';

const BOM = '﻿';

export interface ReportOptions {
  locale: string;
  /** Resolves a notice key into text. Injected so this file stays free of i18n. */
  translate: (key: string, params?: Record<string, string | number>) => string;
}

export function reportDocument(result: ToolResultDocument, options: ReportOptions) {
  return {
    ...result,
    locale: options.locale,
    messages: result.notices.map((notice) => options.translate(notice.key, notice.params)),
    meta: {
      ...result.meta,
      cost_unit_label: options.translate(result.meta.cost_unit_key),
    },
  };
}

function csvCell(value: unknown, locale: string): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join('/');
  if (typeof value === 'number' && !Number.isInteger(value) && locale.startsWith('pt')) {
    return String(value).replace('.', ',');
  }
  return String(value);
}

function csvEscape(cell: string): string {
  return /[";\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function formatCsv(result: ToolResultDocument, options: ReportOptions): string {
  const document = reportDocument(result, options);

  const totals = Object.fromEntries(
    Object.entries(document.totals).map(([key, value]) => [`total_${key}`, value]));
  const rowColumns = [...new Set(document.rows.flatMap((row) => Object.keys(row)))].sort();
  const columns = ['row_type', ...rowColumns, ...Object.keys(totals), 'messages'];

  const lines = [columns.join(';')];

  const summary: Record<string, unknown> = { row_type: 'summary', ...totals };
  summary.messages = document.messages.join(' ');
  lines.push(columns.map((key) =>
    csvEscape(csvCell(summary[key], options.locale))).join(';'));

  for (const row of document.rows) {
    const line: Record<string, unknown> = { row_type: 'row', ...row };
    lines.push(columns.map((key) =>
      csvEscape(csvCell(line[key], options.locale))).join(';'));
  }

  return BOM + lines.join('\r\n') + '\r\n';
}

export function formatJson(result: ToolResultDocument, options: ReportOptions): string {
  return JSON.stringify(reportDocument(result, options), null, 2) + '\n';
}
