import type { Page, Route } from '@playwright/test';
import type { components } from '../src/app/core/api/esteira-api';

// API simulada do BFF (ADR-0004) para o E2E: o login real depende do Keycloak e do Redis no ar.
// O corpo do `me` é tipado pelo contrato gerado, então campo fora do OpenAPI quebra aqui também.
type UsuarioLogado = components['schemas']['UsuarioLogadoDto'];

export const DEV: UsuarioLogado = { usuario: 'dev', nome: 'Dev Esteira', email: 'dev@esteira.local', perfis: ['mor'] };
export const SEM_PAPEL: UsuarioLogado = { usuario: 'dev-sem-papel', nome: 'Sem Papel', email: 'sem.papel@esteira.local', perfis: [] };

const json = (rota: Route, status: number, corpo?: unknown) =>
  rota.fulfill({ status, contentType: 'application/json', body: corpo === undefined ? '' : JSON.stringify(corpo) });

export const erro401 = (code: string) => ({ errors: [{ code, message: 'Sessão necessária.', type: 'Unauthorized' }] });

/** Login e logout são navegação de página inteira: o teste só confere para onde a página foi. */
async function simularKeycloak(page: Page) {
  const pagina = (rota: Route) =>
    rota.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Keycloak (simulado)</h1>' });
  await page.route('**/api/v1/auth/login*', pagina);
  await page.route('**/api/v1/auth/logout*', pagina);
}

export async function comSessao(page: Page, usuario: UsuarioLogado = DEV) {
  await simularKeycloak(page);
  await page.route('**/api/v1/usuarios/me', (rota) => json(rota, 200, usuario));
}

export async function semSessao(page: Page) {
  await simularKeycloak(page);
  await page.route('**/api/v1/usuarios/me', (rota) => json(rota, 401, erro401('auth.nao-autenticado')));
}

/** O primeiro `me` volta com o access token vencido; depois do refresh (204) volta o usuário. */
export async function comTokenVencido(page: Page, usuario: UsuarioLogado = DEV) {
  const chamadas = { me: 0, refresh: 0 };
  await simularKeycloak(page);
  await page.route('**/api/v1/usuarios/me', (rota) =>
    chamadas.me++ === 0 ? json(rota, 401, erro401('auth.access-token-expired')) : json(rota, 200, usuario),
  );
  await page.route('**/api/v1/auth/refresh', (rota) => {
    chamadas.refresh++;
    return json(rota, 204);
  });
  return chamadas;
}
