/**
 * The exporters are what leave the site with the user, so their shape matters
 * as much as the numbers: a spreadsheet that silently merges two columns is a
 * wrong answer that looks right.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { solve } from '../src/lib/solver/index.ts';
import { formatCsv, formatJson } from '../src/lib/exports.ts';

const options = {
  locale: 'pt-BR',
  translate: (key: string, params: Record<string, string | number> = {}) =>
    key === 'notice.amigatos.provisional_tier'
      ? `${params.display_name} usa dados do tier ${params.captured}/${params.max}.`
      : key,
};

const result = solve({ RedR2: 1, RedR1: 1, GoldR2: 4, GoldR1: 5, Purple: 5 }, 43671);

describe('CSV', () => {
  const text = formatCsv(result, options);
  const lines = text.replace(/^﻿/, '').trim().split('\r\n');
  const header = lines[0].split(';');

  it('abre no Excel pt-BR: BOM, ponto e vírgula', () => {
    assert.ok(text.startsWith('﻿'), 'sem BOM');
    assert.ok(header.length > 5, 'cabeçalho não separou por ;');
  });

  it('não colapsa colunas de mesmo nome', () => {
    assert.ok(header.includes('raw_power') && header.includes('total_raw_power'));
    assert.equal(new Set(header).size, header.length, 'há cabeçalhos duplicados');
  });

  it('traz uma linha de resumo e uma por amigato', () => {
    assert.equal(lines.length, 1 + 1 + result.rows.length);
    assert.equal(lines[1].split(';')[0], 'summary');
    assert.equal(lines[2].split(';')[0], 'row');
  });

  it('usa vírgula decimal em pt-BR e ponto em en-US', () => {
    const ptBR = formatCsv(result, options);
    const enUS = formatCsv(result, { ...options, locale: 'en-US' });
    assert.ok(ptBR.includes('466146'), 'totais ausentes');
    assert.notEqual(ptBR, enUS, 'o locale não mudou nada');
  });

  it('escapa um valor que contenha o separador', () => {
    const tricky = formatCsv(result, {
      ...options,
      translate: () => 'texto; com ponto e virgula e "aspas"',
    });
    const [head, summary] = tricky.replace(/^\ufeff/, '').split('\r\n');

    // Sem escape, o ';' dentro da mensagem criaria colunas fantasma e
    // desalinharia a planilha inteira dali em diante.
    assert.ok(summary.split(';').length > head.split(';').length,
      'o ; do texto deveria estar dentro de um campo entre aspas');
    assert.ok(summary.includes('""aspas""'), 'aspas internas nao foram dobradas');
    assert.match(summary, /;"texto; /, 'o campo nao foi envolvido em aspas');
  });
});

describe('JSON', () => {
  const document = JSON.parse(formatJson(result, options));

  it('preserva o resultado e a procedência', () => {
    assert.equal(document.schema_version, 2);
    assert.deepEqual(document.totals, result.totals);
    assert.equal(document.rows.length, result.rows.length);
    assert.deepEqual(document.meta.data_tiers.RedR2, [4, 6]);
  });

  it('carrega os avisos já resolvidos', () => {
    assert.ok(document.messages.some((m: string) => m.includes('tier 4/6')));
  });
});
