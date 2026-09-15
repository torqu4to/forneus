/**
 * Turning solver rows into table rows.
 *
 * The solver emits ONE row per catpal — sixteen rows for a sixteen-catpal
 * team, five of them identical. That is correct output (each catpal is its
 * own decision) but unreadable. Grouping happens here, at the view boundary,
 * so the contract stays honest and the page stays legible.
 *
 * Grouping is by (category, level, cost): two catpals collapse only when the
 * solver reached the SAME decision for both. The moment the optimizer splits
 * a category across levels, the group splits with it and the user sees that.
 */
import type { ResultRow } from './solver/index.ts';

export interface GroupedRow extends ResultRow {
  /** How many identical allocations this row stands for. */
  count: number;
  /** The originals, for an expanded view. */
  members: ResultRow[];
}

/**
 * Group identical allocations and order them the way the dataset asks.
 *
 * `displayOrder` comes from the data file (`meta.display_order`), which lists
 * categories strongest first. The solver emits rows in its own internal table
 * order instead, so without this the table opens with the weakest catpals —
 * the opposite of what the data declares and of what the design showed.
 * Ordering is a view concern, so it lives here rather than in the solver.
 */
export function groupRows(rows: ResultRow[], displayOrder?: string[]): GroupedRow[] {
  const groups = new Map<string, GroupedRow>();
  for (const row of rows) {
    const key = `${row.category}|${row.level}|${row.cost}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.members.push(row);
    } else {
      groups.set(key, { ...row, count: 1, members: [row] });
    }
  }
  const grouped = [...groups.values()];
  if (!displayOrder?.length) return grouped;

  const rank = new Map(displayOrder.map((key, index) => [key, index]));
  const last = displayOrder.length;
  // A stable sort keeps the solver's within-category order (highest level
  // first), so only the categories move.
  return grouped.sort(
    (a, b) => (rank.get(a.category) ?? last) - (rank.get(b.category) ?? last),
  );
}

/** True when a category's data was captured below its maximum tier. */
export function isProvisional(row: { tier: [number, number] }): boolean {
  return row.tier[0] !== row.tier[1];
}

/** Token class for a category name. */
export function categoryClass(category: string): string {
  if (category.startsWith('Red')) return 'fx-cat--red';
  if (category.startsWith('Gold')) return 'fx-cat--gold';
  return 'fx-cat--purple';
}
