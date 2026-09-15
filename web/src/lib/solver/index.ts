/**
 * The amigatos tool, running in the browser.
 *
 * Returns exactly the document the API used to return — same shape, same
 * field names, same `schema_version` — so the page, the exporters and the
 * types did not change when the server went away.
 */
import { ToolError } from './errors.ts';
import {
  dataset, MAX_SAFE_BUDGET, MAX_TEAM_SIZE, provisionalCategories,
  type Level,
} from './dataset.ts';
import { cumulativeOptions, solveKnapsack, type Item, type Option } from './knapsack.ts';

export { ToolError, MAX_TEAM_SIZE };

export interface ResultRow {
  category: string;
  display_name: string;
  level: Level;
  cost: number;
  raw_power: number;
  effective_power: number;
  tier: [number, number];
  effectiveness_rate: number;
}

export interface Notice {
  key: string;
  params: Record<string, string | number>;
  level: 'info' | 'warning' | 'error';
}

export interface ToolResultDocument {
  schema_version: number;
  tool: string;
  totals: {
    budget: number; entry_cost: number; leveling_cost: number;
    spent: number; leftover: number; raw_power: number; effective_power: number;
  };
  rows: ResultRow[];
  notices: Notice[];
  meta: {
    cost_unit: string;
    cost_unit_key: string;
    counts: Record<string, number>;
    display_order: string[];
    data_tiers: Record<string, [number, number]>;
    effectiveness_rates: Record<string, number>;
    max_team_size: number;
  };
}

/** Caveats that apply to every result, as keys the UI resolves. */
export function dataNotices(): Notice[] {
  const notices: Notice[] = [
    { key: 'notice.amigatos.currencies_excluded', params: {}, level: 'warning' },
  ];
  for (const key of provisionalCategories) {
    const category = dataset.categories[key];
    notices.push({
      key: 'notice.amigatos.provisional_tier',
      params: {
        display_name: category.display_name,
        captured: category.tier[0],
        max: category.tier[1],
      },
      level: 'warning',
    });
  }
  return notices;
}

function validate(counts: Record<string, number>, totalJelly: number) {
  if (counts === null || typeof counts !== 'object') {
    throw new ToolError('error.counts.missing');
  }
  let team = 0;
  for (const [key, quantity] of Object.entries(counts)) {
    if (!(key in dataset.categories)) {
      throw new ToolError('error.category.unknown', { category: key });
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_TEAM_SIZE) {
      throw new ToolError('error.counts.range', { max: MAX_TEAM_SIZE });
    }
    team += quantity;
  }
  if (team > MAX_TEAM_SIZE) {
    throw new ToolError('error.team.too_large', { max: MAX_TEAM_SIZE });
  }
  if (!Number.isInteger(totalJelly) || totalJelly < 0 || totalJelly > MAX_SAFE_BUDGET) {
    throw new ToolError('error.jelly.range', { max: MAX_SAFE_BUDGET });
  }
}

export function solve(
  counts: Record<string, number>,
  totalJelly: number,
): ToolResultDocument {
  validate(counts, totalJelly);

  const items: Item[] = [];
  let entryCost = 0;

  // Iterate the dataset's own key order, not the caller's, so the row order
  // is deterministic no matter how the form serialized the counts.
  for (const key of Object.keys(dataset.categories)) {
    const quantity = counts[key] ?? 0;
    if (quantity <= 0) continue;
    const category = dataset.categories[key];
    const { options, entryCost: entry } = cumulativeOptions(
      category.levels, category.effectiveness_rate);
    entryCost += quantity * entry;
    for (let index = 0; index < quantity; index++) {
      items.push({ category: key, options });
    }
  }

  const levelingBudget = totalJelly - entryCost;
  if (levelingBudget < 0) {
    throw new ToolError('error.jelly.insufficient',
      { available: totalJelly, required: entryCost });
  }

  let chosen: Option[];
  if (items.length === 0) {
    chosen = [];
  } else {
    // Once every item's best option is affordable, more budget cannot help —
    // and skipping the DP is what keeps an absurd budget instant instead of
    // allocating arrays proportional to it.
    const best = items.map(({ options }) =>
      options.reduce((a, b) => (b[1] > a[1] || (b[1] === a[1] && b[0] < a[0]) ? b : a)));
    chosen = best.reduce((sum, option) => sum + option[0], 0) <= levelingBudget
      ? best
      : solveKnapsack(items, levelingBudget);
  }

  const rows: ResultRow[] = items.map((item, index) => {
    const [cost, effective, raw, level] = chosen[index];
    const category = dataset.categories[item.category];
    return {
      category: item.category,
      display_name: category.display_name,
      level, cost, raw_power: raw, effective_power: effective,
      tier: category.tier,
      effectiveness_rate: category.effectiveness_rate,
    };
  });

  const levelingCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const spent = entryCost + levelingCost;

  const usedCounts: Record<string, number> = {};
  for (const row of rows) usedCounts[row.category] = (usedCounts[row.category] ?? 0) + 1;

  const tiers: Record<string, [number, number]> = {};
  const rates: Record<string, number> = {};
  for (const [key, category] of Object.entries(dataset.categories)) {
    tiers[key] = category.tier;
    rates[key] = category.effectiveness_rate;
  }

  return {
    schema_version: 2,
    tool: 'amigatos',
    totals: {
      budget: totalJelly,
      entry_cost: entryCost,
      leveling_cost: levelingCost,
      spent,
      leftover: totalJelly - spent,
      raw_power: rows.reduce((sum, row) => sum + row.raw_power, 0),
      effective_power: rows.reduce((sum, row) => sum + row.effective_power, 0),
    },
    rows,
    notices: dataNotices(),
    meta: {
      cost_unit: dataset.cost_unit,
      cost_unit_key: `unit.${dataset.cost_unit}`,
      counts: usedCounts,
      display_order: dataset.display_order,
      data_tiers: tiers,
      effectiveness_rates: rates,
      max_team_size: MAX_TEAM_SIZE,
    },
  };
}
