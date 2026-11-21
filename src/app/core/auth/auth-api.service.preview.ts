import { Injectable } from '@angular/core';
import type { components } from '../api/esteira-api';

export type UsuarioLogado = components['schemas']['UsuarioLogadoDto'];

/**
 * Sessão falsa do build `preview` (ADR-0022; `docs/agents/padrao-frontend.md`, "Preview da Fatia"): o preview é um
 * build estático servido por um nginx mínimo, sem API, sem Keycloak e sem banco. O angular.json troca
 * `auth-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `auth-api.service.preview.spec.ts`). O usuário é tipado pelo contrato gerado: dado fora do OpenAPI quebra o build.
 *
 * Fatia que cria tela nova deste front acrescenta aqui os dados falsos dela, no mesmo estilo.
 */
const USUARIO_DO_PREVIEW: UsuarioLogado = {
  usuario: 'preview',
  nome: 'Pessoa de Preview',
  email: 'preview@esteira.local',
  perfis: ['mor'],
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  me(): Promise<UsuarioLogado> {
    return Promise.resolve(USUARIO_DO_PREVIEW);
  }

  refresh(): Promise<void> {
    return Promise.resolve();
  }
}
