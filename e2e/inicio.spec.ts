import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { comSessao } from './sessao-falsa';

test('abre a Esteira com o ambiente do /config.json', { tag: '@F0' }, async ({ page }) => {
  await comSessao(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
  await expect(page.getByRole('banner').getByText('DEV', { exact: true })).toBeVisible();
});

test('não tem violação de acessibilidade WCAG 2.1 AA', { tag: '@F0' }, async ({ page }) => {
  await comSessao(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

  expect(resultado.violations).toEqual([]);
});
