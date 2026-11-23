import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { SEM_PAPEL, comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const APP = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT' };
const LINK_REVIEW = 'https://review.exemplo.local/R1/';
const BASE = 'https://gitlab.exemplo.local/vlt';

const json = (rota: Route, status: number, corpo?: unknown, headers: Record<string, string> = {}) =>
  rota.fulfill({ status, contentType: 'application/json', headers, body: corpo === undefined ? '' : JSON.stringify(corpo) });

interface Estado {
  review: Esquemas['ReviewDaFatiaDto'];
  decisao: string;
}

interface Simulacao {
  /** Corpos e rotas das decisões recebidas, na ordem. */
  decisoes: { codigo: string; rota: string; corpo: unknown }[];
  estado: Record<string, Estado>;
}

const FATIAS: { codigo: string; repositorios: string[]; ci: 'success' | 'failed' }[] = [
  { codigo: 'R1', repositorios: ['frontend'], ci: 'success' },
  { codigo: 'R2', repositorios: ['api', 'frontend'], ci: 'success' },
  { codigo: 'R3', repositorios: ['api'], ci: 'failed' },
];

/** API simulada do Painel com as decisões da P2 (202 + ações pedidas), no contrato real. `podeDecidir` = MOR/Aprovador. */
async function comPainelP2(page: Page, podeDecidir: boolean): Promise<Simulacao> {
  const sim: Simulacao = {
    decisoes: [],
    estado: Object.fromEntries(FATIAS.map((f) => [f.codigo, { review: { estado: 'nenhum', link: null }, decisao: 'nenhuma' }])),
  };
  const geradoEm = new Date().toISOString();
  const permissoes = (f: (typeof FATIAS)[number]): Esquemas['AcoesDaFatiaDto'] => ({
    podeAbrirReview: { pode: true, motivo: null },
    podeAprovar: !podeDecidir ? { pode: false, motivo: 'papel' } : f.ci === 'failed' ? { pode: false, motivo: 'ci-nao-verde' } : { pode: true, motivo: null },
    podeReprovar: podeDecidir ? { pode: true, motivo: null } : { pode: false, motivo: 'papel' },
  });
  const linha = (f: (typeof FATIAS)[number]): Esquemas['FatiaDoPainelDto'] => ({
    aplicacaoId: APP.id, aplicacao: APP.nome, sigla: APP.sigla, codigo: f.codigo, titulo: `Titulo ${f.codigo}`, estado: 'em-revisao',
    progresso: null, emCorrecao: false, formatoAnterior: false, risco: 'medio', status: 'aprovada', statusReconhecido: true,
    repositorios: f.repositorios, specDisponivel: true,
    acoes: permissoes(f), review: sim.estado[f.codigo].review, decisao: sim.estado[f.codigo].decisao,
  });
  const gaveta = (f: (typeof FATIAS)[number]): Esquemas['GavetaDto'] => ({
    aplicacaoId: APP.id, codigo: f.codigo, titulo: `Titulo ${f.codigo}`, estado: 'em-revisao', progresso: null, emCorrecao: false, formatoAnterior: false,
    spec: { disponivel: true, caminho: `specs/${f.codigo}.md`, link: `${BASE}/workspace/-/blob/main/specs/${f.codigo}.md`, risco: 'medio', formatoAnterior: false },
    mae: null, filhas: [], tasks: [],
    repositorios: f.repositorios.map((repositorio, i) => ({
      repositorio, branch: `feature/${f.codigo}-slug`, linkBranch: `${BASE}/${repositorio}/-/tree/feature/${f.codigo}-slug`,
      mrs: [{ iid: 7 + i, titulo: `${f.codigo}: Titulo`, estado: 'opened', branch: `feature/${f.codigo}-slug`, statusPipeline: f.ci, link: `${BASE}/${repositorio}/-/merge_requests/${7 + i}`, linkBranch: null }],
    })),
    acoes: permissoes(f), review: sim.estado[f.codigo].review, decisao: sim.estado[f.codigo].decisao,
    acoesPedidas: sim.decisoes
      .filter((d) => d.codigo === f.codigo)
      .map((d, i) => ({
        id: `019a0000-0000-7000-8000-00000000010${i}`, tipo: d.rota === 'review' ? 'abrir-review' : d.rota, estado: 'pedida', repositorio: f.repositorios[0], mrIid: 7,
        pedidaPor: 'dev', pedidaEm: geradoEm, atualizadaEm: geradoEm, codigoErro: null, comentario: d.rota === 'reprovar' ? (d.corpo as { comentario: string }).comentario : null,
      })),
  });

  await page.route('**/features.json', (rota) => json(rota, 200, { A1: true, P1: true, P2: true }));
  await page.route('**/api/v1/fatias**', (rota) => {
    const h = rota.request().headers();
    const corpo: Esquemas['PainelListaDto'] = {
      itens: FATIAS.map(linha), pagina: 1, tamanhoPagina: 20, total: FATIAS.length, totalPaginas: 1,
      avisos: [], aplicacoes: [{ ...APP, geradoEm, desatualizado: false }], geradoEm, desatualizado: false,
    };
    return json(rota, 200, corpo, { 'X-Page': h['x-page'] ?? '1', 'X-Page-Size': h['x-page-size'] ?? '20' });
  });
  await page.route('**/api/v1/aplicacoes/*/fatias/**', (rota) => {
    const requisicao = rota.request();
    const partes = new URL(requisicao.url()).pathname.split('/'); // '', api, v1, aplicacoes, {id}, fatias, {codigo}, {rota?}
    const [codigo, destino] = [decodeURIComponent(partes[6]), partes[7] ?? decodeURIComponent(partes[6])];
    if (requisicao.method() === 'POST' && destino === 'atualizar') return json(rota, 204);
    const f = FATIAS.find((x) => x.codigo === codigo);
    if (requisicao.method() === 'POST' && f) {
      sim.decisoes.push({ codigo, rota: destino, corpo: requisicao.postDataJSON() });
      if (destino === 'review') sim.estado[codigo].review = { estado: 'pedido', link: null };
      else sim.estado[codigo].decisao = destino === 'aprovar' ? 'aprovando' : 'reprovando';
      const acoes: Esquemas['AcoesPedidasDto'] = { acoes: f.repositorios.map((repositorio, i) => ({ id: `019a0000-0000-7000-8000-00000000020${i}`, tipo: destino, estado: 'pedida', repositorio, mrIid: 7 + i })) };
      return json(rota, 202, acoes);
    }
    return f ? json(rota, 200, gaveta(f)) : json(rota, 404, { errors: [{ code: 'fatia.nao-encontrada', message: 'Fatia não encontrada.', type: 'NotFound' }] });
  });
  return sim;
}

async function semViolacoes(page: Page) {
  // O diálogo e a gaveta entram com fade: o axe no meio da animação lê cor misturada (color-contrast instável).
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null))));
  const resultado = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(resultado.violations).toEqual([]);
}

const linha = (page: Page, codigo: string) => page.getByTestId('fatia-linha').and(page.locator(`[data-codigo="${codigo}"]`));

test.describe('@P2 Review e aprovação da Fatia', () => {
  test('MOR abre o review: vê "review pedido" e depois o link', { tag: '@P2' }, async ({ page }) => {
    await comSessao(page);
    const sim = await comPainelP2(page, true);
    await page.goto('/fatias');

    await expect(page.getByTestId('fatia-linha')).toHaveCount(3);
    await linha(page, 'R1').getByTestId('acao-abrir-review').click();
    await expect(linha(page, 'R1').getByTestId('review-estado')).toHaveText('review pedido…');
    expect(sim.decisoes).toEqual([{ codigo: 'R1', rota: 'review', corpo: null }]);
    await expect(linha(page, 'R1').getByTestId('acao-abrir-review')).toHaveCount(0);

    // Sem tempo real (T1): o humano usa Atualizar e o executor da P2b já abriu o review.
    sim.estado['R1'].review = { estado: 'aberto', link: LINK_REVIEW };
    await page.getByTestId('atualizar').click();
    await expect(linha(page, 'R1').getByTestId('review-link')).toHaveAttribute('href', LINK_REVIEW);
  });

  test('MOR reprova com comentário obrigatório, contador e axe no diálogo', { tag: '@P2' }, async ({ page }) => {
    await comSessao(page);
    const sim = await comPainelP2(page, true);
    await page.goto('/fatias');

    await linha(page, 'R3').getByTestId('acao-reprovar').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('reprovar-confirmar')).toBeDisabled();
    await page.getByTestId('reprovar-comentario').fill('Falta tratar o erro <b>x</b>');
    await expect(page.getByTestId('reprovar-contador')).toContainText('28 / 2000');
    await semViolacoes(page);

    await page.getByTestId('reprovar-cancelar').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(sim.decisoes).toEqual([]);

    await linha(page, 'R3').getByTestId('acao-reprovar').click();
    await page.getByTestId('reprovar-comentario').fill('Falta tratar o erro <b>x</b>');
    await page.getByTestId('reprovar-confirmar').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(sim.decisoes).toEqual([{ codigo: 'R3', rota: 'reprovar', corpo: { comentario: 'Falta tratar o erro <b>x</b>' } }]);
    await expect(linha(page, 'R3').getByTestId('decisao-estado')).toHaveText('reprovação pedida');
    await expect(linha(page, 'R3').getByTestId('acao-aprovar')).toBeDisabled();
    await expect(linha(page, 'R3').getByTestId('acao-reprovar')).toBeDisabled();
  });

  test('MOR aprova uma Fatia api + frontend com CI verde, vê "aprovação pedida" e as Ações na gaveta (axe)', { tag: '@P2' }, async ({ page }) => {
    await comSessao(page);
    const sim = await comPainelP2(page, true);
    await page.goto('/fatias');

    await linha(page, 'R2').getByTestId('acao-aprovar').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('aprovar-mr')).toHaveCount(2);
    await expect(page.getByTestId('aprovar-mr').first()).toContainText('API');
    await expect(page.getByTestId('aprovar-mr').last()).toContainText('Front');
    await semViolacoes(page);

    await page.getByTestId('aprovar-confirmar').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(sim.decisoes).toEqual([{ codigo: 'R2', rota: 'aprovar', corpo: null }]);
    await expect(linha(page, 'R2').getByTestId('decisao-estado')).toHaveText('aprovação pedida');
    await expect(linha(page, 'R2').getByTestId('acao-aprovar')).toBeDisabled();

    await linha(page, 'R2').getByTestId('fatia-abrir').click();
    await expect(page.getByTestId('gaveta-acoes')).toBeVisible();
    await expect(page.getByTestId('gaveta-acao')).toHaveCount(1);
    await expect(page.getByTestId('gaveta-acao')).toContainText('Aprovar');
    await semViolacoes(page);
  });

  test('Aprovar fica desativado com CI vermelho, com o motivo no title', { tag: '@P2' }, async ({ page }) => {
    await comSessao(page);
    await comPainelP2(page, true);
    await page.goto('/fatias');

    const aprovar = linha(page, 'R3').getByTestId('acao-aprovar');
    await expect(aprovar).toBeDisabled();
    await expect(aprovar).toHaveAttribute('title', 'Todas as MRs abertas precisam estar com o CI verde.');
    await expect(linha(page, 'R3').getByTestId('acao-reprovar')).toBeEnabled();
  });

  test('erro de negócio ao abrir o review aparece no aviso, com o texto da API', { tag: '@P2' }, async ({ page }) => {
    await comSessao(page);
    await comPainelP2(page, true);
    // Rota registrada depois tem precedência: só o POST de review recusa.
    await page.route('**/api/v1/aplicacoes/*/fatias/R1/review', (rota) =>
      json(rota, 422, { errors: [{ code: 'fatia.sem-mr-aberta', message: 'A Fatia não tem MR aberta.', type: 'Validation' }] }),
    );
    await page.goto('/fatias');

    await linha(page, 'R1').getByTestId('acao-abrir-review').click();
    await expect(page.getByTestId('decisao-aviso')).toContainText('A Fatia não tem MR aberta.');
  });

  test('Membro vê Abrir review e não decide (Aprovar e Reprovar desativados com o motivo)', { tag: '@P2' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    const sim = await comPainelP2(page, false);
    await page.goto('/fatias');

    const r2 = linha(page, 'R2');
    await expect(r2.getByTestId('acao-abrir-review')).toBeEnabled();
    for (const id of ['acao-aprovar', 'acao-reprovar']) {
      await expect(r2.getByTestId(id)).toBeDisabled();
      await expect(r2.getByTestId(id)).toHaveAttribute('title', 'Seu papel não permite esta ação.');
    }
    expect(sim.decisoes).toEqual([]);
  });
});
