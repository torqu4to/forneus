import { data, allowedStats, emptyGarden, parseGarden, calculateGarden, calculateSlot, starBonus } from './florais.ts';
import type { Garden, Placement, Spiritus, ClassType, Tier } from './florais.ts';

export interface Stock { version: 1; classType: ClassType; guardians: Placement[]; spiritus: (Spiritus & { quantity: number })[] }
export interface Limits { cultivation: number; stars: number; level: number; tier: Tier; guardians: number; spiritus: number }
export const spiritKey = (s: Spiritus) => `${s.tier}|${s.level}|${[s.stat1, s.stat2].filter(Boolean).sort().join('+')}`;
export const spiritFamily = (s: Spiritus) => `${s.tier}|${[s.stat1, s.stat2].filter(Boolean).sort().join('+')}`;
const int = (x: unknown, min: number, max: number) => Number.isInteger(x) && Number(x) >= min && Number(x) <= max;
export function parseStock(value: unknown): Stock {
  const v = value as Stock;
  if (!v || v.version !== 1 || !['magic', 'physical'].includes(v.classType) || !Array.isArray(v.guardians) || v.guardians.length > 15 || !Array.isArray(v.spiritus) || v.spiritus.length > 120) throw new Error('Invalid stock');
  const names = new Set<string>(), keys = new Set<string>();
  const guardians = v.guardians.map(p => {
    const garden = { ...emptyGarden(), classType: v.classType, flowerguard: { Top: p } };
    const valid = parseGarden(garden).flowerguard.Top;
    if (names.has(valid.name)) throw new Error('Duplicate guardian');
    names.add(valid.name); return valid;
  });
  const spiritus = v.spiritus.map(s => {
    const garden = { ...emptyGarden(), classType: v.classType, spiritus: { S01: s } };
    const valid = parseGarden(garden).spiritus.S01;
    if (!int(s.quantity, 1, 52) || keys.has(spiritKey(valid))) throw new Error('Invalid quantity/duplicate Spiritus');
    keys.add(spiritKey(valid)); return { ...valid, quantity: s.quantity };
  });
  return { version: 1, classType: v.classType, guardians, spiritus };
}
export function parseLimits(value: unknown): Limits {
  const v = value as Limits;
  if (!v || !int(v.cultivation, 1, 13) || !int(v.stars, 1, 6) || !int(v.level, 0, 9) || !['R1', 'R2'].includes(v.tier) || !int(v.guardians, 1, 9) || !int(v.spiritus, 0, 52)) throw new Error('Invalid limits');
  return { cultivation:v.cultivation, stars:v.stars, level:v.level, tier:v.tier, guardians:v.guardians, spiritus:v.spiritus };
}
export function stockFromGarden(garden: Garden): Stock {
  const g = parseGarden(garden), guardians: Placement[] = [], spiritus: Stock['spiritus'] = [];
  for (const p of Object.values(g.flowerguard)) {
    const old = guardians.find(x => x.name === p.name);
    if (old) { if (p.cultLv > old.cultLv || (p.cultLv === old.cultLv && p.starLevel > old.starLevel)) Object.assign(old, p); }
    else guardians.push({ ...p });
  }
  for (const s of Object.values(g.spiritus)) { const row = spiritus.find(x => spiritKey(x) === spiritKey(s)); if (row) row.quantity++; else spiritus.push({ ...s, quantity: 1 }); }
  return { version:1, classType:g.classType, guardians, spiritus };
}
export function suggestedLimits(stock: Stock): Limits {
  return { cultivation: Math.max(1, ...stock.guardians.map(p => p.cultLv)), stars: Math.max(1, ...stock.guardians.map(p => p.starLevel)), level: Math.max(0, ...stock.spiritus.map(s => s.level)), tier: stock.spiritus.some(s => s.tier === 'R2') || stock.guardians.some(p => data.flowerguards.find(f => f.name === p.name)?.tier === 'R2') ? 'R2' : 'R1', guardians:Math.max(1, Math.min(9, stock.guardians.length)), spiritus:Math.min(52, stock.spiritus.reduce((sum, s) => sum + s.quantity, 0)) };
}
export function fitsStock(garden: Garden, stock: Stock) {
  if (garden.classType !== stock.classType) return false;
  const names = new Set<string>(), counts = new Map<string, number>();
  for (const p of Object.values(garden.flowerguard)) {
    if (names.has(p.name) || !stock.guardians.some(x => x.name === p.name && x.cultLv === p.cultLv && x.starLevel === p.starLevel)) return false;
    names.add(p.name);
  }
  for (const s of Object.values(garden.spiritus)) { const key = spiritKey(s), count = (counts.get(key) ?? 0) + 1; counts.set(key, count); if (count > (stock.spiritus.find(x => spiritKey(x) === key)?.quantity ?? 0)) return false; }
  return true;
}
export interface Gap { kind: 'guardian' | 'spiritus'; action: 'acquire' | 'upgrade'; guardian?: Placement; spiritus?: Spiritus; quantity: number; from?: Placement | Spiritus }
export function missingItems(garden: Garden, stock: Stock): Gap[] {
  const gaps: Gap[] = [];
  for (const p of Object.values(garden.flowerguard)) {
    const owned = stock.guardians.find(x => x.name === p.name);
    if (!owned) gaps.push({ kind:'guardian', action:'acquire', guardian:p, quantity:1 });
    else if (owned.cultLv < p.cultLv || owned.starLevel < p.starLevel) gaps.push({ kind:'guardian', action:'upgrade', guardian:p, from:owned, quantity:1 });
  }
  const available = stock.spiritus.map(s => ({ ...s }));
  // Match highest requested levels first; a physical item can satisfy only one slot.
  for (const s of Object.values(garden.spiritus).sort((a,b) => b.level-a.level)) {
    const family = available.filter(x => x.quantity && spiritFamily(x) === spiritFamily(s));
    const exact = family.filter(x => x.level >= s.level).sort((a,b) => a.level-b.level)[0];
    if (exact) { exact.quantity--; continue; }
    const lower = family.sort((a,b) => b.level-a.level)[0];
    if (lower) lower.quantity--;
    const old = gaps.find(x => x.kind === 'spiritus' && x.spiritus && spiritKey(x.spiritus) === spiritKey(s) && (x.from as Spiritus | undefined)?.level === lower?.level);
    if (old) old.quantity++;
    else gaps.push({ kind:'spiritus', action:lower ? 'upgrade' : 'acquire', spiritus:s, quantity:1, ...(lower ? { from:{ ...lower } } : {}) });
  }
  return gaps;
}

type Pool = { guardians:Placement[]; spiritus:Stock['spiritus']; maxGuardians:number; maxSpiritus:number };
function goalPool(stock: Stock, limits: Limits, target: string): Pool {
  const guardians: Placement[] = [];
  for (const f of data.flowerguards) {
    if (limits.tier === 'R1' && f.tier === 'R2') continue;
    const kind = f.primary_stat === target ? 'primary' : f.secondary_stat === target ? 'secondary' : null;
    if (!kind) continue;
    const last = Math.max(0, ...Object.keys(data.statBonusTables[target]?.[f.tier] ?? {}).map(Number));
    // Respect the user's ceilings AND the highest fully documented effective level.
    let best: Placement | undefined;
    for (let c=1;c<=limits.cultivation;c++) for (let s=1;s<=limits.stars;s++) {
      if (data.cultivationCaps[f.tier][c][kind] + starBonus[s][kind === 'primary' ? 0 : 1] > last) continue;
      if (!best || c > best.cultLv || (c === best.cultLv && s > best.starLevel)) best = { name:f.name, cultLv:c, starLevel:s };
    }
    if (best) guardians.push(best);
  }
  const spiritus: Stock['spiritus'] = [], stats = allowedStats[stock.classType];
  for (const tier of ['R1', 'R2'] as const) {
    if (limits.tier === 'R1' && tier === 'R2') continue;
    for (let i=0;i<stats.length;i++) {
      spiritus.push({ stat1:stats[i], stat2:null, tier, level:limits.level, quantity:limits.spiritus });
      for (let j=i+1;j<stats.length;j++) spiritus.push({stat1:stats[i],stat2:stats[j],tier,level:limits.level,quantity:limits.spiritus});
    }
  }
  return { guardians, spiritus:spiritus.filter(s => s.quantity > 0), maxGuardians:limits.guardians, maxSpiritus:limits.spiritus };
}
function search(pool: Pool, classType: ClassType, target: string, baseline?: Garden): Garden {
  function score(g: Garden): number[] {
    let value=0, progress=0, count=0;
    for (const id of Object.keys(g.flowerguard)) {
      const r = calculateSlot(g,id)!;
      for (const s of [r.primary,r.secondary]) if (s.name === target) {
        if (s.tableLimited || s.value === null) return [-1,0,0];
        value += s.value; progress += s.capped ? 0 : s.points; count++;
      }
    }
    return [value,progress,count];
  }
  const better = (a:number[],b:number[]) => a[0] > b[0] || a[0] === b[0] && (a[1] > b[1] || a[1] === b[1] && a[2] > b[2]);
  let winner = baseline ? parseGarden(baseline) : { ...emptyGarden(),classType };
  if (score(winner)[0] < 0) winner = { ...emptyGarden(), classType };
  const ids = data.gridLayout.filter(c=>c.type === 'spiritus').map(c=>c.id);
  const relevant = pool.guardians.filter(p => { const f=data.flowerguards.find(f=>f.name===p.name)!;return f.primary_stat===target||f.secondary_stat===target; });
  for (let seed=0;seed<3;seed++) {
    const g: Garden = seed===0 && baseline ? parseGarden(baseline) : { ...emptyGarden(), classType };
    if (score(g)[0]<0) { g.flowerguard={};g.spiritus={}; }
    const slots = [...data.flowerguardSlots]; if (seed===1) slots.reverse(); if (seed===2) slots.unshift(...slots.splice(4,1));
    const candidates = seed===1 ? [...relevant].reverse() : relevant;
    for (const p of candidates) {
      if (Object.keys(g.flowerguard).length >= pool.maxGuardians) break;
      if (Object.values(g.flowerguard).some(x=>x.name===p.name)) continue;
      const id=slots.find(id=>!g.flowerguard[id])!;g.flowerguard[id]={...p}; if (score(g)[0]<0) delete g.flowerguard[id];
    }
    // Greedy Spiritus placement, including empty cells and inventory quantities.
    const used: Record<string,number> = {};
    Object.values(g.spiritus).forEach(s=>{const k=spiritKey(s);used[k]=(used[k]??0)+1;});
    while (Object.keys(g.spiritus).length < pool.maxSpiritus) {
      let best=score(g), choice:{id:string;s:Spiritus}|undefined;
      for (const s of pool.spiritus) {
        if ((used[spiritKey(s)]??0)>=s.quantity) continue;
        for (const id of ids) if (!g.spiritus[id]) {
          g.spiritus[id]=s;const value=score(g);delete g.spiritus[id];
          if (better(value,best)) {best=value;choice={id,s};}
        }
      }
      if (!choice) break;g.spiritus[choice.id]={...choice.s};const k=spiritKey(choice.s);used[k]=(used[k]??0)+1;
    }
    // Local exchanges include reserves, not only already placed items.
    for (let pass=0;pass<5;pass++) {
      let best=score(g), apply:(()=>void)|undefined;
      for (const kind of ['flowerguard','spiritus'] as const) {
        const positions=kind==='flowerguard'?data.flowerguardSlots:ids;
        const swap=(a:string,b:string)=>{const map=g[kind];const x=map[a],y=map[b];if(y)map[a]=y as never;else delete map[a];if(x)map[b]=x as never;else delete map[b];};
        for(let a=0;a<positions.length;a++)for(let b=a+1;b<positions.length;b++) {
          if(!g[kind][positions[a]]&&!g[kind][positions[b]])continue;
          swap(positions[a],positions[b]);const v=score(g);swap(positions[a],positions[b]);
          if(better(v,best)){best=v;apply=()=>swap(positions[a],positions[b]);}
        }
      }
      for(const id of data.flowerguardSlots) for(const p of relevant) {
        if(Object.entries(g.flowerguard).some(([slot,x])=>slot!==id&&x.name===p.name))continue;
        if(!g.flowerguard[id]&&Object.keys(g.flowerguard).length>=pool.maxGuardians)continue;
        const old=g.flowerguard[id];g.flowerguard[id]=p;const v=score(g);if(old)g.flowerguard[id]=old;else delete g.flowerguard[id];
        if(better(v,best)){best=v;apply=()=>{g.flowerguard[id]={...p};};}
      }
      const counts:Record<string,number>={};Object.values(g.spiritus).forEach(s=>{const k=spiritKey(s);counts[k]=(counts[k]??0)+1;});
      for(const id of ids)for(const s of pool.spiritus) {
        const old=g.spiritus[id],k=spiritKey(s);
        if((counts[k]??0)-(old&&spiritKey(old)===k?1:0)>=s.quantity)continue;
        if(!old&&Object.keys(g.spiritus).length>=pool.maxSpiritus)continue;
        g.spiritus[id]=s;const v=score(g);if(old)g.spiritus[id]=old;else delete g.spiritus[id];
        if(better(v,best)){best=v;apply=()=>{g.spiritus[id]={...s};};}
      }
      if(!apply)break;apply();
    }
    if(better(score(g),score(winner)))winner=parseGarden(g);
  }
  return winner;
}
export function planGardens(rawStock: Stock, rawLimits: Limits, target: string, current: Garden) {
  const stock=parseStock(rawStock), limits=parseLimits(rawLimits);
  if(!data.flowerguards.some(f=>f.primary_stat===target||f.secondary_stat===target))throw new Error('Invalid target');
  const baseline= fitsStock(current,stock) ? current : undefined;
  const owned=search({guardians:stock.guardians,spiritus:stock.spiritus,maxGuardians:9,maxSpiritus:52},stock.classType,target,baseline);
  const goal=search(goalPool(stock,limits,target),stock.classType,target);
  return { owned, goal, gaps:missingItems(goal,stock), target, current:calculateGarden(current), ownedTotals:calculateGarden(owned), goalTotals:calculateGarden(goal), limits };
}
