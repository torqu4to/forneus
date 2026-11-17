import assert from 'node:assert/strict';
import test from 'node:test';
import { progression, planCosts, costSteps, starBonus, spiritLevel, atlasLevel } from '../src/lib/amigatos-progression.ts';
import roster from '../src/data/amigatos-roster.json' with { type: 'json' };
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('the two photographed awakening costs match the extracted rows', () => {
  const flora = planCosts('awake_cost', 7, 2, 15);
  assert.deepEqual(flora.materials.map(({ item_id, amount }) => [item_id, amount]), [[1001, 13500], [1202, 3300]]);
  assert.equal(flora.required_player_level, 100);

  const sakurako = planCosts('awake_cost', 7, 1, 12);
  assert.deepEqual(sakurako.materials.map(({ item_id, amount }) => [item_id, amount]), [[1001, 8000], [1027, 1800]]);
  assert.equal(sakurako.required_player_level, 70);
});

test('a range sums materials without converting resource tiers', () => {
  const first = planCosts('awake_cost', 7, 1, 11);
  const second = planCosts('awake_cost', 7, 1, 12);
  const range = planCosts('awake_cost', 7, 1, 11, 12);
  for (const material of range.materials) {
    const expected = (first.materials.find((item) => item.item_id === material.item_id)?.amount ?? 0)
      + (second.materials.find((item) => item.item_id === material.item_id)?.amount ?? 0);
    assert.equal(material.amount, expected);
  }
  assert.throws(() => planCosts('awake_cost', 7, 1, 14, 16), RangeError);
});

test('star, spirit and Atlas lookups use the committed snapshot', () => {
  assert.equal(progression.cost_rows.length, 2068);
  assert.equal(progression.star_rows.length, 198);
  assert.equal(progression.spirit_rows.length, 4004);
  assert.equal(costSteps('awake_cost', 7, 2).at(-1), 15);
  assert.equal(starBonus(321, 2)?.attrs.length, 5);
  assert.equal(spiritLevel(4, 1)?.level, 1);
  assert.equal(atlasLevel(185)?.attrs.length, 4);
});

test('named Catpals connect to costs, stars and only their exact portraits', () => {
  assert.equal(roster.cats.length, 74);
  assert.equal(roster.cats.filter((cat) => cat.portrait).length, 29);
  const flora = roster.cats.find((cat) => cat.name === 'Flora')!;
  assert.deepEqual({ class: flora.class, quality: flora.quality, star: flora.cat_star_id }, { class: 2, quality: 7, star: 233 });
  for (const cat of roster.cats) {
    assert.ok(starBonus(cat.cat_star_id, 2), `${cat.name} missing star row`);
    assert.ok(spiritLevel(cat.quality, 1), `${cat.name} missing spirit row`);
    for (const system of ['develop_cost', 'awake_cost', 'star_up_cost'] as const) {
      assert.ok(costSteps(system, cat.quality, cat.class).length, `${cat.name} missing ${system} cost rows`);
    }
    if (cat.portrait) {
      assert.ok(Object.hasOwn(roster.portrait_sources, String(cat.id)), `${cat.name} missing portrait provenance`);
      assert.ok(existsSync(fileURLToPath(new URL(`../public${cat.portrait}`, import.meta.url))), `${cat.name} missing portrait file`);
    }
  }
});
