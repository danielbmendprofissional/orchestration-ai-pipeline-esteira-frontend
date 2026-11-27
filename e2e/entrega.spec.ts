import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const ID = '019a0000-0000-7000-8000-0000000000e1';
const AGORA = '2026-11-27T10:00:00Z';

declare global {
  interface Window {
    __fontes: { onopen: (() => void) | null; onerror: (() => void) | null; ouvintes: Record<string, (e: { data: string }) => void> }[];
  }
}

const etapa = (nome: string, estado: string, extra: Partial<Esquemas['EtapaDto']> = {}): Esquemas['EtapaDto'] => ({
  etapa: nome, estado, codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: AGORA, ...extra,
});
const fluxo = (id: string, nome: string, etapas: Esquemas['EtapaDto'][]): Esquemas['FluxoDaEntregaDto'] => ({
  id, projeto: { id: 'p-' + id, nome }, tipoMudanca: 'feature', sha: '3f9c2ab', fatias: [{ codigo: 'E1b', comFlag: true }], etapas,
});
const entrega = (estado: string, fluxos: Esquemas['FluxoDaEntregaDto'][]): Esquemas['EntregaDto'] => ({
  id: ID, aplicacao: { id: 'a1', nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: AGORA, estado, vezDe: null, fluxos,
});

const CENARIOS: Record<string, Esquemas['EntregaDto']> = {
  'QA executando': entrega('em-andamento', [
    fluxo('f1', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'executando', { pipelineUrl: 'https://gitlab.exemplo.local/p/1' }), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')]),
    fluxo('f2', 'valuto-frontend', [etapa('abertura', 'concluido'), etapa('qa', 'nao-iniciado'), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')]),
  ]),
  'HML aguardando aprovação': entrega('aguardando-aprovacao', [
    fluxo('f1', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'concluido'), etapa('hml', 'aguardando-aprovacao'), etapa('prd', 'nao-iniciado')]),
  ]),
  'QA falhou': entrega('bloqueada-ou-falha', [
    fluxo('f1', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'falhou', { codigoFalha: 'pipeline.falhou' }), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')]),
  ]),
  'Atalho: QA e HML pulados': entrega('em-andamento', [
    fluxo('f1', 'valuto-api', [
      etapa('abertura', 'concluido'),
      etapa('qa', 'pulada', { pulada: { por: 'Carla <b>Mendes</b>', motivo: 'urgente' } }),
      etapa('hml', 'pulada', { pulada: { por: 'Carla <b>Mendes</b>', motivo: 'urgente' } }),
      etapa('prd', 'concluido'),
    ]),
  ]),
};

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

async function comEntrega(page: Page, flags: Record<string, boolean>, corpo: () => { status: number; json: unknown }) {
  const chamadas = { leituras: 0 };
  await comSessao(page);
  await comEventSourceFalso(page);
  await page.route('**/features.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(flags) }));
  await page.route(`**/api/v1/entregas/${ID}`, (r) => {
    chamadas.leituras++;
    const { status, json } = corpo();
    return r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
  });
  return chamadas;
}

/** `semToaster`: o `<ol>` do sonner (shared/ui, F0.5.3) tem filho que não é `<li>` e quebra a regra `list` quando há toast de erro; fora do escopo da E1b. */
const semViolacoes = async (page: Page, semToaster = false) => {
  const axe = new AxeBuilder({ page }).withTags(WCAG);
  if (semToaster) axe.exclude('[data-sonner-toaster]');
  expect((await axe.analyze()).violations).toEqual([]);
};

test.describe('@E1b Tela da Entrega', () => {
  for (const [nome, dados] of Object.entries(CENARIOS)) {
    test(`cenário "${nome}": faixa por Fluxo, ícone + texto e axe`, { tag: '@E1b' }, async ({ page }) => {
      await comEntrega(page, { E1b: true, T1: true }, () => ({ status: 200, json: dados }));
      await page.goto(`/entregas/${ID}`);

      await expect(page.getByTestId('estado-da-entrega')).toBeVisible();
      await expect(page.locator('est-fluxo-faixa')).toHaveCount(dados.fluxos.length);
      await expect(page.getByTestId('etapa')).toHaveCount(dados.fluxos.length * 4);
      for (const botao of await page.getByTestId('etapa').all()) {
        await expect(botao.locator('ng-icon')).toBeVisible();
        expect(((await botao.textContent()) ?? '').trim().length).toBeGreaterThan(4);
      }
      await expect(page.getByRole('button', { name: /aprovar|reprovar|atalho/i })).toHaveCount(0);
      await semViolacoes(page);

      await page.locator('[data-etapa="qa"]').first().click();
      await expect(page.getByTestId('etapa-painel')).toBeVisible();
      await semViolacoes(page);
    });
  }

  test('painel: nome acessível "QA: executando", link seguro, falha traduzida e texto escapado', { tag: '@E1b' }, async ({ page }) => {
    await comEntrega(page, { E1b: true }, () => ({ status: 200, json: CENARIOS['QA executando'] }));
    await page.goto(`/entregas/${ID}`);
    await page.getByRole('button', { name: /QA.*executando/i }).first().click();
    const link = page.getByTestId('pipeline-link');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toHaveAttribute('target', '_blank');

    await page.route(`**/api/v1/entregas/${ID}`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CENARIOS['Atalho: QA e HML pulados']) }));
    await page.reload();
    await page.locator('[data-etapa="qa"]').first().click();
    await expect(page.getByTestId('pulada')).toHaveText('Pulada por Carla <b>Mendes</b> — urgente');
    expect(await page.getByTestId('pulada').locator('b').count()).toBe(0);
  });

  test('evento entrega.atualizada recarrega uma vez e a Etapa muda; indicador Ao vivo', { tag: '@E1b' }, async ({ page }) => {
    let atual = CENARIOS['QA executando'];
    const chamadas = await comEntrega(page, { E1b: true, T1: true }, () => ({ status: 200, json: atual }));
    await page.goto(`/entregas/${ID}`);
    await expect(page.locator('[data-etapa="qa"]').first()).toContainText('Executando');
    await page.evaluate(() => window.__fontes[0].onopen?.());
    await expect(page.getByTestId('tempo-real')).toHaveText('Ao vivo');

    atual = CENARIOS['QA falhou'];
    const antes = chamadas.leituras;
    await page.evaluate(
      (id) => window.__fontes[0].ouvintes['entrega.atualizada']({ data: JSON.stringify({ tipo: 'entrega.atualizada', aplicacaoId: 'a1', entregaId: id, fluxoId: 'f1', etapa: 'qa', estado: 'falhou' }) }),
      ID,
    );
    await expect(page.locator('[data-etapa="qa"]').first()).toContainText('Falhou');
    expect(chamadas.leituras).toBe(antes + 1);
    await semViolacoes(page);
  });

  test('404 mostra "Entrega não encontrada ou sem acesso" e erro mostra "Tentar de novo", com axe', { tag: '@E1b' }, async ({ page }) => {
    let corpo = { status: 404, json: { errors: [{ code: 'entrega.nao-encontrada', message: 'x', type: 'NotFound' }] } as unknown };
    await comEntrega(page, { E1b: true }, () => corpo);
    await page.goto(`/entregas/${ID}`);
    await expect(page.getByTestId('nao-encontrada')).toContainText('Entrega não encontrada ou sem acesso');
    await semViolacoes(page, true);

    corpo = { status: 500, json: { errors: [{ code: 'erro.interno', message: 'x', type: 'Failure' }] } };
    await page.reload();
    await expect(page.getByTestId('tentar-de-novo')).toBeVisible();
    await semViolacoes(page, true);
  });

  test('Features:E1b desligado cai em Não encontrado; "ver na auditoria" só com Features:X1', { tag: '@E1b' }, async ({ page }) => {
    await comEntrega(page, {}, () => ({ status: 200, json: CENARIOS['QA executando'] }));
    await page.goto(`/entregas/${ID}`);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();

    await page.unroute('**/features.json');
    await page.route('**/features.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ E1b: true }) }));
    await page.goto(`/entregas/${ID}`);
    await expect(page.getByTestId('cabecalho')).toBeVisible();
    await expect(page.getByTestId('ver-na-auditoria')).toHaveCount(0);

    await page.unroute('**/features.json');
    await page.route('**/features.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ E1b: true, X1: true }) }));
    await page.goto(`/entregas/${ID}`);
    await expect(page.getByTestId('ver-na-auditoria')).toBeVisible();
  });

  test('layout vertical em 320 px e horizontal em 1280 px, sem rolagem lateral', { tag: '@E1b' }, async ({ page }) => {
    await comEntrega(page, { E1b: true }, () => ({ status: 200, json: CENARIOS['QA executando'] }));
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/entregas/${ID}`);
    const [a, b] = await Promise.all([page.locator('[data-etapa="abertura"]').first().boundingBox(), page.locator('[data-etapa="qa"]').first().boundingBox()]);
    expect(b!.y).toBeGreaterThan(a!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await semViolacoes(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    const [c, d] = await Promise.all([page.locator('[data-etapa="abertura"]').first().boundingBox(), page.locator('[data-etapa="qa"]').first().boundingBox()]);
    expect(d!.x).toBeGreaterThan(c!.x);
  });
});
