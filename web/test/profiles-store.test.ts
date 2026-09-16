/**
 * Storage and merge behavior.
 *
 * These are the paths where someone loses a saved team, so they are tested
 * against hostile storage — corrupt JSON, tampered entries, a browser that
 * refuses to store anything — not just the happy path.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LocalProfileStore, STORAGE_KEY } from '../src/lib/profiles/store.ts';
import { emptyProfile, isProfile, type Profile } from '../src/lib/profiles/types.ts';
import { planMerge } from '../src/lib/profiles/merge.ts';

/** A localStorage stand-in; `failing` refuses writes like private mode does. */
function fakeStorage(initial: Record<string, string> = {}, failing = false): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    removeItem: (key: string) => { data.delete(key); },
    setItem: (key: string, value: string) => {
      if (failing) throw new DOMException('QuotaExceededError');
      data.set(key, value);
    },
  } as Storage;
}

function profile(name: string, updated: string, id = name): Profile {
  return { id, name, catpals: [], updated_at: updated };
}

describe('LocalProfileStore', () => {
  it('salva, lê de volta e remove', async () => {
    const store = new LocalProfileStore(fakeStorage());
    const saved = await store.save(emptyProfile('Equipe principal'));

    assert.equal((await store.list()).length, 1);
    assert.equal((await store.get(saved.id))?.name, 'Equipe principal');

    await store.remove(saved.id);
    assert.deepEqual(await store.list(), []);
    assert.equal(await store.get(saved.id), null);
  });

  it('carimba updated_at ao salvar', async () => {
    const store = new LocalProfileStore(fakeStorage());
    const stale = { ...emptyProfile('X'), updated_at: '2000-01-01T00:00:00.000Z' };
    const saved = await store.save(stale);
    assert.notEqual(saved.updated_at, stale.updated_at);
  });

  it('substitui pelo id em vez de duplicar', async () => {
    const store = new LocalProfileStore(fakeStorage());
    const first = await store.save(emptyProfile('Antes'));
    await store.save({ ...first, name: 'Depois' });

    const all = await store.list();
    assert.equal(all.length, 1);
    assert.equal(all[0].name, 'Depois');
  });

  it('lista do mais recente para o mais antigo', async () => {
    const store = new LocalProfileStore(fakeStorage({
      [STORAGE_KEY]: JSON.stringify([
        profile('velho', '2026-01-01T00:00:00.000Z'),
        profile('novo', '2026-09-01T00:00:00.000Z'),
      ]),
    }));
    assert.deepEqual((await store.list()).map((p) => p.name), ['novo', 'velho']);
  });

  it('trata armazenamento corrompido como vazio, sem quebrar', async () => {
    for (const raw of ['não é json', '{"não":"lista"}', 'null', '[1,2,3]']) {
      const store = new LocalProfileStore(fakeStorage({ [STORAGE_KEY]: raw }));
      assert.deepEqual(await store.list(), [], `falhou com: ${raw}`);
    }
  });

  it('descarta entradas inválidas e preserva as válidas', async () => {
    const store = new LocalProfileStore(fakeStorage({
      [STORAGE_KEY]: JSON.stringify([
        profile('boa', '2026-01-01T00:00:00.000Z'),
        { id: 'sem-nome', updated_at: '2026-01-01T00:00:00.000Z', catpals: [] },
        { id: 'dup', name: 'ids repetidos', updated_at: '2026-01-01T00:00:00.000Z',
          catpals: [{ id: 'a', name: '', catpal_type: 'Purple', current_level: 10 },
                    { id: 'a', name: '', catpal_type: 'Purple', current_level: 10 }] },
      ]),
    }));
    assert.deepEqual((await store.list()).map((p) => p.name), ['boa']);
  });

  it('não quebra quando o navegador recusa gravar', async () => {
    const store = new LocalProfileStore(fakeStorage({}, true));
    const saved = await store.save(emptyProfile('X'));
    assert.equal(saved.name, 'X');          // o chamador continua com sua cópia
    assert.deepEqual(await store.list(), []); // ...mas nada persistiu
  });

  it('funciona sem localStorage nenhum', async () => {
    const store = new LocalProfileStore(null);
    await store.save(emptyProfile('X'));
    assert.deepEqual(await store.list(), []);
  });
});

describe('isProfile', () => {
  it('aceita "Max" como nível e recusa lixo', () => {
    assert.ok(isProfile({ id: 'a', name: 'n', updated_at: 'x', catpals: [
      { id: 'c', name: '', catpal_type: 'RedR2', current_level: 'Max' }] }));
    assert.ok(!isProfile({ id: 'a', name: 'n', updated_at: 'x', catpals: [
      { id: 'c', name: '', catpal_type: 'RedR2', current_level: null }] }));
    assert.ok(!isProfile(null));
    assert.ok(!isProfile({ id: '', name: 'n', updated_at: 'x', catpals: [] }));
  });
});

describe('planMerge', () => {
  const older = '2026-01-01T00:00:00.000Z';
  const newer = '2026-09-01T00:00:00.000Z';

  it('envia o que só existe localmente', () => {
    const plan = planMerge([profile('local', newer)], []);
    assert.deepEqual(plan.upload.map((p) => p.id), ['local']);
    assert.deepEqual(plan.conflicts, []);
  });

  it('mantém o que só existe na conta', () => {
    const plan = planMerge([], [profile('remoto', newer)]);
    assert.deepEqual(plan.keepRemote.map((p) => p.id), ['remoto']);
    assert.deepEqual(plan.upload, []);
  });

  it('no mesmo id, o mais recente vence — e o conflito é relatado', () => {
    const localWins = planMerge([profile('x', newer)], [profile('x', older)]);
    assert.deepEqual(localWins.upload.map((p) => p.id), ['x']);
    assert.deepEqual(localWins.conflicts, [{ id: 'x', winner: 'local', name: 'x' }]);

    const remoteWins = planMerge([profile('x', older)], [profile('x', newer)]);
    assert.deepEqual(remoteWins.upload, []);
    assert.deepEqual(remoteWins.keepRemote.map((p) => p.id), ['x']);
    assert.equal(remoteWins.conflicts[0].winner, 'remote');
  });

  it('nunca perde um perfil', () => {
    const local = [profile('só-local', newer), profile('ambos', newer)];
    const remote = [profile('só-remoto', newer), profile('ambos', older)];
    const plan = planMerge(local, remote);

    const survivors = new Set([...plan.upload, ...plan.keepRemote].map((p) => p.id));
    assert.deepEqual([...survivors].sort(), ['ambos', 'só-local', 'só-remoto']);
  });
});
