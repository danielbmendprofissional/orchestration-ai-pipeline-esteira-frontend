import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { SEM_PAPEL, comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const ID = '019a0000-0000-7000-8000-000000000001';
const PADRAO = 2;

const json = (rota: Route, status: number, corpo?: unknown) =>
  rota.fulfill({ status, contentType: 'application/json', body: corpo === undefined ? '' : JSON.stringify(corpo) });

/** API simulada do teto de custo (X3): estado em memória, tipado pelo contrato gerado; `mor` liga a permissão de editar o teto. */
async function comTeto(page: Page, mor: boolean) {
  let definido: number | undefined;
  const teto = (): Esquemas['TetoCustoDto'] => ({ ...(definido === undefined ? {} : { tetoCustoUsd: definido }), padraoUsd: PADRAO, efetivoUsd: definido ?? PADRAO });
  const aplicacao = (): Esquemas['AplicacaoDetalheDto'] => ({ id: ID, nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true, projetos: [], papeis: [], politicas: [], tetoCusto: teto() });

  await page.route('**/features.json', (r) => json(r, 200, { A1: true, X3: true }));
  await page.route('**/api/v1/aplicacoes**', async (rota) => {
    const req = rota.request();
    const { pathname } = new URL(req.url());
    if (pathname === '/api/v1/aplicacoes/permissoes') return json(rota, 200, { podeCriar: mor });
    if (pathname === `/api/v1/aplicacoes/${ID}/permissoes`)
      return json(rota, 200, { podeEditar: mor, podeEditarCadastro: mor, podeEditarPolitica: mor, podeGerenciarPapeis: mor, podeEditarTetoCusto: mor });
    if (pathname === `/api/v1/aplicacoes/${ID}/teto-custo` && req.method() === 'PUT') {
      const valor = (req.postDataJSON() as { tetoCustoUsd?: number | null }).tetoCustoUsd;
      if (valor != null && (valor < 0.1 || valor > 50))
        return json(rota, 422, { errors: [{ code: 'aplicacao.teto-invalido', message: 'Teto inválido.', type: 'Validation' }] });
      definido = valor ?? undefined;
      return json(rota, 200, teto());
    }
    if (pathname === `/api/v1/aplicacoes/${ID}`) return json(rota, 200, aplicacao());
    if (pathname === '/api/v1/aplicacoes')
      return rota.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Total-Count': '1', 'X-Page': '1', 'X-Page-Size': '20' }, body: JSON.stringify([{ id: ID, nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 0, ativa: true }]) });
    return rota.fallback();
  });
}

/** `semToast`: o toast do interceptor anima a entrada (contraste transitório), então o estado de erro é medido sem ele. */
async function semViolacoes(page: Page, semToast = false) {
  const axe = new AxeBuilder({ page }).withTags(WCAG);
  const resultado = await (semToast ? axe.exclude('[data-sonner-toast]') : axe).analyze();
  expect(resultado.violations).toEqual([]);
}

test.describe('teto de custo dos agentes (X3)', () => {
  test('MOR altera o teto, volta ao padrão e a aba e a gaveta passam no axe', { tag: '@X3' }, async ({ page }) => {
    await comSessao(page);
    await comTeto(page, true);

    await page.goto(`/aplicacoes/${ID}`);
    await expect(page.getByText('Teto de custo dos agentes (US$ por execução)')).toBeVisible();
    await expect(page.getByTestId('teto-valor')).toContainText('2,00');
    await expect(page.getByText('padrão da Esteira')).toBeVisible();
    await semViolacoes(page);

    await page.getByRole('button', { name: 'Alterar teto' }).click();
    await expect(page.getByRole('heading', { name: 'Teto de custo dos agentes', level: 2 }).last()).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('agentes do CI');
    await semViolacoes(page);

    await page.getByLabel('Teto (US$ por execução)').fill('99');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'entre 0,10 e 50,00' })).toBeVisible();
    await semViolacoes(page, true);

    await page.getByLabel('Teto (US$ por execução)').fill('5,5');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('teto-valor')).toContainText('5,50');
    await expect(page.getByText('padrão da Esteira')).toHaveCount(0);

    await page.getByRole('button', { name: 'Alterar teto' }).click();
    await page.getByRole('button', { name: 'Usar padrão da Esteira' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('teto-valor')).toContainText('2,00');
    await expect(page.getByText('padrão da Esteira')).toBeVisible();
  });

  test('quem só pode ler vê o teto mas não vê "Alterar teto"', { tag: '@X3' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    await comTeto(page, false);

    await page.goto(`/aplicacoes/${ID}`);
    await expect(page.getByTestId('teto-valor')).toContainText('2,00');
    await expect(page.getByRole('button', { name: 'Alterar teto' })).toHaveCount(0);
    await semViolacoes(page);
  });
});
