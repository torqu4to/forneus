import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyGarden } from '../src/lib/florais.ts';
import { encodeGarden, decodeGarden, parseLibrary } from '../src/lib/florais-saved.ts';
test('share roundtrip retains guardians and dual Spiritus', () => {
  const g = emptyGarden(); g.flowerguard.Top = { name: 'Kumquat', cultLv: 13, starLevel: 6 };
  g.spiritus.S02 = { stat1: 'Wisdom', stat2: 'Morale', tier: 'R2', level: 9 };
  assert.deepEqual(decodeGarden(encodeGarden(g)), g);
  assert.throws(() => decodeGarden('invalid!')); assert.throws(() => decodeGarden('A'.repeat(20001)));
});
test('multiple gardens remain independent and invalid libraries are rejected', () => {
  const library = parseLibrary({version:1,active:'a',gardens:[{id:'a',name:'Jardim 1',garden:emptyGarden()},{id:'b',name:'Jardim 2',garden:emptyGarden()}]});
  library.gardens[0].garden.flowerguard.Top = {name:'Kumquat',cultLv:1,starLevel:1};
  assert.deepEqual(library.gardens[1].garden.flowerguard, {});
  assert.throws(() => parseLibrary({...library,active:'missing'}));
  assert.throws(() => parseLibrary({...library,gardens:[library.gardens[0],library.gardens[0]]}));
});
