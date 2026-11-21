import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { SEM_PAPEL, comSessao, comTokenVencido, semSessao } from './sessao-falsa';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const menuDoUsuario = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Dev Esteira' });

test.describe('sessão e shell', () => {
  test('boot logado mostra o shell com o ambiente e o nome do usuário', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('DEV');
    await expect(page.getByRole('banner')).toContainText('Dev Esteira');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Início' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('boot sem sessão vai ao login com o caminho atual', { tag: '@F0.5' }, async ({ page }) => {
    await semSessao(page);
    await page.goto('/aplicacoes');

    await page.waitForURL(
      (url) => url.pathname === '/api/v1/auth/login' && url.searchParams.get('returnUrl') === '/aplicacoes',
    );
    await expect(page.getByRole('heading', { name: 'Keycloak (simulado)' })).toBeVisible();
  });

  test('boot com token vencido renova uma vez e entra sem mostrar login', { tag: '@F0.5' }, async ({ page }) => {
    const chamadas = await comTokenVencido(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    expect(chamadas).toEqual({ me: 2, refresh: 1 });
  });

  test('Sair leva ao logout da API', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page);
    await page.goto('/');

    await menuDoUsuario(page).click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();

    await page.waitForURL('**/api/v1/auth/logout');
  });

  test('o menu do usuário mostra e-mail e perfis', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page);
    await page.goto('/');

    await menuDoUsuario(page).click();

    const menu = page.getByRole('menu');
    await expect(menu).toContainText('dev@esteira.local');
    await expect(menu).toContainText('mor');
  });

  test('sem perfil o usuário abre /sem-acesso e vê no menu só o que não exige perfil', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page, SEM_PAPEL);
    await page.goto('/sem-acesso');

    await expect(page.getByRole('heading', { level: 1, name: 'Sem acesso' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link')).toHaveCount(3); // marca + Início + Aplicações (o papel por Aplicação vem da API, não do `me`)
  });

  test('rota desconhecida mostra "não encontrado" dentro do shell', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page);
    await page.goto('/nao-existe');

    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  });
});

test.describe('responsivo', () => {
  // largura → como o menu deve estar (DESIGN.md, Layout)
  const casos = [
    { largura: 2560, menu: 'completo' },
    { largura: 1280, menu: 'completo' },
    { largura: 1100, menu: 'completo' },
    { largura: 1099, menu: 'icones' },
    { largura: 1000, menu: 'icones' },
    { largura: 760, menu: 'icones' },
    { largura: 759, menu: 'barra' },
    { largura: 700, menu: 'barra' },
    { largura: 320, menu: 'barra' },
  ] as const;

  for (const { largura, menu } of casos) {
    test(`${largura}px: sem rolagem lateral e menu em modo ${menu}`, { tag: '@F0.5' }, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await comSessao(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();

      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(sobra).toBeLessThanOrEqual(0);

      const nav = (await page.getByRole('navigation', { name: 'Principal' }).boundingBox())!;
      if (menu === 'completo') expect(Math.round(nav.width)).toBe(240);
      if (menu === 'icones') expect(Math.round(nav.width)).toBe(64);
      if (menu === 'barra') {
        expect(Math.round(nav.width)).toBe(largura);
        expect(nav.y).toBe(0);
        expect(nav.height).toBeLessThan(72);
      }

      const conteudo = (await page.locator('main').boundingBox())!;
      expect(conteudo.width).toBeLessThanOrEqual(1680);
    });
  }
});

test.describe('acessibilidade e teclado', () => {
  for (const [nome, rota] of [
    ['Início', '/'],
    ['Sem acesso', '/sem-acesso'],
    ['Não encontrado', '/nao-existe'],
  ]) {
    test(`${nome}: sem violação WCAG 2.1 AA`, { tag: '@F0.5' }, async ({ page }) => {
      await comSessao(page);
      await page.goto(rota);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const resultado = await new AxeBuilder({ page }).withTags(WCAG).analyze();

      expect(resultado.violations).toEqual([]);
    });
  }

  test('menu do usuário aberto: sem violação WCAG 2.1 AA', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page);
    await page.goto('/');
    await menuDoUsuario(page).click();
    await expect(page.getByRole('menu')).toBeVisible();

    const resultado = await new AxeBuilder({ page }).withTags(WCAG).analyze();

    expect(resultado.violations).toEqual([]);
  });

  test('dá para usar só o teclado: pular, menu lateral e menu do usuário', { tag: '@F0.5' }, async ({ page }) => {
    await comSessao(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 1. o primeiro Tab cai no link de pular, que aparece; Enter leva o foco ao conteúdo
    await page.keyboard.press('Tab');
    const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(pular).toBeFocused();
    await expect(pular).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();

    // 2. na ordem do foco, depois do pular vêm a marca e o menu lateral
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Esteira' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Início' })).toBeFocused();

    // 3. o menu do usuário abre e fecha pelo teclado e devolve o foco ao botão
    await menuDoUsuario(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(menuDoUsuario(page)).toBeFocused();

    // 4. Sair também funciona só pelo teclado
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Sair' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/api/v1/auth/logout');
  });
});
