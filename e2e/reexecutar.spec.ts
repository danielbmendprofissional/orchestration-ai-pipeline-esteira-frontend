import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { SEM_PAPEL, comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const APP = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT' };
const BASE = 'https://gitlab.exemplo.local/vlt';
const ACAO_FALHADA = '019a0000-0000-7000-8000-000000000301';
const ACAO_NOVA = '019a0000-0000-7000-8000-000000000302';

const json = (rota: Route, status: number, corpo?: unknown, headers: Record<string, string> = {}) =>
  rota.fulfill({ status, contentType: 'application/json', headers, body: corpo === undefined ? '' : JSON.stringify(corpo) });

/** API simulada com uma Fatia Em revisão cuja Ação aprovar falhou; `podeReexecutar` = MOR/Aprovador. */
async function comFatiaComFalha(page: Page, podeReexecutar: boolean) {
  const estado = { reexecutada: false, chamadas: [] as string[] };
  const geradoEm = new Date().toISOString();
  const permissao = { pode: false, motivo: 'decisao-em-andamento' };
  const linha = (): Esquemas['FatiaDoPainelDto'] => ({
    aplicacaoId: APP.id, aplicacao: APP.nome, sigla: APP.sigla, codigo: 'R9', titulo: 'Titulo R9', estado: 'em-revisao', progresso: null,
    emCorrecao: false, formatoAnterior: false, risco: 'medio', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
    acoes: { podeAbrirReview: permissao, podeAprovar: permissao, podeReprovar: permissao }, review: { estado: 'nenhum', link: null },
    decisao: estado.reexecutada ? 'aprovando' : 'falhou',
  });
  const acao = (id: string, st: string, extra: Partial<Esquemas['AcaoDaFatiaDto']>): Esquemas['AcaoDaFatiaDto'] => ({
    id, tipo: 'aprovar', estado: st, repositorio: 'api', mrIid: 7, pedidaPor: 'dev', pedidaEm: geradoEm, atualizadaEm: geradoEm,
    codigoErro: null, comentario: null, podeReexecutar: { pode: false, motivo: 'nao-falhou' }, ...extra,
  });
  const gaveta = (): Esquemas['GavetaDto'] => ({
    aplicacaoId: APP.id, codigo: 'R9', titulo: 'Titulo R9', estado: 'em-revisao', progresso: null, emCorrecao: false, formatoAnterior: false,
    spec: { disponivel: true, caminho: 'specs/R9.md', link: `${BASE}/workspace/-/blob/main/specs/R9.md`, risco: 'medio', formatoAnterior: false },
    mae: null, filhas: [], tasks: [],
    repositorios: [{
      repositorio: 'api', branch: 'feature/r9-slug', linkBranch: `${BASE}/api/-/tree/feature/r9-slug`,
      mrs: [{ iid: 7, titulo: 'R9: Titulo', estado: 'opened', branch: 'feature/r9-slug', statusPipeline: 'success', link: `${BASE}/api/-/merge_requests/7`, linkBranch: null }],
    }],
    acoes: linha().acoes, review: { estado: 'nenhum', link: null }, decisao: linha().decisao,
    acoesPedidas: estado.reexecutada
      ? [
          acao(ACAO_FALHADA, 'falhou', { codigoErro: 'gitlab.merge-recusado', podeReexecutar: { pode: false, motivo: 'nao-e-a-ultima' } }),
          acao(ACAO_NOVA, 'pedida', {}),
        ]
      : [acao(ACAO_FALHADA, 'falhou', {
          codigoErro: 'gitlab.merge-recusado',
          podeReexecutar: podeReexecutar ? { pode: true, motivo: null } : { pode: false, motivo: 'papel' },
        })],
  });

  await page.route('**/features.json', (rota) => json(rota, 200, { A1: true, P1: true, P2: true }));
  await page.route('**/api/v1/fatias**', (rota) => {
    const h = rota.request().headers();
    const corpo: Esquemas['PainelListaDto'] = {
      itens: [linha()], pagina: 1, tamanhoPagina: 20, total: 1, totalPaginas: 1, avisos: [],
      aplicacoes: [{ ...APP, geradoEm, desatualizado: false }], geradoEm, desatualizado: false,
    };
    return json(rota, 200, corpo, { 'X-Page': h['x-page'] ?? '1', 'X-Page-Size': h['x-page-size'] ?? '20' });
  });
  await page.route('**/api/v1/aplicacoes/*/fatias/R9/**', (rota) => {
    const { pathname } = new URL(rota.request().url());
    if (rota.request().method() === 'POST' && pathname.endsWith(`/acoes/${ACAO_FALHADA}/reexecutar`)) {
      estado.chamadas.push(pathname);
      estado.reexecutada = true;
      const corpo: Esquemas['AcoesPedidasDto'] = { acoes: [{ id: ACAO_NOVA, tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] };
      return json(rota, 202, corpo);
    }
    return json(rota, 404);
  });
  await page.route('**/api/v1/aplicacoes/*/fatias/R9', (rota) => json(rota, 200, gaveta()));
  return estado;
}

async function semViolacoes(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null))));
  const resultado = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(resultado.violations).toEqual([]);
}

test.describe('@P2b Ações do bot na MR', () => {
  test('MOR abre a gaveta, reexecuta a Ação falhou e vê a Ação nova em andamento (axe)', { tag: '@P2b' }, async ({ page }) => {
    await comSessao(page);
    const sim = await comFatiaComFalha(page, true);
    await page.goto('/fatias');

    await expect(page.getByTestId('decisao-estado')).toHaveText('falhou — reexecutar na gaveta');
    await page.getByTestId('decisao-estado').click();
    await expect(page.getByTestId('gaveta-acao')).toHaveCount(1);
    await expect(page.getByTestId('gaveta-acoes')).toContainText('gitlab.merge-recusado');
    await semViolacoes(page);

    await page.getByTestId('gaveta-reexecutar').click();
    await expect(page.getByTestId('gaveta-aviso')).toContainText('Reexecução pedida');
    await expect(page.getByTestId('gaveta-acao')).toHaveCount(2);
    await expect(page.getByTestId('gaveta-acao').last()).toContainText('pedida');
    await expect(page.getByTestId('gaveta-reexecutar')).toBeDisabled();
    expect(sim.chamadas).toHaveLength(1);
    await expect(page.getByTestId('decisao-estado')).toHaveText('aprovação pedida');
    await semViolacoes(page);
  });

  test('Membro vê o botão Reexecutar desativado, com o motivo (axe)', { tag: '@P2b' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    const sim = await comFatiaComFalha(page, false);
    await page.goto('/fatias');

    await page.getByTestId('fatia-abrir').click();
    const botao = page.getByTestId('gaveta-reexecutar');
    await expect(botao).toBeDisabled();
    await expect(botao).toHaveAttribute('title', 'Seu papel não permite esta ação.');
    expect(sim.chamadas).toEqual([]);
    await semViolacoes(page);
  });
});
