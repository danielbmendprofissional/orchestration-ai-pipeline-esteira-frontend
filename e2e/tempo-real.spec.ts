import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const VALUTO = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT' };

declare global {
  interface Window {
    __fontes: { onopen: (() => void) | null; onerror: (() => void) | null; ouvintes: Record<string, (e: { data: string }) => void> }[];
  }
}

/** EventSource falso: o teste abre, derruba e emite eventos pelo `window.__fontes`. */
async function comEventSourceFalso(page: Page) {
  await page.addInitScript(() => {
    window.__fontes = [];
    class Falso {
      readyState = 0;
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      ouvintes: Record<string, (e: { data: string }) => void> = {};
      constructor() {
        window.__fontes.push(this);
      }
      addEventListener(tipo: string, f: (e: { data: string }) => void) {
        this.ouvintes[tipo] = f;
      }
      close() {
        this.readyState = 2;
      }
    }
    (window as unknown as { EventSource: unknown }).EventSource = Falso;
  });
}

async function comPainel(page: Page, flagT1: boolean) {
  const chamadas = { listagens: 0 };
  const geradoEm = new Date().toISOString();
  await page.route('**/features.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ A1: true, P1: true, T1: flagT1 }) }));
  await page.route('**/api/v1/fatias**', (r) => {
    chamadas.listagens++;
    const corpo: Esquemas['PainelListaDto'] = {
      itens: [{
        aplicacaoId: VALUTO.id, aplicacao: VALUTO.nome, sigla: VALUTO.sigla, codigo: 'T1', titulo: 'Tempo real', estado: 'em-execucao',
        progresso: '2/7 tasks', emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true,
        repositorios: ['api'], specDisponivel: true,
      }],
      pagina: 1, tamanhoPagina: 20, total: 1, totalPaginas: 1, avisos: [],
      aplicacoes: [{ ...VALUTO, geradoEm, desatualizado: false }], geradoEm, desatualizado: false,
    };
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Page': '1', 'X-Page-Size': '20' }, body: JSON.stringify(corpo) });
  });
  return chamadas;
}

const semViolacoes = async (page: Page) => expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

test.describe('@T1 Painel de Fatias: tempo real', () => {
  test('Ao vivo, evento recarrega a lista, queda vira Reconectando…, com axe', { tag: '@T1' }, async ({ page }) => {
    await comSessao(page);
    await comEventSourceFalso(page);
    const chamadas = await comPainel(page, true);

    await page.goto('/fatias');
    const indicador = page.getByTestId('tempo-real');
    await expect(page.getByTestId('fatia-linha')).toHaveCount(1);
    await page.evaluate(() => window.__fontes[0].onopen?.());
    await expect(indicador).toHaveText('Ao vivo');
    await expect(indicador).toHaveAttribute('aria-live', 'polite');
    await semViolacoes(page);

    const antes = chamadas.listagens;
    await page.evaluate((id) => window.__fontes[0].ouvintes['fatias.mudaram']({ data: JSON.stringify({ tipo: 'fatias.mudaram', aplicacaoId: id }) }), VALUTO.id);
    await expect.poll(() => chamadas.listagens).toBe(antes + 1);

    await page.evaluate(() => window.__fontes[0].onerror?.());
    await expect(indicador).toHaveText('Reconectando…');
    await expect(page.getByTestId('atualizar')).toBeEnabled();
    await semViolacoes(page);
  });

  test('flag Features:T1 desligado: sem indicador e sem EventSource', { tag: '@T1' }, async ({ page }) => {
    await comSessao(page);
    await comEventSourceFalso(page);
    await comPainel(page, false);

    await page.goto('/fatias');
    await expect(page.getByTestId('fatia-linha')).toHaveCount(1);
    await expect(page.getByTestId('tempo-real')).toHaveCount(0);
    expect(await page.evaluate(() => window.__fontes.length)).toBe(0);
  });
});
