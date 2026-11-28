import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const ID = '019a0000-0000-7000-8000-0000000000e5';
const AGORA = '2026-11-28T10:00:00Z';
const ANALISE = '019a0000-0000-7000-8000-00000000a001';

declare global {
  interface Window {
    __fontes: { onopen: (() => void) | null; ouvintes: Record<string, (e: { data: string }) => void> }[];
  }
}

const etapa = (nome: string, estado: string): Esquemas['EtapaDto'] => ({ etapa: nome, estado, codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: AGORA });
const ENTREGA: Esquemas['EntregaDto'] = {
  id: ID, aplicacao: { id: 'a1', nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: AGORA, estado: 'bloqueada-ou-falha', vezDe: null,
  fluxos: [{ id: 'f1', projeto: { id: 'p1', nome: 'valuto-api' }, tipoMudanca: 'feature', sha: '3f9c2ab', fatias: [{ codigo: 'E2', comFlag: true }], etapas: [etapa('abertura', 'concluido'), etapa('qa', 'concluido'), etapa('hml', 'bloqueada'), etapa('prd', 'nao-iniciado')] }],
};
const contagem = { critica: 1, alta: 1, media: 0, baixa: 0, info: 0 };
const analise = (id: string, escopo: string, fonte: string, destino: string | null): Esquemas['AnaliseDaEtapaDto'] => ({
  id, escopo, fonte, tipo: fonte.startsWith('agent') ? 'agente' : 'ferramenta', veredito: 'reprovado', destino, custoUsd: fonte.startsWith('agent') ? 0.31 : null, recebidaEm: AGORA, contagem,
});
const ANALISES: Esquemas['AnalisesDaEtapaDto'] = {
  gate: { momento: 'gate', decisao: 'bloqueado', motivo: 'gate.politica-violada', contagem: { critica: 1, alta: 1, media: 0, baixa: 0 }, decididaEm: AGORA },
  analises: [analise(ANALISE, 'artefato', 'opengrep', null), analise('a2', 'artefato', 'agent-security', null), analise('a3', 'deploy', 'zap', 'k8s-hml-a'), analise('a4', 'deploy', 'smoke', 'k8s-hml-b')],
};
const achado = (n: number, over: Partial<Esquemas['AchadoDto']> = {}): Esquemas['AchadoDto'] => ({
  severidade: 'critica', titulo: `Achado ${n}`, regraId: `R-${n}`, arquivo: `src/a${n}.cs`, linha: n, descricao: `Descrição ${n}`, ...over,
});

const semViolacoes = async (page: Page) => {
  expect((await new AxeBuilder({ page }).withTags(WCAG).exclude('[data-sonner-toaster]').analyze()).violations).toEqual([]);
};

async function preparar(page: Page, flags: Record<string, boolean>, analises: () => { status: number; json: unknown } = () => ({ status: 200, json: ANALISES })) {
  const chamadas = { analises: 0, achados: [] as string[] };
  await comSessao(page);
  await page.addInitScript(() => {
    window.__fontes = [];
    class Falso {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      ouvintes: Record<string, (e: { data: string }) => void> = {};
      constructor() { window.__fontes.push(this); }
      addEventListener(tipo: string, f: (e: { data: string }) => void) { this.ouvintes[tipo] = f; }
      close() {}
    }
    (window as unknown as { EventSource: unknown }).EventSource = Falso;
  });
  await page.route('**/features.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(flags) }));
  await page.route(`**/api/v1/entregas/${ID}`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ENTREGA) }));
  await page.route(`**/api/v1/entregas/${ID}/fluxos/f1/etapas/hml/analises`, (r) => {
    chamadas.analises++;
    const { status, json } = analises();
    return r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
  });
  await page.route(`**/api/v1/entregas/${ID}/fluxos/f1/analises/${ANALISE}/achados*`, (r) => {
    const url = new URL(r.request().url());
    const severidade = url.searchParams.get('severidade');
    const pagina = Number(r.request().headers()['x-page'] ?? 1);
    chamadas.achados.push(`${severidade ?? 'todas'}:${pagina}`);
    const itens = severidade === 'alta' ? [achado(9, { severidade: 'alta' })] : [achado(pagina * 10, { titulo: '<script>window.__xss=1</script>', descricao: '<img src=x onerror="window.__xss=1">' }), achado(pagina * 10 + 1)];
    return r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(itens),
      headers: { 'X-Total-Count': severidade === 'alta' ? '1' : '30', 'X-Total-Pages': severidade === 'alta' ? '1' : '2', 'X-Page': String(pagina), 'X-Page-Size': '20' },
    });
  });
  return chamadas;
}

const abrirHml = async (page: Page) => {
  await page.goto(`/entregas/${ID}`);
  await page.locator('[data-etapa="hml"]').first().click();
  await expect(page.getByTestId('etapa-painel')).toBeVisible();
};

test.describe('@E2 Painel da Etapa: Análises e Achados', () => {
  test('Etapa bloqueada: pill, contadores, linha do gate, Do Artefato e Do Deploy por Destino, com axe', { tag: '@E2' }, async ({ page }) => {
    await preparar(page, { E1b: true, E2: true });
    await page.goto(`/entregas/${ID}`);
    await expect(page.locator('[data-etapa="hml"]').first()).toContainText('Bloqueada');
    await expect(page.locator('[data-etapa="hml"]').first().locator('ng-icon')).toBeVisible();
    await page.locator('[data-etapa="hml"]').first().click();

    await expect(page.getByTestId('contador')).toHaveCount(4);
    await expect(page.getByTestId('gate')).toContainText('Gate de segurança');
    await expect(page.getByTestId('gate')).toContainText('Bloqueou: 1 crítica · 1 alta');
    await semViolacoes(page);

    await page.getByRole('tab', { name: 'Análises' }).click();
    await expect(page.getByTestId('coluna-artefato')).toContainText('opengrep');
    await expect(page.getByTestId('coluna-artefato')).toContainText('US$ 0,31');
    await expect(page.getByTestId('coluna-deploy')).toContainText('k8s-hml-a');
    await expect(page.getByTestId('coluna-deploy')).toContainText('k8s-hml-b');
    await expect(page.getByRole('button', { name: /exceção|aprovar|atalho/i })).toHaveCount(0);
    await semViolacoes(page);
  });

  test('Achados: lista paginada, filtro por severidade, arquivo:linha e texto de terceiro como texto, com axe', { tag: '@E2' }, async ({ page }) => {
    const chamadas = await preparar(page, { E1b: true, E2: true });
    await abrirHml(page);
    await page.getByRole('tab', { name: 'Análises' }).click();
    await page.getByTestId('coluna-artefato').getByRole('button', { name: /opengrep/ }).click();

    await expect(page.getByTestId('achado')).toHaveCount(2);
    await expect(page.getByTestId('achado').first()).toContainText('<script>window.__xss=1</script>');
    await expect(page.getByTestId('achado').nth(1)).toContainText('src/a11.cs:11');
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await page.getByTestId('achado').first().locator('script, img').count()).toBe(0);
    await expect(page.getByTestId('pagina')).toContainText('Página 1 de 2');
    await semViolacoes(page);

    await page.getByTestId('pagina-proxima').click();
    await expect(page.getByTestId('pagina')).toContainText('Página 2 de 2');
    await page.getByRole('button', { name: 'Alta', exact: true }).click();
    await expect(page.getByTestId('achado')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Alta', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(chamadas.achados).toEqual(['todas:1', 'todas:2', 'alta:1']);
    await semViolacoes(page);
  });

  test('estado vazio e erro com "Tentar de novo", com axe', { tag: '@E2' }, async ({ page }) => {
    let resposta: { status: number; json: unknown } = { status: 200, json: { gate: null, analises: [] } };
    await preparar(page, { E1b: true, E2: true }, () => resposta);
    await abrirHml(page);
    await page.getByRole('tab', { name: 'Análises' }).click();
    await expect(page.getByTestId('vazio')).toContainText('Nenhuma Análise recebida ainda');
    await semViolacoes(page);

    resposta = { status: 500, json: { errors: [{ code: 'erro.interno', message: 'x', type: 'Failure' }] } };
    await page.reload();
    await page.locator('[data-etapa="hml"]').first().click();
    await page.getByRole('tab', { name: 'Análises' }).click();
    await expect(page.getByTestId('tentar-de-novo')).toBeVisible();
    await semViolacoes(page);

    resposta = { status: 200, json: ANALISES };
    await page.getByTestId('tentar-de-novo').click();
    await expect(page.getByTestId('coluna-artefato')).toContainText('opengrep');
  });

  test('entrega.atualizada recarrega as Análises sem a pessoa apertar nada', { tag: '@E2' }, async ({ page }) => {
    let atual = ANALISES;
    const chamadas = await preparar(page, { E1b: true, E2: true, T1: true }, () => ({ status: 200, json: atual }));
    await abrirHml(page);
    await page.evaluate(() => window.__fontes[0].onopen?.());
    await expect(page.getByTestId('gate')).toContainText('Bloqueou');
    const antes = chamadas.analises;

    atual = { ...ANALISES, gate: { ...ANALISES.gate!, decisao: 'liberado', motivo: null } };
    await page.evaluate(
      (id) => window.__fontes[0].ouvintes['entrega.atualizada']({ data: JSON.stringify({ tipo: 'entrega.atualizada', aplicacaoId: 'a1', entregaId: id, fluxoId: 'f1', etapa: 'hml', estado: 'bloqueada' }) }),
      ID,
    );
    await expect(page.getByTestId('gate')).toContainText('Liberado');
    expect(chamadas.analises).toBe(antes + 1);
  });

  test('Features:E2 desligada: a Etapa abre sem abas e sem chamar a API de Análises', { tag: '@E2' }, async ({ page }) => {
    const chamadas = await preparar(page, { E1b: true });
    await abrirHml(page);
    await expect(page.getByRole('tab')).toHaveCount(0);
    expect(chamadas.analises).toBe(0);
  });
});
