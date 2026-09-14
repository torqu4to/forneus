'use strict';
const form = document.querySelector('#optimizer-form');
const button = document.querySelector('#calculate');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const result = document.querySelector('#result');
const empty = document.querySelector('#empty');
const formatter = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1});
let busy = false;
let downloads = null;
const exportButtons = document.querySelectorAll('.exports button');

function clearDownloads() {
  downloads = null;
  for (const control of exportButtons) control.disabled = true;
}

for (const format of ['csv', 'json']) {
  document.querySelector(`#export-${format}`).addEventListener('click', () => {
    if (busy || !downloads) return;
    let url;
    const link = document.createElement('a');
    try {
      url = URL.createObjectURL(new Blob([downloads[format]], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
      }));
      link.href = url;
      link.download = `catpal-distribuicao.${format}`;
      document.body.append(link);
      link.click();
    } catch {
      error.textContent = 'Não foi possível iniciar o download. Tente novamente.';
      error.hidden = false;
    } finally {
      link.remove();
      // Give the browser time to consume the Blob before releasing it.
      if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  });
}

form.addEventListener('input', () => {
  clearDownloads();
  result.hidden = true;
  empty.hidden = false;
  error.hidden = true;
  status.textContent = 'Equipe alterada. Calcule para atualizar a distribuição.';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  const fields = Object.fromEntries(new FormData(form));
  const counts = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key !== 'total_jelly') counts[key] = Number(value);
  }
  busy = true;
  clearDownloads();
  for (const input of form.querySelectorAll('input')) input.disabled = true;
  button.disabled = true;
  button.textContent = 'Calculando…';
  result.hidden = true;
  empty.hidden = true;
  error.hidden = true;
  status.textContent = 'Comparando as combinações de níveis…';
  result.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/optimize', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({counts, total_jelly: Number(fields.total_jelly)}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível calcular. Tente novamente.');
    document.querySelector('#power').textContent = formatter.format(data.totals.effective_power);
    document.querySelector('#spent').textContent = formatter.format(data.totals.spent);
    document.querySelector('#leftover').textContent = formatter.format(data.totals.leftover);
    const rows = document.querySelector('#allocations');
    rows.replaceChildren();
    for (const allocation of data.rows) {
      const row = document.createElement('tr');
      for (const value of [allocation.display_name, allocation.level, formatter.format(allocation.cost), formatter.format(allocation.effective_power)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      rows.append(row);
    }
    downloads = data.exports;
    for (const control of exportButtons) control.disabled = false;
    result.hidden = false;
    status.textContent = data.rows.length ? 'Cálculo concluído para a equipe informada.' : 'Nenhum catpal informado. Toda a Jelly continua disponível.';
  } catch (exception) {
    status.textContent = 'Cálculo não concluído.';
    error.textContent = exception instanceof TypeError || exception instanceof SyntaxError
      ? 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.'
      : exception.message;
    error.hidden = false;
  } finally {
    busy = false;
    for (const input of form.querySelectorAll('input')) input.disabled = false;
    button.disabled = false;
    button.textContent = 'Calcular distribuição';
    result.setAttribute('aria-busy', 'false');
  }
});
