import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';
import { DEV, SEM_PAPEL, comSessao } from './sessao-falsa';

type Esquemas = components['schemas'];
type Registro = Esquemas['RegistroAuditoriaDetalheDto'];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const VALUTO = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto' };
const PORTAL = { id: '019a0000-0000-7000-8000-000000000002', nome: 'Portal do Cliente' };
const ENTREGA_ID = '019a0000-0000-7000-8000-0000000000e1';
const AGORA = new Date();
const minutosAtras = (m: number) => new Date(AGORA.getTime() - m * 60_000).toISOString();
const diaAs12 = (diasAtras: number) => new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate() - diasAtras, 12).toISOString();

const CARLA = { nome: 'Carla Mendes', origem: 'tela' };
const BOT = { nome: 'Bot da Esteira', origem: 'bot' };
const registro = (n: number, extra: Partial<Registro>): Registro => ({
  id: `019a0000-0000-7000-8000-${String(n).padStart(12, '0')}`, quando: minutosAtras(n), quem: CARLA, categoria: 'cadastro', verbo: 'alterou a Aplicação',
  objeto: { codigo: 'VLT', nome: 'Valuto', entidade: 'Aplicacao', entidadeId: 'app-1' }, aplicacao: VALUTO, autoaprovacao: false,
  mudancas: [{ campo: 'teto de custo (USD)', antes: '40', depois: '60' }], motivo: null, ...extra,
});
const REGISTROS: Registro[] = [
  registro(1, { motivo: 'Pedido do cliente' }),
  registro(2, { quem: BOT, categoria: 'aprovacao', verbo: 'aprovou a Fatia', autoaprovacao: true, objeto: { codigo: 'X1', nome: null, entidade: 'Fatia', entidadeId: 'f' } }),
  registro(3, { quando: diaAs12(1), categoria: 'entrega', verbo: 'abriu a Entrega', objeto: { codigo: ENTREGA_ID, nome: null, entidade: 'Entrega', entidadeId: ENTREGA_ID }, mudancas: [{ campo: 'estado', antes: '—', depois: 'em andamento' }] }),
  registro(4, { quando: diaAs12(1), categoria: 'papeis', verbo: 'alterou o Papel', aplicacao: PORTAL, objeto: { codigo: 'PCL', nome: 'Portal do Cliente', entidade: 'PapelAplicacao', entidadeId: 'p' } }),
  registro(50, { quando: diaAs12(3), categoria: 'excecao', verbo: 'pediu a exceção', aplicacao: PORTAL, objeto: { codigo: 'SEC-9', nome: 'XSS', entidade: 'Excecao', entidadeId: 'e' } }),
];
const paraLista = ({ mudancas, motivo: _motivo, ...resto }: Registro): Esquemas['RegistroAuditoriaListaDto'] => ({
  ...resto, resumoMudancas: `${mudancas[0].campo}: ${mudancas[0].antes} → ${mudancas[0].depois}`,
});

const json = (rota: Route, status: number, corpo?: unknown, headers: Record<string, string> = {}) =>
  rota.fulfill({ status, contentType: 'application/json', headers, body: corpo === undefined ? '' : JSON.stringify(corpo) });
const erro = (code: string) => ({ errors: [{ code, message: 'x', type: 'Failure' }] });

interface Cenario { escopo?: string[] | null; falhaNaLista?: boolean; chamadas?: URL[] }

/** API simulada da Auditoria no contrato real: array puro + headers X-*, escopo por Aplicação e filtros da query. */
async function comAuditoria(page: Page, { escopo = null, falhaNaLista = false, chamadas = [] }: Cenario = {}) {
  await page.route('**/features.json', (r) => json(r, 200, { X1: true, E1b: true }));
  await page.route('**/api/v1/auditoria**', (rota) => {
    const url = new URL(rota.request().url());
    chamadas.push(url);
    const visiveis = REGISTROS.filter((r) => !escopo || (r.aplicacao && escopo.includes(r.aplicacao.id)));
    const caminho = url.pathname.replace('/api/v1/auditoria', '');
    if (caminho === '/filtros') {
      const apps = [VALUTO, PORTAL].filter((a) => !escopo || escopo.includes(a.id));
      return json(rota, 200, { aplicacoes: apps, pessoas: [{ id: 'sub-carla', nome: 'Carla Mendes' }, { id: '@bot', nome: 'Bot da Esteira' }] });
    }
    if (caminho !== '' && caminho !== '/categorias') {
      const achado = visiveis.find((r) => r.id === decodeURIComponent(caminho.slice(1)));
      return achado ? json(rota, 200, achado) : json(rota, 404, erro('auditoria.nao-encontrado'));
    }
    if (falhaNaLista) return json(rota, 500, erro('erro.interno'));
    const q = url.searchParams;
    const filtrados = visiveis
      .filter((r) => !q.get('aplicacaoId') || r.aplicacao?.id === q.get('aplicacaoId'))
      .filter((r) => !q.get('objeto') || r.objeto.codigo === q.get('objeto'))
      .filter((r) => !q.get('periodoDias') || Date.parse(r.quando) >= AGORA.getTime() - Number(q.get('periodoDias')) * 86_400_000);
    if (caminho === '/categorias') {
      const mapa = new Map<string, number>();
      filtrados.forEach((r) => mapa.set(r.categoria, (mapa.get(r.categoria) ?? 0) + 1));
      return json(rota, 200, [...mapa].map(([categoria, total]) => ({ categoria, total })));
    }
    const doTipo = filtrados.filter((r) => !q.get('categoria') || r.categoria === q.get('categoria'));
    return json(rota, 200, doTipo.map(paraLista), {
      'X-Total-Count': String(doTipo.length), 'X-Total-Pages': String(Math.ceil(doTipo.length / 12)), 'X-Page': '1', 'X-Page-Size': '12',
    });
  });
}

const semViolacoes = async (page: Page) => {
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
};

test.describe('@X1 Auditoria', () => {
  test('MOR vê as duas Aplicações; o membro só a dele; lista agrupada por dia, sem erro, com axe AA', { tag: '@X1' }, async ({ page }) => {
    await comSessao(page, DEV);
    await comAuditoria(page);
    await page.goto('/auditoria');
    await expect(page.getByTestId('registro')).toHaveCount(5);
    await expect(page.getByTestId('dia').first()).toHaveText('Hoje');
    await expect(page.getByTestId('dia')).toHaveText(['Hoje', 'Ontem', /^\d{2}\/\d{2}\/\d{4}$/]);
    await expect(page.getByLabel('Aplicação', { exact: true }).locator('option')).toHaveCount(3);
    await expect(page.getByTestId('registro').nth(1)).toContainText('autoaprovação');
    await semViolacoes(page);

    const membro = await page.context().newPage();
    await comSessao(membro, { ...SEM_PAPEL });
    await comAuditoria(membro, { escopo: [VALUTO.id] });
    await membro.goto('/auditoria');
    await expect(membro.getByTestId('registro')).toHaveCount(3);
    await expect(membro.getByLabel('Aplicação', { exact: true }).locator('option')).toHaveCount(2);
    await expect(membro.getByTestId('registro').filter({ hasText: 'Portal do Cliente' })).toHaveCount(0);
  });

  test('abrir a gaveta: URL, antes/depois, motivo, foco preso, Esc fecha e "Abrir" leva ao objeto; axe AA', { tag: '@X1' }, async ({ page }) => {
    await comSessao(page);
    await comAuditoria(page);
    await page.goto('/auditoria');
    await page.getByTestId('registro').first().click();

    const gaveta = page.getByTestId('gaveta');
    await expect(gaveta).toBeVisible();
    await expect(page).toHaveURL(/\/auditoria\/019a0000-0000-7000-8000-000000000001$/);
    await expect(gaveta).toContainText('Tela da Esteira');
    await expect(gaveta.getByRole('columnheader')).toHaveText(['Campo', 'Antes', 'Depois']);
    await expect(gaveta).toContainText('Pedido do cliente');
    await expect(gaveta.getByTestId('abrir-objeto')).toHaveAttribute('href', '/aplicacoes/app-1');
    await semViolacoes(page);

    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(gaveta).toHaveCount(0);
    await expect(page).toHaveURL(/\/auditoria$/);
    await expect(page.getByTestId('registro')).toHaveCount(5);
  });

  test('chegar por "ver na auditoria" da Entrega: só os registros do objeto, chip, x tira o filtro; URL guarda os filtros', { tag: '@X1' }, async ({ page }) => {
    await comSessao(page);
    await comAuditoria(page);
    await page.route(`**/api/v1/entregas/${ENTREGA_ID}`, (r) =>
      json(r, 200, { id: ENTREGA_ID, aplicacao: { id: VALUTO.id, nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: minutosAtras(3), estado: 'em-andamento', vezDe: null, fluxos: [] }),
    );
    await page.goto(`/entregas/${ENTREGA_ID}`);
    await page.getByTestId('ver-na-auditoria').click();

    await expect(page).toHaveURL(new RegExp(`/auditoria\\?objeto=${ENTREGA_ID}$`));
    await expect(page.getByTestId('registro')).toHaveCount(1);
    await expect(page.getByTestId('chip-objeto')).toContainText(`Só ${ENTREGA_ID}`);
    await semViolacoes(page);

    await page.getByRole('button', { name: /Tirar o filtro do objeto/ }).click();
    await expect(page.getByTestId('chip-objeto')).toHaveCount(0);
    await expect(page.getByTestId('registro')).toHaveCount(5);
    await expect(page).toHaveURL(/\/auditoria$/);

    await page.getByTestId('categoria').filter({ hasText: 'Exceções' }).click();
    await expect(page).toHaveURL(/cat=excecao/);
    await page.goBack();
    await expect(page).not.toHaveURL(/cat=excecao/);
  });

  test('sem registro visível: estado vazio (não erro); filtro sem resultado: "com esses filtros"; axe AA', { tag: '@X1' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    await comAuditoria(page, { escopo: [] });
    await page.goto('/auditoria');
    await expect(page.getByTestId('vazio')).toContainText('Você só vê as aplicações em que tem papel');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await semViolacoes(page);

    await page.goto('/auditoria?objeto=NAO-EXISTE');
    await expect(page.getByTestId('vazio')).toContainText('Nenhum registro com esses filtros');
  });

  test('erro na lista mostra "Tentar de novo"; registro inexistente na gaveta mostra 404 amigável', { tag: '@X1' }, async ({ page }) => {
    await comSessao(page);
    await comAuditoria(page, { falhaNaLista: true });
    await page.goto('/auditoria');
    await expect(page.getByTestId('tentar-de-novo')).toBeVisible();
    await expect(page.getByTestId('vazio')).toHaveCount(0);

    await page.goto('/auditoria/019a0000-0000-7000-8000-00000000ffff');
    await expect(page.getByTestId('nao-encontrado')).toContainText('Registro não encontrado ou sem acesso');
  });

  test('responsivo em 320 px: sem rolagem lateral', { tag: '@X1' }, async ({ page }) => {
    await comSessao(page);
    await comAuditoria(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/auditoria');
    await expect(page.getByTestId('registro')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await semViolacoes(page);
  });
});
