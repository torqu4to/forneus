/**
 * The comparator ported to TypeScript must agree with the Python core.
 *
 * Same discipline as the solver: Python generates the cases, TypeScript has
 * to reproduce them. Regenerate with
 * `python scripts/generate_profile_fixtures.py` after touching either side.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { optimizeProfile } from '../src/lib/solver/profiles.ts';
import { ToolError } from '../src/lib/solver/errors.ts';

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL('./profile-fixtures.json', import.meta.url)), 'utf8'),
);

function close(actual: number, expected: number, what: string) {
  assert.ok(Math.abs(actual - expected) < 1e-6,
    `${what}: TypeScript ${actual} != Python ${expected}`);
}

function checkScenario(actual: any, expected: any, label: string) {
  close(actual.available_jelly, expected.available_jelly, `${label}.available_jelly`);
  close(actual.additional_jelly_spent, expected.additional_jelly_spent,
    `${label}.additional_jelly_spent`);
  close(actual.jelly_leftover, expected.jelly_leftover, `${label}.jelly_leftover`);
  close(actual.total_effective_power, expected.total_effective_power, `${label}.power`);

  assert.equal(actual.allocations.length, expected.allocations.length,
    `${label}: número de alocações`);
  actual.allocations.forEach((got: any, index: number) => {
    const want = expected.allocations[index];
    assert.equal(got.id, want.id, `${label}[${index}].id`);
    assert.equal(got.catpal_type, want.catpal_type, `${label}[${index}].tipo`);
    assert.equal(got.current_level, want.current_level, `${label}[${index}].nível atual`);
    assert.equal(got.target_level, want.target_level, `${label}[${index}].nível alvo`);
    close(got.jelly_change, want.jelly_change, `${label}[${index}].jelly_change`);
    close(got.effective_power, want.effective_power, `${label}[${index}].poder`);
  });

  assert.deepEqual(actual.changes.map((a: any) => a.id), expected.changes,
    `${label}: quais amigatos mudam`);
}

describe('comparador manter vs redistribuir', () => {
  it('tem casos dos dois tipos de recomendação', () => {
    const kinds = new Set(fixtures.cases.map((c: any) => c.expected.recommendation));
    assert.ok(kinds.has('keep') && kinds.has('redistribute'),
      'as fixtures só exercitam uma das recomendações');
  });

  for (const testCase of fixtures.cases) {
    it(testCase.note, () => {
      const result = optimizeProfile(testCase.input.profile, testCase.input.new_jelly);
      const expected = testCase.expected;

      assert.equal(result.recommendation, expected.recommendation, 'recomendação');
      close(result.current.invested_jelly, expected.current.invested_jelly, 'investido hoje');
      close(result.current.total_effective_power, expected.current.total_effective_power,
        'poder atual');
      checkScenario(result.keep, expected.keep, 'keep');
      checkScenario(result.redistribute, expected.redistribute, 'redistribute');
    });
  }
});

describe('validação de perfil', () => {
  const bad: [string, any, number][] = [
    ['perfil ausente', null, 100],
    ['catpals não é lista', { catpals: 'x' }, 100],
    ['id vazio', { catpals: [{ id: '', catpal_type: 'Purple', current_level: 10 }] }, 100],
    ['ids repetidos', { catpals: [
      { id: 'a', catpal_type: 'Purple', current_level: 10 },
      { id: 'a', catpal_type: 'Purple', current_level: 10 }] }, 100],
    ['tipo desconhecido', { catpals: [{ id: 'a', catpal_type: 'Nope', current_level: 10 }] }, 100],
    ['nível inexistente', { catpals: [{ id: 'a', catpal_type: 'Purple', current_level: 11 }] }, 100],
    ['jelly negativa', { catpals: [] }, -1],
  ];

  for (const [note, profile, jelly] of bad) {
    it(`rejeita ${note}`, () => {
      assert.throws(() => optimizeProfile(profile, jelly), (error: unknown) => {
        assert.ok(error instanceof ToolError, 'deve ser ToolError');
        assert.ok(error.key.startsWith('error.'), `chave estranha: ${error.key}`);
        return true;
      });
    });
  }
});
