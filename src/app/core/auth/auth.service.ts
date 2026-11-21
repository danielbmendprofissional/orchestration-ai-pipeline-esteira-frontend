import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthApiService, type UsuarioLogado } from './auth-api.service';
import { NAVEGADOR } from './navegador';
import { returnUrlSeguro } from './return-url';

/**
 * Sessão do usuário no front (ADR-0004). Nenhum token passa por aqui: o navegador só tem o cookie
 * HttpOnly `esteira_session`, e o que o front sabe é o que o `me` devolve.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly navegador = inject(NAVEGADOR);
  private readonly atual = signal<UsuarioLogado | null>(null);

  readonly usuario = this.atual.asReadonly();
  readonly autenticado = computed(() => this.atual() !== null);

  /** Boot: chama o `me` uma vez. Sem sessão (401), segue para o login e o app não renderiza a rota. */
  async carregar(): Promise<void> {
    try {
      this.atual.set(await this.api.me());
    } catch (erro) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) {
        this.entrar();
        return;
      }
      throw erro;
    }
  }

  private navegandoParaOLogin = false;

  /**
   * Login é navegação de página inteira: o Keycloak devolve para o `returnUrl` depois do callback.
   * Uma vez só: várias requisições podem receber 401 ao mesmo tempo e a página já está de saída.
   */
  entrar(returnUrl: string = this.navegador.caminhoAtual()): void {
    if (this.navegandoParaOLogin) return;
    this.navegandoParaOLogin = true;
    this.navegador.irPara(`/api/v1/auth/login?returnUrl=${encodeURIComponent(returnUrlSeguro(returnUrl))}`);
  }

  sair(): void {
    this.navegador.irPara('/api/v1/auth/logout');
  }
}
