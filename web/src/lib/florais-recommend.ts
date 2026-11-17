import { data, parseGarden, calculateGarden } from './florais.ts';
import type { Garden } from './florais.ts';

export function recommendGarden(input: Garden, target: string) {
  const garden = parseGarden(input);
  if (!data.flowerguards.some(f => f.primary_stat === target || f.secondary_stat === target)) throw new Error('Invalid target');
  function score(g: Garden) {
    const result = calculateGarden(g);
    const skills = result.slots.flatMap(s => [s.primary, s.secondary]).filter(s => s.name === target);
    if (skills.some(s => s.tableLimited)) return null;
    // Progress towards the next threshold breaks ties without claiming extra bonus.
    return [result.totals[target] ?? 0, skills.reduce((sum, s) => sum + (s.capped ? 0 : s.points), 0)] as const;
  }
  const baseline = score(garden);
  if (!baseline) throw new Error('Incomplete source data');
  let current = baseline;
  const groups = [
    ['flowerguard', data.flowerguardSlots],
    ['spiritus', data.gridLayout.filter(c => c.type === 'spiritus').map(c => c.id)],
  ] as const;
  function swap(kind: 'flowerguard' | 'spiritus', a: string, b: string) {
    const cells = garden[kind];
    const left = cells[a], right = cells[b];
    if (right) cells[a] = right as never; else delete cells[a];
    if (left) cells[b] = left as never; else delete cells[b];
  }
  let moves = 0;
  for (; moves < 24; moves++) {
    let best = current;
    let move: ['flowerguard' | 'spiritus', string, string] | null = null;
    for (const [kind, ids] of groups) {
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        if (!garden[kind][ids[a]] && !garden[kind][ids[b]]) continue;
        swap(kind, ids[a], ids[b]); const candidate = score(garden); swap(kind, ids[a], ids[b]);
        if (candidate && (candidate[0] > best[0] || (candidate[0] === best[0] && candidate[1] > best[1]))) {
          best = candidate; move = [kind, ids[a], ids[b]];
        }
      }
    }
    if (!move) break;
    swap(...move); current = best;
  }
  // Do not suggest reshuffling that only improved the internal tie-breaker.
  const improved = current[0] > baseline[0];
  return { garden: improved ? garden : parseGarden(input), target, before: baseline[0], after: improved ? current[0] : baseline[0], improved, moves };
}
