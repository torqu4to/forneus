import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyGarden, calculateGarden, data } from '../src/lib/florais.ts';
import { parseStock, parseLimits, suggestedLimits, stockFromGarden, spiritKey, missingItems, fitsStock, planGardens } from '../src/lib/florais-planner.ts';
import type { Stock } from '../src/lib/florais-planner.ts';
const fixture=():Stock=>({version:1,classType:'magic',guardians:[{name:'Kumquat',cultLv:1,starLevel:1}],spiritus:[{stat1:'Morale',stat2:null,tier:'R1',level:3,quantity:1}]});
test('limits follow owned progression without raising levels',()=>{
  assert.deepEqual(suggestedLimits(fixture()),{cultivation:1,stars:1,level:3,tier:'R1',guardians:1,spiritus:1});
  const empty={...fixture(),guardians:[],spiritus:[]};assert.equal(suggestedLimits(empty).spiritus,0);
  assert.throws(()=>parseLimits({...suggestedLimits(fixture()),stars:7}));
  assert.throws(()=>parseLimits({...suggestedLimits(fixture()),spiritus:-1}));
});
test('stock rejects duplicate guardians, counts and wrong-class spiritus',()=>{
  const s=fixture();assert.deepEqual(parseStock(s),s);
  assert.throws(()=>parseStock({...s,guardians:[...s.guardians,...s.guardians]}));
  assert.throws(()=>parseStock({...s,spiritus:[{...s.spiritus[0],quantity:53}]}));
  assert.throws(()=>parseStock({...s,spiritus:[{...s.spiritus[0],stat1:'Strength'}]}));
});
test('inventory search works from empty board and respects owned quantities',()=>{
  const stock=fixture(),copy=structuredClone(stock),current=emptyGarden();
  const r=planGardens(stock,suggestedLimits(stock),'Blessing',current);
  assert(fitsStock(r.owned,stock));assert((r.ownedTotals.totals.Blessing??0)>0);
  assert.deepEqual(stock,copy);assert.deepEqual(current,emptyGarden());
  assert.equal(Object.keys(r.owned.spiritus).length,1);
  assert(r.goalTotals.totals.Blessing>=r.ownedTotals.totals.Blessing);
});
test('goal uses missing guardians but never exceeds custom ceilings',()=>{
  const stock=fixture(),limits={cultivation:3,stars:2,level:4,tier:'R1' as const,guardians:2,spiritus:3};
  const r=planGardens(stock,limits,'Haste',emptyGarden());
  assert(Object.keys(r.goal.flowerguard).length<=2);assert(Object.keys(r.goal.spiritus).length<=3);
  assert(r.gaps.some(g=>g.kind==='guardian'&&g.action==='acquire'));
  for(const p of Object.values(r.goal.flowerguard)){assert(p.cultLv<=3&&p.starLevel<=2);assert.equal(data.flowerguards.find(f=>f.name===p.name)!.tier,'R1');}
  for(const s of Object.values(r.goal.spiritus)){assert(s.level<=4);assert.equal(s.tier,'R1');}
  const targetSkills=calculateGarden(r.goal).slots.flatMap(s=>[s.primary,s.secondary]).filter(s=>s.name==='Haste');assert(targetSkills.every(s=>!s.tableLimited));
});
test('gaps consume each Spiritus once and distinguish upgrades',()=>{
  const stock=fixture(),g=emptyGarden();g.flowerguard.Top={name:'Kumquat',cultLv:3,starLevel:2};
  g.spiritus.S01={...stock.spiritus[0],level:5};g.spiritus.S02={...stock.spiritus[0],level:5};
  const gaps=missingItems(g,stock);assert.equal(gaps.filter(g=>g.kind==='spiritus'&&g.action==='upgrade').reduce((s,g)=>s+g.quantity,0),1);
  assert.equal(gaps.filter(g=>g.kind==='spiritus'&&g.action==='acquire').reduce((s,g)=>s+g.quantity,0),1);
  assert.equal(gaps[0].action,'upgrade');
});
test('garden import aggregates dual attributes independent of ordering',()=>{
  const g=emptyGarden();g.spiritus.S01={stat1:'Wisdom',stat2:'Morale',tier:'R2',level:4};g.spiritus.S02={...g.spiritus.S01,stat1:'Morale',stat2:'Wisdom'};
  const s=stockFromGarden(g);assert.equal(s.spiritus.length,1);assert.equal(s.spiritus[0].quantity,2);assert.equal(spiritKey(g.spiritus.S01),spiritKey(g.spiritus.S02));
});
test('empty stock and zero Spiritus ceiling remain valid',()=>{
  const stock={...fixture(),guardians:[],spiritus:[]};const r=planGardens(stock,suggestedLimits(stock),'Blessing',emptyGarden());
  assert.equal(Object.keys(r.owned.flowerguard).length,0);assert.equal(Object.keys(r.goal.spiritus).length,0);
  assert.throws(()=>planGardens(stock,suggestedLimits(stock),'Power',emptyGarden()));
});
test('full target remains bounded and skips undocumented target levels',()=>{
  const stock=fixture();
  const r=planGardens(stock,{cultivation:13,stars:6,level:9,tier:'R2',guardians:9,spiritus:52},'Blessing',emptyGarden());
  assert(Object.keys(r.goal.flowerguard).length<=9);assert(Object.keys(r.goal.spiritus).length<=52);
  assert.equal(new Set(Object.values(r.goal.flowerguard).map(p=>p.name)).size,Object.keys(r.goal.flowerguard).length);
  assert(r.goalTotals.slots.flatMap(s=>[s.primary,s.secondary]).filter(s=>s.name==='Blessing').every(s=>!s.tableLimited));
});
test('compatible current garden is a floor for owned objective',()=>{
  const current=emptyGarden();current.flowerguard.Top={name:'Kumquat',cultLv:1,starLevel:1};current.spiritus.S07={stat1:'Morale',stat2:null,tier:'R1',level:3};
  const stock=stockFromGarden(current),r=planGardens(stock,suggestedLimits(stock),'Blessing',current);
  assert(r.ownedTotals.totals.Blessing>=calculateGarden(current).totals.Blessing);assert(fitsStock(r.owned,stock));
});
