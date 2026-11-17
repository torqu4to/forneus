import snapshot from '../data/amigatos-progression.json' with { type: 'json' };

export type CostSystem = 'develop_cost' | 'awake_cost' | 'star_up_cost';
export interface CostRow {
  system: CostSystem;
  class: number;
  quality: number;
  step: number;
  role_level: number | null;
  frag_consume: number | null;
  materials: [number, number][];
}
export interface StarRow {
  cat_star_id: number;
  star: number;
  max_star: number;
  skill_level: number;
  core_score: number;
  help_score: number;
  attrs: [number, number][];
}
export interface SpiritRow {
  quality: number;
  level: number;
  player_level: number;
  exp: number;
  attrs: [number, number][];
}
export interface AtlasRow {
  level: number;
  exp: number;
  attribute_id: number;
  amount: number;
}

type PackedSnapshot = {
  snapshot_date: string;
  locale: string;
  config_sha256: string;
  patch_sha256: string;
  sources: Record<string, string>;
  items: Record<string, string>;
  attributes: Record<string, string>;
  cost_rows: [CostSystem, number, number, number, number | null, number | null, [number, number][]][];
  star_rows: [number, number, number, number, number, number, [number, number][]][];
  spirit_rows: [number, number, number, number, [number, number][]][];
  atlas_rows: [number, number, number, number][];
};
const packed = snapshot as unknown as PackedSnapshot;

export const progression = {
  snapshot_date: packed.snapshot_date,
  locale: packed.locale,
  config_sha256: packed.config_sha256,
  patch_sha256: packed.patch_sha256,
  sources: packed.sources,
  items: packed.items,
  attributes: packed.attributes,
  cost_rows: packed.cost_rows.map(([system, costClass, quality, step, role_level, frag_consume, materials]): CostRow => ({
    system, class: costClass, quality, step, role_level, frag_consume, materials,
  })),
  star_rows: packed.star_rows.map(([cat_star_id, star, max_star, skill_level, core_score, help_score, attrs]): StarRow => ({
    cat_star_id, star, max_star, skill_level, core_score, help_score, attrs,
  })),
  spirit_rows: packed.spirit_rows.map(([quality, level, player_level, exp, attrs]): SpiritRow => ({ quality, level, player_level, exp, attrs })),
  atlas_rows: packed.atlas_rows.map(([level, exp, attribute_id, amount]): AtlasRow => ({ level, exp, attribute_id, amount })),
};

export const costSystems: CostSystem[] = ['develop_cost', 'awake_cost', 'star_up_cost'];
export const qualities = [...new Set(progression.cost_rows.map((row) => row.quality))].sort((a, b) => a - b);
export const classes = [...new Set(progression.cost_rows.map((row) => row.class))].sort((a, b) => a - b);

export function costSteps(system: CostSystem, quality: number, costClass: number): number[] {
  return progression.cost_rows
    .filter((row) => row.system === system && row.quality === quality && row.class === costClass)
    .map((row) => row.step)
    .sort((a, b) => a - b);
}

export interface CostPlan {
  rows: CostRow[];
  materials: { item_id: number; name: string; amount: number }[];
  fragment_count: number;
  required_player_level: number | null;
}

/** Sum complete CTable cost rows; never convert between material tiers. */
export function planCosts(system: CostSystem, quality: number, costClass: number, firstStep: number, lastStep = firstStep): CostPlan {
  if (!costSystems.includes(system) || !Number.isInteger(quality) || !Number.isInteger(costClass)
    || !Number.isInteger(firstStep) || !Number.isInteger(lastStep) || firstStep > lastStep) {
    throw new RangeError('Invalid cost selection');
  }
  const rows = progression.cost_rows.filter((row) =>
    row.system === system && row.quality === quality && row.class === costClass
    && row.step >= firstStep && row.step <= lastStep);
  if (rows.length !== lastStep - firstStep + 1) throw new RangeError('Missing cost step');

  const totals = new Map<number, number>();
  for (const row of rows) {
    for (const [itemId, amount] of row.materials) {
      totals.set(itemId, (totals.get(itemId) ?? 0) + amount);
    }
  }
  return {
    rows,
    materials: [...totals].sort(([a], [b]) => a - b).map(([item_id, amount]) => ({
      item_id, name: progression.items[String(item_id)] ?? `Item ${item_id}`, amount,
    })),
    fragment_count: rows.reduce((sum, row) => sum + (row.frag_consume ?? 0), 0),
    required_player_level: rows.reduce<number | null>((max, row) =>
      row.role_level === null ? max : Math.max(max ?? 0, row.role_level), null),
  };
}

export function starBonus(catStarId: number, star: number): StarRow | undefined {
  return progression.star_rows.find((row) => row.cat_star_id === catStarId && row.star === star);
}

export function spiritLevel(quality: number, level: number): SpiritRow | undefined {
  return progression.spirit_rows.find((row) => row.quality === quality && row.level === level);
}

export function atlasLevel(level: number): { exp: number; attrs: [number, number][] } | undefined {
  const rows = progression.atlas_rows.filter((row) => row.level === level);
  if (rows.length === 0) return undefined;
  return { exp: rows[0].exp, attrs: rows.map((row) => [row.attribute_id, row.amount]) };
}

export function attributeName(id: number): string {
  return progression.attributes[String(id)] ?? `Atributo ${id}`;
}
