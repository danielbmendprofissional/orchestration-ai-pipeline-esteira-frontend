import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('abre a Esteira com o ambiente do /config.json', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Esteira' })).toBeVisible();
  await expect(page.getByText('DEV')).toBeVisible();
});

test('não tem violação de acessibilidade WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

  expect(resultado.violations).toEqual([]);
});
