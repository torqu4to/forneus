import { data, allowedStats, emptyGarden, parseGarden, switchClass, calculateGarden, calculateSlot } from './florais';
import type { Garden, Stat, Tier, ClassType } from './florais';
import { floralText, statNames, slotNames, guardianName } from '../i18n/florais';
import { parseLibrary, encodeGarden, decodeGarden } from './florais-saved';
import type { GardenLibrary } from './florais-saved';
import { initPlanner } from './florais-planner-ui';

const app = document.querySelector<HTMLElement>('.floral-app');
if (app) init(app);
function init(root: HTMLElement) {
  const locale = root.dataset.locale === 'en' ? 'en' : 'pt';
  const t = floralText[locale], names = statNames[locale], slots = slotNames[locale];
  const displayName = (name: string) => guardianName(name, locale);
  const n = (v: number) => v.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US');
  const get = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#floral-${id}`)!;
  const select = (id: string) => get<HTMLSelectElement>(id);
  const editor = get<HTMLDialogElement>('editor'), confirm = get<HTMLDialogElement>('confirm');
  const key = 'forneus:florais:v1';
  let state: Garden = emptyGarden(), selected = '', storageWarning = '';
  let recommendationWorker: Worker | null = null;
  let suggestion: Garden | null = null;
  let refreshPlanner = () => {};
  function clearSuggestion() {
    recommendationWorker?.terminate(); recommendationWorker = null; suggestion = null;
    get('comparison').replaceChildren(); get('recommend-status').textContent = ''; get('save-suggestion').hidden = true;
  }
  try { const saved = localStorage.getItem(key); if (saved) state = parseGarden(JSON.parse(saved)); }
  catch { storageWarning = t.invalid; }
  const libraryKey = 'forneus:florais:gardens:v1';
  let library: GardenLibrary = { version: 1, active: 'original', gardens: [{ id: 'original', name: t.garden, garden: state }] };
  try { const saved = localStorage.getItem(libraryKey); if (saved) library = parseLibrary(JSON.parse(saved)); }
  catch { storageWarning = t.invalid; }
  state = structuredClone(library.gardens.find(g => g.id === library.active)!.garden);
  function syncLibrary() {
    library.gardens.find(g => g.id === library.active)!.garden = structuredClone(state);
  }
  function addGarden(name: string, garden: Garden) {
    if (library.gardens.length >= 100) { get('status').textContent = t.limitGardens; return false; }
    syncLibrary();
    const id = crypto.randomUUID(); library.gardens.push({ id, name, garden: structuredClone(garden) }); library.active = id;
    state = garden; selected = ''; persist(); return true;
  }
  // DOM-only text insertion; imported state is validated before use.
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
    const e = document.createElement(tag); e.textContent = text; e.className = className; return e;
  }
  function icon(src: string | undefined, alt = '') { if (!src) return el('span', '🌸'); const img = el('img'); img.onerror = () => img.replaceWith(el('span', '🌸')); img.src = src; img.alt = alt; return img; }
  function table(headers: string[], rows: string[][]) {
    const wrap = el('div', '', 'floral-table-wrap'), table = el('table', '', 'floral-table'), head = el('thead'), tr = el('tr');
    for (const label of headers) { const th = el('th', label); th.scope = 'col'; tr.append(th); }
    head.append(tr); table.append(head); const body = el('tbody');
    for (const row of rows) { const line = el('tr'); row.forEach(value => line.append(el('td', value))); body.append(line); }
    table.append(body); wrap.append(table); return wrap;
  }
  function highlight() {
    const result = calculateSlot(state, selected);
    const connected = result?.directions.map(d => data.gridAdjacency[selected][d]) ?? [];
    root.querySelectorAll<HTMLButtonElement>('[data-cell]').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.cell === selected);
      btn.classList.toggle('is-connected', connected.includes(btn.dataset.cell!));
    });
    get('selection').textContent = selected ? slots[selected] ?? selected : t.choose;
  }
  function render() {
    refreshPlanner();
    clearSuggestion();
    select('gardens').replaceChildren(...library.gardens.map(g => new Option(g.name, g.id)));
    select('gardens').value = library.active;
    root.querySelectorAll<HTMLInputElement>('input[name="floral-class"]').forEach(radio => { radio.checked = radio.value === state.classType; });
    for (const cell of data.gridLayout) {
      const btn = root.querySelector<HTMLButtonElement>(`[data-cell="${cell.id}"]`)!;
      btn.replaceChildren(); let label = `${slots[cell.id] ?? cell.id}: `;
      if (cell.type === 'flowerguard') {
        const fg = state.flowerguard[cell.id];
        if (fg) { btn.append(icon(data.icons.flowerguards[fg.name]), el('small', `${fg.cultLv} · ${fg.starLevel}★`)); label += `${displayName(fg.name)}, ${t.cultivation} ${fg.cultLv}, ${fg.starLevel} ${t.stars}`; }
        else { btn.append(el('span', '✿', 'floral-cell-empty')); label += `${t.guardian} — ${t.empty}`; }
      } else {
        const sp = state.spiritus[cell.id];
        if (sp) {
          const iconKey = sp.stat2 ? [sp.stat1, sp.stat2].sort().join('+') : sp.stat1;
          btn.append(icon(data.icons.spiritus[iconKey]), el('small', `${sp.tier} · ${sp.level}`));
          label += `${names[sp.stat1]}${sp.stat2 ? ' / ' + names[sp.stat2] : ''}, ${sp.tier}, ${t.level} ${sp.level}`;
        } else { btn.append(el('span', '+', 'floral-cell-empty')); label += `Spiritus — ${t.empty}`; }
      }
      btn.setAttribute('aria-label', label); btn.title = label;
    }
    highlight(); const result = calculateGarden(state);
    const oldPriority = select('priority').value;
    select('priority').replaceChildren(...Object.keys(result.totals).sort().map(name => new Option(name, name)));
    if (Object.hasOwn(result.totals, oldPriority)) select('priority').value = oldPriority;
    get<HTMLButtonElement>('recommend').disabled = !result.slots.length;
    get('count').textContent = `${result.slots.length} / 9`;
    const totals = get('totals'); totals.replaceChildren();
    for (const [name, value] of Object.entries(result.totals)) { const row = el('div', '', 'floral-total'); row.append(el('span', name), el('strong', `+${n(value)}${result.limited ? '*' : ''}`)); totals.append(row); }
    if (!result.slots.length) totals.append(el('p', t.noGuardians, 'floral-note'));
    get('limited').hidden = !result.limited;
    get('costs').replaceChildren(table(['Tier', t.powder, t.oil], Object.entries(result.costs).map(([tier, cost]) => [tier, n(cost.powder), n(cost.oil)])));
    const inventory: Record<string, number> = {};
    for (const sp of Object.values(state.spiritus)) { const label = `${sp.tier} · ${[sp.stat1, sp.stat2].filter(Boolean).map(s => names[s as Stat]).sort().join('/')} · ${t.level} ${sp.level}`; inventory[label] = (inventory[label] ?? 0) + 1; }
    get('inventory').replaceChildren(Object.keys(inventory).length ? table(['Spiritus', t.quantity], Object.entries(inventory).map(([label, count]) => [label, String(count)])) : el('p', t.noSpiritus, 'floral-note'));
    const skills = get('skills'); skills.replaceChildren();
    const list = el('div', '', 'floral-skill-grid');
    for (const r of result.slots) {
      const card = el('article', '', 'floral-skill'), heading = el('h3'); heading.append(icon(data.icons.flowerguards[r.fg.name]), el('span', displayName(r.fg.name))); card.append(heading);
      card.append(el('p', `${slots[r.id]} · ${r.fg.tier} · ${t.cultivation} ${r.placed.cultLv} · ${r.placed.starLevel}★`, 'floral-note'));
      for (const [s, stat] of [[r.primary, r.primaryStat], [r.secondary, r.secondaryStat]] as const) {
        card.append(el('p', `${s.name}: ${t.level} ${s.level} + ${s.bonus}★ → ${s.value === null ? '—' : '+' + n(s.value)}${s.tableLimited ? '*' : ''}`, 'floral-value'));
        card.append(el('p', `${names[stat]}: ${n(s.points)} ${t.points}${s.capped ? ' · ' + t.capped : ''}`, 'floral-note'));
      }
      card.append(el('p', `${t.connections}: ${r.directions.join(' · ')}`, 'floral-note')); list.append(card);
    }
    skills.append(result.slots.length ? list : el('p', t.noGuardians, 'floral-note'));
  }
  function persist(message = t.applied) {
    render();
    syncLibrary();
    try { localStorage.setItem(libraryKey, JSON.stringify(library)); get('status').textContent = `${message} ${t.stored}`; }
    catch { get('status').textContent = `${message} ${t.storageFail}`; }
  }
  function requirements() {
    const fg = data.flowerguards.find(f => f.name === select('name').value)!;
    const first = state.classType === 'magic' ? fg.spiritus1_magic : fg.spiritus1_physical;
    const second = state.classType === 'magic' ? fg.spiritus2_magic : fg.spiritus2_physical;
    get('requirements').textContent = `${names[first]} → ${fg.primary_stat}; ${names[second]} → ${fg.secondary_stat}. ${t.connections}: ${Object.keys(data.directionUnlockLevel).filter(d => Number(select('cult').value) >= data.directionUnlockLevel[d]).join(' · ')}`;
  }
  function secondaryOptions() {
    const old = select('stat2').value;
    select('stat2').replaceChildren(new Option(t.empty, ''), ...allowedStats[state.classType].filter(s => s !== select('stat1').value).map(s => new Option(names[s], s)));
    select('stat2').value = old !== select('stat1').value ? old : '';
  }
  root.querySelectorAll<HTMLButtonElement>('[data-cell]').forEach(btn => btn.addEventListener('click', () => {
    selected = btn.dataset.cell!; highlight();
    const isGuardian = data.flowerguardSlots.includes(selected);
    get('editor-title').textContent = `${slots[selected] ?? selected} · ${isGuardian ? t.guardian : 'Spiritus'}`;
    get<HTMLFieldSetElement>('guardian-fields').hidden = !isGuardian; get<HTMLFieldSetElement>('guardian-fields').disabled = !isGuardian;
    get<HTMLFieldSetElement>('spiritus-fields').hidden = isGuardian; get<HTMLFieldSetElement>('spiritus-fields').disabled = isGuardian;
    if (isGuardian) {
      const fg = state.flowerguard[selected]; select('name').value = fg?.name ?? data.flowerguards[0].name;
      root.querySelectorAll<HTMLInputElement>('input[name="floral-guardian"]').forEach(radio => { radio.checked = radio.value === select('name').value; });
      select('cult').value = String(fg?.cultLv ?? 1); select('stars').value = String(fg?.starLevel ?? 1); requirements();
    } else {
      const sp = state.spiritus[selected];
      select('stat1').replaceChildren(...allowedStats[state.classType].map(s => new Option(names[s], s)));
      select('stat1').value = sp?.stat1 ?? allowedStats[state.classType][0]; secondaryOptions(); select('stat2').value = sp?.stat2 ?? '';
      select('tier').value = sp?.tier ?? 'R1'; select('level').value = String(sp?.level ?? 0);
    }
    editor.showModal();
  }));
  select('name').addEventListener('change', requirements); select('cult').addEventListener('change', requirements);
  root.querySelectorAll<HTMLInputElement>('input[name="floral-guardian"]').forEach(radio => radio.addEventListener('change', () => { select('name').value = radio.value; requirements(); }));
  select('stat1').addEventListener('change', secondaryOptions);
  get('cancel').addEventListener('click', () => editor.close());
  get('remove').addEventListener('click', () => { delete state.flowerguard[selected]; delete state.spiritus[selected]; editor.close(); persist(); });
  get<HTMLFormElement>('edit-form').addEventListener('submit', event => {
    event.preventDefault();
    if (data.flowerguardSlots.includes(selected)) state.flowerguard[selected] = { name: select('name').value, cultLv: Number(select('cult').value), starLevel: Number(select('stars').value) };
    else state.spiritus[selected] = { stat1: select('stat1').value as Stat, stat2: select('stat2').value as Stat || null, tier: select('tier').value as Tier, level: Number(select('level').value) };
    state = parseGarden(state); editor.close(); persist();
  });
  root.querySelectorAll<HTMLInputElement>('input[name="floral-class"]').forEach(radio => radio.addEventListener('change', () => { state = switchClass(state, radio.value as ClassType); persist(t.classChanged); }));
  get('reset').addEventListener('click', () => confirm.showModal());
  get('keep').addEventListener('click', () => confirm.close());
  get('clear').addEventListener('click', () => { state = { ...emptyGarden(), classType: state.classType }; selected = ''; confirm.close(); persist(); });
  get('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = el('a'); anchor.href = url; anchor.download = 'forneus-florais.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const file = get<HTMLInputElement>('file'); get('import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const selectedFile = file.files?.[0]; if (!selectedFile) return;
    try { if (selectedFile.size > 100_000) throw new Error('Too large'); state = parseGarden(JSON.parse(await selectedFile.text())); selected = ''; persist(t.imported); }
    catch { get('status').textContent = t.invalid; }
    finally { file.value = ''; }
  });
  root.querySelector('a[href="#floral-guide"]')?.addEventListener('click', () => { get<HTMLDetailsElement>('guide').open = true; });
  select('priority').addEventListener('change', () => { clearSuggestion(); get<HTMLButtonElement>('recommend').disabled = false; });
  get('recommend').addEventListener('click', () => {
    clearSuggestion();
    const snapshot = structuredClone(state), target = select('priority').value;
    if (!target) return;
    get<HTMLButtonElement>('recommend').disabled = true; get('recommend-status').textContent = t.searching;
    const fail = () => { recommendationWorker?.terminate(); recommendationWorker = null; get<HTMLButtonElement>('recommend').disabled = false; get('recommend-status').textContent = t.recommendError; };
    try {
      recommendationWorker = new Worker(new URL('./florais-recommend.worker.ts', import.meta.url), { type: 'module' });
      recommendationWorker.onerror = fail;
      recommendationWorker.onmessage = event => {
        recommendationWorker?.terminate(); recommendationWorker = null; get<HTMLButtonElement>('recommend').disabled = false;
        if (event.data.error) { fail(); return; }
        const r = event.data.result;
        if (!r.improved) { get('recommend-status').textContent = t.noImprovement; return; }
        suggestion = parseGarden(r.garden);
        get('recommend-status').textContent = `${target}: ${n(r.before)} → ${n(r.after)} (+${n(r.after - r.before)})`;
        const before = calculateGarden(snapshot), after = calculateGarden(suggestion);
        const attrs = [...new Set([...Object.keys(before.totals), ...Object.keys(after.totals)])];
        get('comparison').replaceChildren(table([t.bonus, t.before, t.after], attrs.map(attr => [attr, `${n(before.totals[attr] ?? 0)}${before.limited ? '*' : ''}`, `${n(after.totals[attr] ?? 0)}${after.limited ? '*' : ''}`])));
        if (before.limited || after.limited) get('comparison').append(el('p', t.limited, 'floral-warning'));
        get('save-suggestion').hidden = false;
      };
      recommendationWorker.postMessage({ garden: snapshot, target });
    } catch { fail(); }
  });
  get('save-suggestion').addEventListener('click', () => {
    if (suggestion) addGarden(`${t.recommendation}: ${select('priority').value}`.slice(0, 60), suggestion);
  });
  select('gardens').addEventListener('change', () => {
    syncLibrary(); library.active = select('gardens').value;
    state = structuredClone(library.gardens.find(g => g.id === library.active)!.garden); selected = ''; persist();
  });
  const newDialog = get<HTMLDialogElement>('new-dialog'), shareDialog = get<HTMLDialogElement>('share-dialog');
  get('new').addEventListener('click', () => { get<HTMLInputElement>('new-name').value = `${t.garden} ${library.gardens.length + 1}`; newDialog.showModal(); });
  get('new-cancel').addEventListener('click', () => newDialog.close());
  get<HTMLFormElement>('new-form').addEventListener('submit', event => {
    event.preventDefault(); const name = get<HTMLInputElement>('new-name').value.trim(); if (!name) return;
    if (addGarden(name, emptyGarden())) newDialog.close();
  });
  get('share').addEventListener('click', () => {
    const url = new URL(location.href); url.search = ''; url.hash = `garden=${encodeGarden(state)}`;
    get<HTMLTextAreaElement>('share-url').value = url.href;
    get('local-link').hidden = !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    get('copy-status').textContent = ''; shareDialog.showModal();
  });
  get('share-close').addEventListener('click', () => shareDialog.close());
  get('copy').addEventListener('click', async () => {
    const field = get<HTMLTextAreaElement>('share-url');
    try { await navigator.clipboard.writeText(field.value); get('copy-status').textContent = t.copied; }
    catch { field.focus(); field.select(); get('copy-status').textContent = t.copyFallback; }
  });
  function receiveLink() {
    if (!location.hash.startsWith('#garden=')) return;
    try {
      const garden = decodeGarden(location.hash.slice(8));
      if (addGarden(t.sharedGarden, garden)) {
        history.replaceState(null, '', location.pathname + location.search);
        if (!get('status').textContent?.includes(t.storageFail)) get('status').textContent = `${t.sharedLoaded} ${t.stored}`;
      }
    } catch { get('status').textContent = t.invalid; }
  }
  render(); get('status').textContent = storageWarning || t.stored;
  receiveLink(); window.addEventListener('hashchange', receiveLink);
  refreshPlanner = initPlanner(get('planner-content'), locale, () => state, addGarden);
}
