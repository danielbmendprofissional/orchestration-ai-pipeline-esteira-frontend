import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { SEM_PAPEL, comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const VALUTO = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT' };
const PORTAL = { id: '019a0000-0000-7000-8000-000000000002', nome: 'Portal do Cliente', sigla: 'PCL' };
const ESTADOS = ['planejada', 'com-spec', 'em-execucao', 'em-revisao', 'pronta-para-entrega'];
const REPOSITORIOS = [['api'], ['frontend'], ['api', 'frontend']];

const json = (rota: Route, status: number, corpo?: unknown, headers: Record<string, string> = {}) =>
  rota.fulfill({ status, contentType: 'application/json', headers, body: corpo === undefined ? '' : JSON.stringify(corpo) });

/** 300 Fatias geradas em código, alternando as Aplicações dadas; código único por Aplicação. */
function gerarFatias(aplicacoes: { id: string; nome: string; sigla: string }[], total: number): Esquemas['FatiaDoPainelDto'][] {
  return Array.from({ length: total }, (_, i) => {
    const app = aplicacoes[i % aplicacoes.length];
    const n = Math.floor(i / aplicacoes.length);
    const estado = ESTADOS[n % ESTADOS.length];
    const codigo = `F${n + 1}`;
    return {
      aplicacaoId: app.id, aplicacao: app.nome, sigla: app.sigla, codigo,
      titulo: `Titulo ${codigo} de ${app.nome}`, estado,
      progresso: estado === 'em-execucao' ? '2/7 tasks' : null, emCorrecao: false, formatoAnterior: false,
      risco: 'medio', status: estado === 'planejada' ? 'planejada' : 'aprovada', statusReconhecido: true,
      repositorios: REPOSITORIOS[n % REPOSITORIOS.length], specDisponivel: estado !== 'planejada',
    };
  });
}

function gaveta(f: Esquemas['FatiaDoPainelDto']): Esquemas['GavetaDto'] {
  const base = `https://gitlab.exemplo.local/${f.sigla.toLowerCase()}`;
  return {
    aplicacaoId: f.aplicacaoId, codigo: f.codigo, titulo: f.titulo, estado: f.estado, progresso: f.progresso,
    emCorrecao: false, formatoAnterior: false,
    spec: { disponivel: true, caminho: `specs/feature/${f.codigo}.md`, link: `${base}/workspace/-/blob/main/specs/${f.codigo}.md`, risco: 'medio', formatoAnterior: false },
    mae: { numero: 100, titulo: `${f.codigo} — ${f.titulo}`, estado: 'opened', link: `${base}/workspace/-/issues/100` },
    filhas: [{ numero: 101, titulo: 'Task 1', estado: 'closed', link: `${base}/workspace/-/issues/101` }],
    repositorios: f.repositorios.map((repositorio) => ({
      repositorio, branch: `feature/${f.codigo}-slug`, linkBranch: `${base}/${repositorio}/-/tree/feature/${f.codigo}-slug`,
      mrs: [{ iid: 7, titulo: `${f.codigo}: ${f.titulo}`, estado: 'opened', branch: `feature/${f.codigo}-slug`, statusPipeline: 'success', link: `${base}/${repositorio}/-/merge_requests/7`, linkBranch: null }],
    })),
    tasks: [
      { codigo: `${f.codigo}.1`, numero: 1, issue: 101, linkIssue: `${base}/workspace/-/issues/101`, feita: true, emAndamento: false, reviewPass: true, sha: 'a1b2c3d', executor: 'backend', repositorio: f.repositorios[0], linkCommit: `${base}/${f.repositorios[0]}/-/commit/a1b2c3d` },
      { codigo: `${f.codigo}.2`, numero: 2, issue: 102, linkIssue: null, feita: false, emAndamento: true, reviewPass: false, sha: null, executor: null, repositorio: null, linkCommit: null },
    ],
  };
}

interface Espiao {
  listagens: URL[];
  cabecalhos: Record<string, string>[];
  atualizacoes: string[];
}

/** API simulada do Painel (P1), no contrato real: headers X-Page/X-Page-Size na ida, corpo PainelListaDto na volta. */
async function comPainel(page: Page, aplicacoes: { id: string; nome: string; sigla: string }[], total = 300): Promise<Espiao> {
  const fatias = gerarFatias(aplicacoes, total);
  const espiao: Espiao = { listagens: [], cabecalhos: [], atualizacoes: [] };
  const geradoEm = new Date().toISOString();

  await page.route('**/features.json', (rota) => json(rota, 200, { A1: true, P1: true }));

  await page.route('**/api/v1/fatias**', (rota) => {
    const url = new URL(rota.request().url());
    espiao.listagens.push(url);
    const h = rota.request().headers();
    espiao.cabecalhos.push({ 'x-page': h['x-page'], 'x-page-size': h['x-page-size'] });
    const pagina = Number(h['x-page'] ?? 1);
    const tamanho = Number(h['x-page-size'] ?? 20);
    const aba = url.searchParams.get('aba') ?? 'todas';
    const projeto = url.searchParams.get('projeto');
    // Id fora das Aplicações do usuário é ignorado (critério 11): só as dele existem na simulação.
    const pedidas = (url.searchParams.get('aplicacoes') ?? '').split(',').filter((id) => aplicacoes.some((a) => a.id === id));
    const termo = url.searchParams.get('fatia')?.toLowerCase();
    const filtradas = fatias
      .filter((f) => aba === 'todas' || (aba === 'prontas') === (f.estado === 'pronta-para-entrega'))
      .filter((f) => aba !== 'andamento' || ['com-spec', 'em-execucao', 'em-revisao'].includes(f.estado))
      .filter((f) => !pedidas.length || pedidas.includes(f.aplicacaoId))
      .filter((f) => !projeto || f.repositorios.includes(projeto))
      .filter((f) => !termo || `${f.codigo} ${f.titulo}`.toLowerCase().includes(termo));
    const corpo: Esquemas['PainelListaDto'] = {
      itens: filtradas.slice((pagina - 1) * tamanho, pagina * tamanho),
      pagina, tamanhoPagina: tamanho, total: filtradas.length, totalPaginas: Math.ceil(filtradas.length / tamanho),
      avisos: [], aplicacoes: aplicacoes.map((a) => ({ ...a, geradoEm, desatualizado: false })), geradoEm, desatualizado: false,
    };
    return json(rota, 200, corpo, { 'X-Page': String(pagina), 'X-Page-Size': String(tamanho) });
  });

  await page.route('**/api/v1/aplicacoes/*/fatias/**', (rota) => {
    const { pathname } = new URL(rota.request().url());
    const partes = pathname.split('/'); // '', api, v1, aplicacoes, {id}, fatias, {codigo|atualizar}
    const [id, destino] = [partes[4], decodeURIComponent(partes[6])];
    if (rota.request().method() === 'POST' && destino === 'atualizar') {
      espiao.atualizacoes.push(id);
      return json(rota, 204);
    }
    const f = fatias.find((x) => x.aplicacaoId === id && x.codigo === destino);
    return f ? json(rota, 200, gaveta(f)) : json(rota, 404, { errors: [{ code: 'fatia.nao-encontrada', message: 'Fatia não encontrada.', type: 'NotFound' }] });
  });
  return espiao;
}

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(resultado.violations).toEqual([]);
}

const linhas = (page: Page) => page.getByTestId('fatia-linha');

test.describe('@P1 Painel de Fatias', () => {
  test('MOR com 300 Fatias: aba, filtros, paginação, gaveta e Atualizar, com axe no Painel e na gaveta', { tag: '@P1' }, async ({ page }) => {
    await comSessao(page);
    const espiao = await comPainel(page, [VALUTO, PORTAL]);

    await page.goto('/fatias');
    await expect(page.getByRole('heading', { level: 1, name: 'Painel de Fatias' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Em andamento' })).toHaveAttribute('aria-selected', 'true');
    await expect(linhas(page)).toHaveCount(20);
    expect(espiao.cabecalhos[0]).toEqual({ 'x-page': '1', 'x-page-size': '20' });
    await semViolacoes(page);

    // Aba "Todas": 300 Fatias.
    await page.getByRole('tab', { name: 'Todas' }).click();
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–20 de 300');
    // Aba "Prontas para Entrega": só o estado pronto (60 de 300).
    await page.getByRole('tab', { name: 'Prontas para Entrega' }).click();
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–20 de 60');
    await page.getByRole('tab', { name: 'Todas' }).click();
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–20 de 300');

    // Filtro por Aplicação (várias escolhas, checkbox com o id).
    await page.getByTestId('filtro-aplicacao').click();
    await expect(page.getByTestId('opcao-aplicacao')).toHaveCount(2);
    await page.getByTestId('opcao-aplicacao').and(page.locator(`[value="${PORTAL.id}"]`)).check();
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–20 de 150');
    expect(espiao.listagens.at(-1)!.searchParams.get('aplicacoes')).toBe(PORTAL.id);
    await expect(linhas(page).first()).toContainText('Portal do Cliente');
    await page.keyboard.press('Escape');

    // Filtro por Projeto.
    await page.getByRole('button', { name: 'API', exact: true }).click();
    await expect(page.getByRole('button', { name: 'API', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–20 de 100');
    expect(espiao.listagens.at(-1)!.searchParams.get('projeto')).toBe('api');

    // Paginação: próxima página pede X-Page: 2.
    const primeira = await linhas(page).first().getAttribute('data-codigo');
    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(page.getByTestId('paginacao-info')).toHaveText('21–40 de 100');
    expect(espiao.cabecalhos.at(-1)).toEqual({ 'x-page': '2', 'x-page-size': '20' });
    expect(await linhas(page).first().getAttribute('data-codigo')).not.toBe(primeira);
    await page.getByLabel('Fatias por página').selectOption('50');
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–50 de 100');
    expect(espiao.cabecalhos.at(-1)).toEqual({ 'x-page': '1', 'x-page-size': '50' });

    // Gaveta.
    const alvo = linhas(page).first();
    const codigo = (await alvo.getAttribute('data-codigo'))!;
    await alvo.getByTestId('fatia-abrir').click();
    await expect(page.getByTestId('gaveta')).toBeVisible();
    await expect(page.getByTestId('gaveta-task')).toHaveCount(2);
    await expect(page.getByTestId('gaveta')).toContainText(codigo);
    await semViolacoes(page);
    await page.getByTestId('gaveta-fechar').click();
    await expect(page.getByTestId('gaveta')).toHaveCount(0);

    // Atualizar: POST por Aplicação filtrada, depois recarrega a lista.
    const antes = espiao.listagens.length;
    await page.getByTestId('atualizar').click();
    await expect.poll(() => espiao.atualizacoes).toEqual([PORTAL.id]);
    await expect.poll(() => espiao.listagens.length).toBeGreaterThan(antes);
  });

  test('usuário só-membro de uma Aplicação vê só as Fatias dela', { tag: '@P1' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    await comPainel(page, [PORTAL], 40);

    await page.goto('/fatias');
    await page.getByRole('tab', { name: 'Todas' }).click();
    await expect(page.getByTestId('paginacao-info')).toHaveText('1–20 de 40');
    await expect(linhas(page)).toHaveCount(20);
    for (const linha of await linhas(page).all()) await expect(linha).toContainText('Portal do Cliente');
    await expect(page.getByText('Valuto')).toHaveCount(0);

    await page.getByTestId('filtro-aplicacao').click();
    await expect(page.getByTestId('opcao-aplicacao')).toHaveCount(1);
    await expect(page.getByRole('group', { name: 'Filtrar por Aplicação' })).not.toContainText('Valuto');
  });
});
