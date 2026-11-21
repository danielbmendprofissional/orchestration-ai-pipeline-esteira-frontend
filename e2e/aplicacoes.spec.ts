import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { SEM_PAPEL, comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const ID = '019a0000-0000-7000-8000-000000000001';

const json = (rota: Route, status: number, corpo?: unknown, headers: Record<string, string> = {}) =>
  rota.fulfill({ status, contentType: 'application/json', headers, body: corpo === undefined ? '' : JSON.stringify(corpo) });

const ambientes = (prefixo: string): Esquemas['AmbienteProjetoDto'][] =>
  ['qa', 'hml', 'producao'].map((ambiente) => ({ id: `${prefixo}-${ambiente}`, ambiente, habilitado: true, destinos: [] }));

/**
 * API simulada do cadastro (A1): estado em memória, tipado pelo contrato gerado. `pode` liga ou desliga todas as
 * permissões, como a API faria pelo papel do usuário.
 */
type Permissoes = { podeCriar: boolean; podeEditar: boolean; podeEditarCadastro: boolean; podeEditarPolitica: boolean; podeGerenciarPapeis: boolean };
const TODAS = (v: boolean): Permissoes => ({ podeCriar: v, podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v });
const ANALISTA: Permissoes = { ...TODAS(false), podeEditar: true };

async function comCadastro(page: Page, permissoes: Permissoes) {
  const aplicacao: Esquemas['AplicacaoDetalheDto'] = { id: ID, nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true, projetos: [], papeis: [],
    politicas: [
      { id: 'po1', ambiente: 'review', critica: null, alta: null, media: null, baixa: null, modo: 'avisa' },
      ...['qa', 'hml', 'producao'].map((ambiente) => ({ id: 'po-' + ambiente, ambiente, critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' })),
    ],
  };
  const pessoas: Esquemas['PessoaListaDto'][] = [{ sub: 's1', nome: 'Ana Souza', email: 'ana@esteira.local' }];
  const grupo: Esquemas['ProjetoGitLabItemDto'][] = [
    { projetoGitLabId: 1, caminho: 'valuto/api', nome: 'api', cadastrado: false, stackSugerida: 'dotnet' },
    { projetoGitLabId: 2, caminho: 'valuto/web', nome: 'web', cadastrado: false, stackSugerida: 'angular' },
  ];
  const lista = () => [{ id: ID, nome: aplicacao.nome, sigla: aplicacao.sigla, grupo: aplicacao.grupo, quantidadeProjetos: aplicacao.projetos!.length, ativa: true }];
  const projeto = (id: string) => aplicacao.projetos!.find((p) => p.id === id)!;

  await page.route('**/api/v1/aplicacoes**', async (rota) => {
    const req = rota.request();
    const { pathname } = new URL(req.url());
    const metodo = req.method();
    const corpo = req.postDataJSON?.() as Record<string, unknown> | null;

    if (pathname === '/api/v1/aplicacoes/permissoes') return json(rota, 200, { podeCriar: permissoes.podeCriar });
    if (pathname === `/api/v1/aplicacoes/${ID}/permissoes`)
      return json(rota, 200, { podeEditar: permissoes.podeEditar, podeEditarCadastro: permissoes.podeEditarCadastro, podeEditarPolitica: permissoes.podeEditarPolitica, podeGerenciarPapeis: permissoes.podeGerenciarPapeis });
    if (pathname === `/api/v1/aplicacoes/${ID}/gitlab/projetos`)
      return json(rota, 200, grupo.map((g) => ({ ...g, cadastrado: aplicacao.projetos!.some((p) => p.caminho === g.caminho) })));
    if (pathname === `/api/v1/aplicacoes/${ID}/projetos` && metodo === 'POST') {
      const item = grupo.find((g) => g.projetoGitLabId === corpo?.['projetoGitLabId'])!;
      const novo: Esquemas['ProjetoResumoDto'] = { id: `p${item.projetoGitLabId}`, nome: item.nome, caminho: item.caminho, stack: String(corpo?.['stack']), ativo: true, dependeDe: [], ambientes: ambientes(`p${item.projetoGitLabId}`) };
      aplicacao.projetos!.push(novo);
      return json(rota, 201, novo);
    }
    const politica = pathname.match(/\/politicas\/(\w+)$/);
    if (politica && metodo === 'PUT') {
      const atual = aplicacao.politicas!.find((x) => x.ambiente === politica[1])!;
      Object.assign(atual, corpo);
      return json(rota, 200, atual);
    }
    if (pathname === `/api/v1/aplicacoes/${ID}/papeis` && metodo === 'POST') {
      const pessoa = pessoas.find((x) => x.sub === corpo?.['usuario'])!;
      const vinculo = { id: 'v' + aplicacao.papeis!.length, usuario: pessoa.sub, nome: pessoa.nome, email: pessoa.email, papel: String(corpo?.['papel']) };
      aplicacao.papeis!.push(vinculo);
      return json(rota, 201, vinculo);
    }
    if (pathname === `/api/v1/aplicacoes/${ID}`) return json(rota, 200, aplicacao);
    if (pathname === '/api/v1/aplicacoes')
      return json(rota, 200, lista(), { 'X-Total-Count': '1', 'X-Total-Pages': '1', 'X-Page': '1', 'X-Page-Size': '20' });
    return rota.fallback();
  });

  await page.route('**/api/v1/pessoas**', (rota) => json(rota, 200, pessoas));

  await page.route('**/api/v1/projetos/**', async (rota) => {
    const req = rota.request();
    const partes = new URL(req.url()).pathname.split('/'); // '', api, v1, projetos, {id}, ...
    const p = projeto(partes[4]);
    const corpo = req.postDataJSON?.() as Record<string, unknown> | null;
    if (partes[5] === 'dependencias') {
      p.dependeDe = corpo?.['dependeDe'] as string[];
      return json(rota, 200, p);
    }
    if (partes[5] === 'ambientes' && partes[7] === 'destinos' && req.method() === 'POST') {
      const destino = { id: `d${Date.now()}${Math.random()}`, nome: String(corpo?.['nome']), configuracao: corpo?.['configuracao'] as Record<string, string>, ordem: Number(corpo?.['ordem']) };
      p.ambientes!.find((a) => a.ambiente === partes[6])!.destinos!.push(destino);
      return json(rota, 201, destino);
    }
    return rota.fallback();
  });
}

const aba = (page: Page, nome: string) => page.getByRole('tab', { name: nome });

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(resultado.violations).toEqual([]);
}

test.describe('cadastro de Aplicação (A1)', () => {
  test('MOR cadastra projetos, dependência e destinos, e as 5 abas passam no axe', { tag: '@A1' }, async ({ page }) => {
    await comSessao(page);
    await comCadastro(page, TODAS(true));

    await page.goto('/aplicacoes');
    await expect(page.getByRole('heading', { level: 1, name: 'Aplicações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nova aplicação' })).toBeVisible();
    await semViolacoes(page);

    await page.getByRole('link', { name: 'Valuto' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Valuto' })).toBeVisible();
    await semViolacoes(page);

    await aba(page, 'Projetos').click();
    await page.getByRole('button', { name: 'Adicionar projetos' }).click();
    await page.getByLabel('Selecionar valuto/api').check();
    await page.getByLabel('Selecionar valuto/web').check();
    await semViolacoes(page);
    await page.getByRole('button', { name: 'Cadastrar selecionados' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('tabpanel').filter({ hasText: 'valuto/web' })).toBeVisible();

    await page.getByLabel('valuto/web depende de valuto/api').check();
    await expect(page.getByLabel('valuto/web depende de valuto/api')).toBeChecked();
    await semViolacoes(page);

    await aba(page, 'Ambientes e destinos').click();
    for (const nome of ['cluster-a', 'cluster-b']) {
      await page.getByRole('button', { name: 'Adicionar destino de valuto/api em hml' }).click();
      await page.getByLabel('Nome do destino').fill(nome);
      await page.getByLabel('Chave 1').fill('KUBE_CONTEXT');
      await page.getByLabel('Valor 1').fill(`ctx-${nome}`);
      await page.getByRole('button', { name: 'Salvar destino' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: 'Editar destino cluster-a' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar destino cluster-b' })).toBeVisible();
    await semViolacoes(page);

    await aba(page, 'Política de segurança').click();
    await page.getByLabel('Média em review').fill('5');
    await page.getByRole('button', { name: 'Salvar review' }).click();
    await expect(page.getByLabel('Média em review')).toHaveValue('5');
    await expect(page.getByLabel('Crítica em qa')).toBeDisabled();
    await semViolacoes(page);

    await aba(page, 'Pessoas e papéis').click();
    await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
    await page.getByLabel('Buscar pessoa').fill('ana');
    await page.getByLabel('Buscar pessoa').press('Enter');
    await page.getByRole('button', { name: /Ana Souza/ }).click();
    await page.getByLabel('Papel').selectOption('aprovador-tecnico');
    await semViolacoes(page);
    await page.getByRole('button', { name: 'Vincular' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByLabel('Ana Souza: aprovador técnico')).toBeChecked();
    await semViolacoes(page);
  });

  test('usuário sem permissão não vê Nova aplicação nem as ações de edição', { tag: '@A1' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    await comCadastro(page, TODAS(false));

    await page.goto('/aplicacoes');
    await expect(page.getByRole('heading', { level: 1, name: 'Aplicações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nova aplicação' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Valuto' }).click();
    await expect(page.getByText('Somente leitura.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar aplicação' })).toHaveCount(0);
    await aba(page, 'Projetos').click();
    await expect(page.getByRole('button', { name: 'Adicionar projetos' })).toHaveCount(0);
    await aba(page, 'Pessoas e papéis').click();
    await expect(page.getByRole('button', { name: 'Adicionar pessoa' })).toHaveCount(0);
  });

  test('analista edita projetos e destinos, mas não gerencia pessoas nem cria aplicação', { tag: '@A1' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    await comCadastro(page, ANALISTA);

    await page.goto('/aplicacoes');
    await expect(page.getByRole('button', { name: 'Nova aplicação' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Valuto' }).click();
    await aba(page, 'Projetos').click();
    await expect(page.getByRole('button', { name: 'Adicionar projetos' })).toBeVisible();
    await aba(page, 'Pessoas e papéis').click();
    await expect(page.getByRole('button', { name: 'Adicionar pessoa' })).toHaveCount(0);
    await aba(page, 'Política de segurança').click();
    await expect(page.getByRole('button', { name: 'Salvar review' })).toHaveCount(0);
  });
});
