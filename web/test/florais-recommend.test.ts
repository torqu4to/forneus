import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyGarden, calculateGarden } from '../src/lib/florais.ts';
import { recommendGarden } from '../src/lib/florais-recommend.ts';
test('recommendation improves target, preserves inventory and input', () => {
  const g = emptyGarden(); g.flowerguard.Top = { name: 'Kumquat', cultLv: 1, starLevel: 1 };
  g.spiritus.S52 = { stat1: 'Morale', stat2: null, tier: 'R1', level: 3 };
  const original = structuredClone(g), result = recommendGarden(g, 'Blessing');
  assert(result.improved); assert(result.after > result.before);
  assert.deepEqual(g, original);
  assert.deepEqual(Object.values(result.garden.flowerguard), Object.values(g.flowerguard));
  assert.deepEqual(Object.values(result.garden.spiritus), Object.values(g.spiritus));
  assert.equal(calculateGarden(result.garden).totals.Blessing, result.after);
});
test('no improvement preserves layout; unsupported targets rejected', () => {
  const g = emptyGarden(); assert.deepEqual(recommendGarden(g, 'Blessing').garden, g);
  assert.throws(() => recommendGarden(g, 'Combat power'));
});
