import raw from '../data/florais.json' with { type: 'json' };

export type Stat = 'Strength' | 'Agility' | 'Stamina' | 'Wisdom' | 'Morale';
export type Tier = 'R1' | 'R2';
export type ClassType = 'physical' | 'magic';
export interface Guardian { name: string; tier: Tier; spiritus1_physical: Stat; spiritus2_physical: Stat; spiritus1_magic: Stat; spiritus2_magic: Stat; primary_stat: string; secondary_stat: string }
export interface Placement { name: string; cultLv: number; starLevel: number }
export interface Spiritus { stat1: Stat; stat2: Stat | null; tier: Tier; level: number }
export interface Garden { version: 1; classType: ClassType; flowerguard: Record<string, Placement>; spiritus: Record<string, Spiritus> }
type Levels = Record<string, number>;
interface Dataset {
  provenance: { url: string; retrievedAt: string; sha256: string; note: string };
  flowerguards: Guardian[];
  spiritusValues: Record<Tier, Record<'Single' | 'Dual', Levels>>;
  thresholds: Record<Tier, Record<'Primary' | 'Secondary', Levels>>;
  gridAdjacency: Record<string, Record<string, string>>;
  directionUnlockLevel: Levels;
  flowerguardSlots: string[];
  gridLayout: { col: number; row: number; id: string; type: string }[];
  statBonusTables: Record<string, Partial<Record<Tier, Levels>>>;
  cultivationCaps: Record<Tier, Record<string, { primary: number; secondary: number }>>;
  cultivationCosts: Record<Tier, Record<string, { powder: number; oil: number }>>;
  icons: { flowerguards: Record<string, string>; spiritus: Record<string, string> };
}
// Absorption requirements verified from the in-game Mangosteen cards.
const mangosteen: Guardian = {
  name: 'Mangosteen', tier: 'R2',
  spiritus1_physical: 'Agility', spiritus2_physical: 'Stamina',
  spiritus1_magic: 'Wisdom', spiritus2_magic: 'Stamina',
  primary_stat: 'Haste', secondary_stat: 'PvP HP',
};
const snapshot = raw as Dataset;
export const data: Dataset = {
  ...snapshot,
  icons: { ...snapshot.icons, flowerguards: { Mangosteen: "/mangosteen.png", ...snapshot.icons.flowerguards } },
  flowerguards: snapshot.flowerguards.some(g => g.name === mangosteen.name)
    ? snapshot.flowerguards
    : [...snapshot.flowerguards, mangosteen],
};
export const allowedStats: Record<ClassType, Stat[]> = { physical: ['Strength', 'Agility', 'Stamina'], magic: ['Wisdom', 'Morale', 'Stamina'] };
export const starBonus = [[0, 0], [0, 0], [0, 1], [1, 1], [1, 1], [1, 2], [2, 2]];
export const emptyGarden = (): Garden => ({ version: 1, classType: 'magic', flowerguard: {}, spiritus: {} });
const integer = (n: unknown, min: number, max: number): n is number => Number.isInteger(n) && Number(n) >= min && Number(n) <= max;

/** Reject malformed storage/imports rather than silently returning misleading totals. */
export function parseGarden(value: unknown): Garden {
  if (!value || typeof value !== 'object') throw new Error('Invalid garden');
  const v = value as Garden;
  if (v.version !== 1 || !['physical', 'magic'].includes(v.classType)) throw new Error('Invalid version/class');
  const result = emptyGarden(); result.classType = v.classType;
  if (!v.flowerguard || !v.spiritus || typeof v.flowerguard !== 'object' || typeof v.spiritus !== 'object' || Array.isArray(v.flowerguard) || Array.isArray(v.spiritus)) throw new Error('Invalid cells');
  for (const [id, fg] of Object.entries(v.flowerguard)) {
    if (!data.flowerguardSlots.includes(id) || !fg || !data.flowerguards.some(f => f.name === fg.name) || !integer(fg.cultLv, 1, 13) || !integer(fg.starLevel, 1, 6)) throw new Error('Invalid guardian');
    result.flowerguard[id] = { name: fg.name, cultLv: fg.cultLv, starLevel: fg.starLevel };
  }
  for (const [id, sp] of Object.entries(v.spiritus)) {
    if (!data.gridLayout.some(c => c.id === id && c.type === 'spiritus') || !sp || !allowedStats[v.classType].includes(sp.stat1) || (sp.stat2 !== null && (!allowedStats[v.classType].includes(sp.stat2) || sp.stat2 === sp.stat1)) || !['R1', 'R2'].includes(sp.tier) || !integer(sp.level, 0, 9)) throw new Error('Invalid spiritus');
    result.spiritus[id] = { stat1: sp.stat1, stat2: sp.stat2, tier: sp.tier, level: sp.level };
  }
  return result;
}
export function switchClass(garden: Garden, next: ClassType): Garden {
  const result = structuredClone(garden);
  if (result.classType === next) return result;
  const from = allowedStats[result.classType], to = allowedStats[next];
  for (const sp of Object.values(result.spiritus)) {
    sp.stat1 = to[from.indexOf(sp.stat1)];
    sp.stat2 = sp.stat2 ? to[from.indexOf(sp.stat2)] : null;
  }
  result.classType = next;
  return result;
}
export function spiritusPoints(sp: Spiritus): number { return data.spiritusValues[sp.tier][sp.stat2 ? 'Dual' : 'Single'][sp.level]; }
export function cultivationCost(tier: Tier, level: number) {
  let powder = 0, oil = 0;
  for (let n = 1; n < level; n++) { const cost = data.cultivationCosts[tier][n]; powder += cost.powder; oil += cost.oil; }
  return { powder, oil };
}
function skill(tier: Tier, kind: 'Primary' | 'Secondary', name: string, points: number, cap: number, bonus: number) {
  let rawLevel = 0;
  for (const [level, threshold] of Object.entries(data.thresholds[tier][kind])) if (points >= threshold) rawLevel = Math.max(rawLevel, Number(level));
  const level = Math.min(rawLevel, cap), effective = level + bonus;
  const table = data.statBonusTables[name]?.[tier];
  const last = table ? Math.max(...Object.keys(table).map(Number)) : 0;
  // Match the source's last-known-value fallback, but explicitly expose it in the UI.
  const value = effective === 0 ? 0 : table?.[Math.min(effective, last)] ?? null;
  return { name, points, level, bonus, effective, capped: rawLevel > cap, value, tableLimited: !table || effective > last };
}
export function calculateSlot(garden: Garden, id: string) {
  const placed = garden.flowerguard[id];
  if (!placed) return null;
  const fg = data.flowerguards.find(f => f.name === placed.name)!;
  const primaryStat = garden.classType === 'magic' ? fg.spiritus1_magic : fg.spiritus1_physical;
  const secondaryStat = garden.classType === 'magic' ? fg.spiritus2_magic : fg.spiritus2_physical;
  const directions = Object.keys(data.directionUnlockLevel).filter(d => placed.cultLv >= data.directionUnlockLevel[d]);
  let primaryPoints = 0, secondaryPoints = 0;
  for (const direction of directions) {
    const sp = garden.spiritus[data.gridAdjacency[id][direction]];
    if (!sp) continue;
    const points = spiritusPoints(sp);
    if (sp.stat1 === primaryStat || sp.stat2 === primaryStat) primaryPoints += points;
    if (sp.stat1 === secondaryStat || sp.stat2 === secondaryStat) secondaryPoints += points;
  }
  const cap = data.cultivationCaps[fg.tier][placed.cultLv];
  const bonus = starBonus[placed.starLevel];
  return { id, fg, placed, directions, primaryStat, secondaryStat,
    primary: skill(fg.tier, 'Primary', fg.primary_stat, primaryPoints, cap.primary, bonus[0]),
    secondary: skill(fg.tier, 'Secondary', fg.secondary_stat, secondaryPoints, cap.secondary, bonus[1]),
    materials: cultivationCost(fg.tier, placed.cultLv) };
}
export function calculateGarden(garden: Garden) {
  const slots = data.flowerguardSlots.flatMap(id => { const r = calculateSlot(garden, id); return r ? [r] : []; });
  const totals: Record<string, number> = {};
  const costs = { R1: { powder: 0, oil: 0 }, R2: { powder: 0, oil: 0 } };
  for (const slot of slots) {
    for (const s of [slot.primary, slot.secondary]) if (s.value !== null) totals[s.name] = (totals[s.name] ?? 0) + s.value;
    costs[slot.fg.tier].powder += slot.materials.powder; costs[slot.fg.tier].oil += slot.materials.oil;
  }
  return { slots, totals, costs, limited: slots.some(s => s.primary.tableLimited || s.secondary.tableLimited) };
}
