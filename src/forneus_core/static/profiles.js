'use strict';
const PROFILE_KEY = 'forneus-profiles-v1';
const MAX_PROFILES = 50;
const MAX_CATPALS = 18;
const catalog = window.CATPAL_CATALOG;
const typeNames = window.CATPAL_NAMES;
const profileSelect = document.querySelector('#profile-select');
const profileName = document.querySelector('#profile-name');
const catpalList = document.querySelector('#catpal-list');
const profileCount = document.querySelector('#profile-count');
const profileStatus = document.querySelector('#profile-status');
const profileError = document.querySelector('#profile-error');
const comparison = document.querySelector('#comparison');
const newJelly = document.querySelector('#new-jelly');
let profiles = loadProfiles();
let selectedId = '';

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function loadProfiles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PROFILES) : [];
  } catch { return []; }
}
function persist() { localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles)); }
function setError(message) { profileError.textContent = message; profileError.hidden = !message; }
function clearComparison() { comparison.hidden = true; comparison.replaceChildren(); }
function option(value, label) {
  const node = document.createElement('option'); node.value = value; node.textContent = label; return node;
}
function currentDraft() {
  return {
    id: selectedId || id(), name: profileName.value.trim(),
    catpals: [...catpalList.querySelectorAll('.catpal-row')].map(row => ({
      id: row.dataset.id, name: row.querySelector('.catpal-name').value.trim(),
      catpal_type: row.querySelector('.catpal-type').value,
      current_level: parseLevel(row.querySelector('.catpal-level').value),
    })),
  };
}
function parseLevel(value) { return value === 'Max' ? 'Max' : Number(value); }
function refreshSelect() {
  profileSelect.replaceChildren(option('', 'Novo perfil'));
  for (const profile of profiles) profileSelect.append(option(profile.id, profile.name));
  profileSelect.value = selectedId;
}
function updateCount() {
  const count = catpalList.querySelectorAll('.catpal-row').length;
  profileCount.textContent = count;
  document.querySelector('#add-catpal').disabled = count >= MAX_CATPALS;
  const empty = catpalList.querySelector('.profile-empty');
  if (empty) empty.hidden = count > 0;
}
function setLevels(select, type, selected) {
  select.replaceChildren(...catalog[type].map(level => option(level, level)));
  select.value = String(selected);
  if (!select.value) select.value = String(catalog[type][0]);
}
function addCatpal(catpal = {}) {
  if (catpalList.querySelectorAll('.catpal-row').length >= MAX_CATPALS) return;
  const row = document.createElement('div'); row.className = 'catpal-row'; row.dataset.id = catpal.id || id();
  const name = document.createElement('input'); name.className = 'catpal-name'; name.maxLength = 40; name.placeholder = 'Nome opcional'; name.value = catpal.name || ''; name.setAttribute('aria-label', 'Nome do catpal');
  const type = document.createElement('select'); type.className = 'catpal-type'; type.setAttribute('aria-label', 'Categoria do catpal');
  for (const key of Object.keys(catalog)) type.append(option(key, typeNames[key]));
  type.value = catpal.catpal_type && catalog[catpal.catpal_type] ? catpal.catpal_type : Object.keys(catalog)[0];
  const level = document.createElement('select'); level.className = 'catpal-level'; level.setAttribute('aria-label', 'Nível atual');
  setLevels(level, type.value, catpal.current_level ?? catalog[type.value][0]);
  type.addEventListener('change', () => { setLevels(level, type.value, catalog[type.value][0]); clearComparison(); });
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-catpal'; remove.textContent = 'Remover';
  remove.addEventListener('click', () => { row.remove(); updateCount(); clearComparison(); });
  for (const control of [name, level]) control.addEventListener('input', clearComparison);
  row.append(name, type, level, remove); catpalList.append(row); updateCount(); clearComparison();
}
function renderProfile(profile) {
  profileName.value = profile?.name || '';
  catpalList.replaceChildren();
  const empty = document.createElement('p'); empty.className = 'help profile-empty'; empty.textContent = 'Adicione cada catpal da equipe e informe seu nível atual.'; catpalList.append(empty);
  for (const catpal of profile?.catpals || []) addCatpal(catpal);
  updateCount(); clearComparison(); setError('');
}
function newProfile() { selectedId = ''; refreshSelect(); renderProfile(null); profileStatus.textContent = 'Novo perfil.'; }
function selectProfile(value) {
  selectedId = value;
  renderProfile(profiles.find(profile => profile.id === value));
  profileStatus.textContent = value ? 'Perfil carregado.' : 'Novo perfil.';
}
function saveProfile() {
  const draft = currentDraft();
  if (!draft.name) return setError('Informe um nome para o perfil.');
  if (!draft.catpals.length) return setError('Adicione pelo menos um catpal.');
  const duplicate = profiles.find(profile => profile.name.toLocaleLowerCase('pt-BR') === draft.name.toLocaleLowerCase('pt-BR') && profile.id !== draft.id);
  if (duplicate) return setError('Já existe um perfil com esse nome.');
  const index = profiles.findIndex(profile => profile.id === draft.id);
  if (index < 0) {
    if (profiles.length >= MAX_PROFILES) return setError(`Limite de ${MAX_PROFILES} perfis atingido.`);
    profiles.push(draft);
  } else profiles[index] = draft;
  selectedId = draft.id; persist(); refreshSelect(); setError(''); profileStatus.textContent = 'Perfil salvo neste navegador.';
}
function deleteProfile() {
  if (!selectedId) return setError('Selecione um perfil salvo para excluir.');
  profiles = profiles.filter(profile => profile.id !== selectedId); persist(); newProfile(); profileStatus.textContent = 'Perfil excluído.';
}
function download(content, filename) {
  const url = URL.createObjectURL(new Blob([content], {type: 'application/json;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function backupProfiles() {
  download(JSON.stringify({schema_version: 1, profiles}, null, 2) + '\n', 'catpal-perfis.json');
  profileStatus.textContent = 'Backup gerado.';
}
function importProfiles(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.schema_version !== 1 || !Array.isArray(data.profiles) || data.profiles.length > MAX_PROFILES) throw new Error();
      for (const profile of data.profiles) {
        if (!profile || typeof profile.id !== 'string' || typeof profile.name !== 'string' || !Array.isArray(profile.catpals) || profile.catpals.length > MAX_CATPALS) throw new Error();
      }
      profiles = data.profiles; persist(); newProfile(); refreshSelect(); setError(''); profileStatus.textContent = `${profiles.length} perfil(is) importado(s).`;
    } catch { setError('Backup inválido ou incompatível.'); }
  };
  reader.onerror = () => setError('Não foi possível ler o backup.');
  reader.readAsText(file, 'utf-8');
}
function node(tag, text, className) {
  const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element;
}
function formatPower(value) { return new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1}).format(value); }
function scenarioCard(title, scenario, recommended) {
  const card = node('section', undefined, `scenario${recommended ? ' recommended' : ''}`);
  const heading = node('h3', title); if (recommended) heading.append(node('span', 'Recomendado', 'badge')); card.append(heading);
  const metrics = node('dl', undefined, 'scenario-metrics');
  for (const [label, value] of [['Poder efetivo', formatPower(scenario.total_effective_power)], ['Jelly restante', formatPower(scenario.jelly_leftover)]]) {
    const wrap = node('div'); wrap.append(node('dt', label), node('dd', value)); metrics.append(wrap);
  }
  card.append(metrics);
  if (!scenario.changes.length) card.append(node('p', 'Nenhuma mudança necessária.', 'help'));
  else {
    const list = node('ul', undefined, 'change-list');
    for (const change of scenario.changes) {
      const direction = change.jelly_change < 0 ? `devolve ${formatPower(-change.jelly_change)}` : `usa ${formatPower(change.jelly_change)}`;
      list.append(node('li', `${change.name || change.display_name}: nível ${change.from_level} → ${change.to_level} (${direction} Jelly)`));
    }
    card.append(list);
  }
  return card;
}
async function calculateProfile() {
  setError(''); clearComparison();
  const draft = currentDraft();
  if (!draft.catpals.length) return setError('Adicione pelo menos um catpal ao perfil.');
  const jelly = Number(newJelly.value);
  const button = document.querySelector('#profile-calculate'); button.disabled = true; button.textContent = 'Comparando…';
  try {
    const response = await fetch('/api/profile-optimize', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({profile: draft, new_jelly: jelly})});
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível comparar.');
    const intro = node('div', undefined, 'comparison-intro');
    intro.append(node('strong', `Investido atualmente: ${formatPower(data.current.invested_jelly)} Jelly`), node('p', 'O reset devolve 100% da Fish Jelly. Silverleaf e Dried Fish não são considerados.'));
    comparison.append(intro,
      scenarioCard('Manter níveis atuais', data.keep, data.recommendation === 'keep'),
      scenarioCard('Resetar e redistribuir', data.redistribute, data.recommendation === 'redistribute'));
    comparison.hidden = false; profileStatus.textContent = data.recommendation === 'redistribute' ? 'Há uma redistribuição com mais poder efetivo.' : 'Não há ganho de poder ao resetar nesta situação.';
  } catch (exception) { setError(exception instanceof TypeError ? 'Não foi possível conectar ao servidor.' : exception.message); }
  finally { button.disabled = false; button.textContent = 'Comparar cenários'; }
}

document.querySelector('#add-catpal').addEventListener('click', () => addCatpal());
document.querySelector('#new-profile').addEventListener('click', newProfile);
document.querySelector('#save-profile').addEventListener('click', saveProfile);
document.querySelector('#delete-profile').addEventListener('click', deleteProfile);
document.querySelector('#backup-profiles').addEventListener('click', backupProfiles);
document.querySelector('#import-profiles').addEventListener('click', () => document.querySelector('#profile-import-file').click());
document.querySelector('#profile-import-file').addEventListener('change', event => { if (event.target.files[0]) importProfiles(event.target.files[0]); event.target.value = ''; });
document.querySelector('#profile-calculate').addEventListener('click', calculateProfile);
profileSelect.addEventListener('change', event => selectProfile(event.target.value));
profileName.addEventListener('input', clearComparison); newJelly.addEventListener('input', clearComparison);
refreshSelect(); newProfile();
