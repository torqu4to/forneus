/**
 * Game data for the browser solver.
 *
 * This imports the SAME JSON the Python core loads — there is one file of
 * numbers in the repository, not a copy per language. `astro.config.mjs`
 * allows Vite to read it from outside `web/`.
 *
 * If this import ever needs to become a copy, add a test that diffs the two
 * files. A silently divergent second copy of the tables is the worst failure
 * this project could have: both implementations would be internally
 * consistent and disagree about reality.
 */
import raw from '../../../../src/forneus_core/data/amigatos/tables.json' with { type: 'json' };

export type Level = number | 'Max';

export interface LevelRow {
  level: Level;
  bracket_cost: number;
  raw_power: number;
}

export interface Category {
  display_name: string;
  effectiveness_rate: number;
  tier: [number, number];
  levels: LevelRow[];
}

export interface Dataset {
  schema_version: number;
  tool: string;
  cost_unit: string;
  captured_at: string;
  display_order: string[];
  categories: Record<string, Category>;
}

export const dataset = raw as unknown as Dataset;

export const MAX_TEAM_SIZE = 18;
export const MAX_SAFE_BUDGET = Number.MAX_SAFE_INTEGER;

export const categoryKeys = Object.keys(dataset.categories);

/** Categories captured below their maximum tier — the UI must surface these. */
export const provisionalCategories = categoryKeys.filter((key) => {
  const [captured, max] = dataset.categories[key].tier;
  return captured !== max;
});
