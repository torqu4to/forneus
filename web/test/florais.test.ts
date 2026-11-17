import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { data, emptyGarden, parseGarden, calculateSlot, calculateGarden, spiritusPoints, cultivationCost, switchClass } from '../src/lib/florais.ts';
import type { Spiritus } from '../src/lib/florais.ts';

describe('Floral guardian calculator — Flowerguard Online snapshot', () => {
  it('has 15 guardians, nine slots, 52 Spiritus and valid adjacency', () => {
    assert.equal(data.flowerguards.length, 15); assert.equal(data.flowerguardSlots.length, 9);
    assert.equal(data.gridLayout.filter(c => c.type === 'spiritus').length, 52);
    assert.equal(new Set(data.gridLayout.map(c => `${c.row}:${c.col}`)).size, 61);
    for (const a of Object.values(data.gridAdjacency)) for (const id of Object.values(a)) assert(data.gridLayout.some(c => c.id === id && c.type === 'spiritus'));
  });
  it('empty garden has no bonuses and zero costs', () => {
    const r = calculateGarden(emptyGarden()); assert.deepEqual(r.slots, []); assert.deepEqual(r.totals, {}); assert.equal(r.costs.R2.oil, 0);
  });
  it('uses exact single/dual and R1/R2 source tables including irregular values', () => {
    const sp: Spiritus = { tier: 'R1', level: 9, stat1: 'Wisdom', stat2: null };
    assert.equal(spiritusPoints(sp), 340); sp.stat2 = 'Morale'; assert.equal(spiritusPoints(sp), 189);
    sp.tier = 'R2'; assert.equal(spiritusPoints(sp), 289); sp.level = 2; assert.equal(spiritusPoints(sp), 48);
  });
  it('unlocks diagonals at 3,5,7,9, not before', () => {
    const garden = emptyGarden(); garden.flowerguard.Center = { name: 'Kitsune', cultLv: 1, starLevel: 1 };
    for (const [dir, threshold] of Object.entries(data.directionUnlockLevel)) {
      if (threshold === 1) continue;
      garden.spiritus = { [data.gridAdjacency.Center[dir]]: { tier:'R2', level:9, stat1:'Wisdom', stat2:null } };
      garden.flowerguard.Center.cultLv = threshold - 1; assert.equal(calculateSlot(garden, 'Center')!.primary.points, 0);
      garden.flowerguard.Center.cultLv = threshold; assert.equal(calculateSlot(garden, 'Center')!.primary.points, 520);
    }
  });
  it('matches a hand-calculated R1 fixture at cultivation 1', () => {
    const garden = emptyGarden(); garden.flowerguard.Top = { name:'Kumquat', cultLv:1, starLevel:1 };
    garden.spiritus.S02 = { tier:'R1', level:3, stat1:'Stamina', stat2:null };
    garden.spiritus.S07 = { tier:'R1', level:3, stat1:'Morale', stat2:null };
    const r = calculateSlot(garden, 'Top')!;
    assert.equal(r.primary.points, 80); assert.equal(r.primary.level, 1); assert.equal(r.primary.value, 45);
    assert.equal(r.secondary.value, 405); assert.deepEqual(r.materials, { powder:0, oil:0 });
  });
  it('counts dual Spiritus for both matching attributes', () => {
    const garden = emptyGarden(); garden.flowerguard.Center = { name:'Kitsune', cultLv:1, starLevel:1 };
    garden.spiritus.S19 = { tier:'R2', level:9, stat1:'Wisdom', stat2:'Morale' };
    const r = calculateSlot(garden,'Center')!; assert.equal(r.primary.points,289); assert.equal(r.secondary.points,289); assert.equal(r.primary.level,2);
  });
  it('applies cultivation cap before star bonuses', () => {
    const garden = emptyGarden(); garden.flowerguard.Center = { name:'Kitsune', cultLv:9, starLevel:6 };
    for (const id of Object.values(data.gridAdjacency.Center)) garden.spiritus[id] = { tier:'R2', level:9, stat1:'Wisdom', stat2:null };
    const r=calculateSlot(garden,'Center')!; assert.equal(r.primary.level,11); assert.equal(r.primary.bonus,2); assert.equal(r.primary.effective,13); assert.equal(r.primary.value,3260); assert(r.primary.capped);
    garden.flowerguard.Center.cultLv=13; const max=calculateSlot(garden,'Center')!; assert.equal(max.primary.effective,15); assert.equal(max.primary.value,3507); assert(max.primary.tableLimited);
  });
  it('stars can grant bonuses even without Spiritus, like the source', () => {
    const garden=emptyGarden(); garden.flowerguard.Top={name:'Kumquat',cultLv:1,starLevel:6};
    const r=calculateSlot(garden,'Top')!; assert.equal(r.primary.value,101); assert.equal(r.secondary.value,810);
  });
  it('accumulates costs from level one and keeps tiers separate', () => {
    assert.deepEqual(cultivationCost('R1',3),{powder:605,oil:130});
    const garden=emptyGarden(); garden.flowerguard.Top={name:'Kumquat',cultLv:3,starLevel:1}; garden.flowerguard.Center={name:'Kitsune',cultLv:2,starLevel:1};
    const r=calculateGarden(garden); assert.deepEqual(r.costs.R1,{powder:605,oil:130}); assert.deepEqual(r.costs.R2,{powder:275,oil:50});
  });
  it('roundtrips validated storage, converts class without losing Spiritus', () => {
    const garden=emptyGarden(); garden.spiritus.S01={tier:'R2',level:9,stat1:'Wisdom',stat2:'Stamina'};
    assert.deepEqual(parseGarden(JSON.parse(JSON.stringify(garden))),garden);
    const physical=switchClass(garden,'physical'); assert.equal(physical.spiritus.S01.stat1,'Strength'); assert.equal(physical.spiritus.S01.stat2,'Stamina'); assert.equal(garden.classType,'magic');
    assert.deepEqual(switchClass(physical,'magic'),garden);
  });
  it('rejects corrupt levels, cells, duplicate attributes and wrong-class stats', () => {
    for (const level of [-1,10,1.5,NaN,'2']) {
      const garden=emptyGarden(); garden.spiritus.S01={tier:'R1',level:level as number,stat1:'Wisdom',stat2:null}; assert.throws(()=>parseGarden(garden));
    }
    const garden=emptyGarden(); garden.flowerguard.invalid={name:'Kumquat',cultLv:1,starLevel:1}; assert.throws(()=>parseGarden(garden));
    garden.flowerguard={}; garden.spiritus.S01={tier:'R1',level:0,stat1:'Wisdom',stat2:'Wisdom'}; assert.throws(()=>parseGarden(garden));
    garden.spiritus.S01.stat2='Strength'; assert.throws(()=>parseGarden(garden));
    assert.throws(()=>parseGarden(null)); assert.throws(()=>parseGarden({...emptyGarden(),version:2}));
  });
});
