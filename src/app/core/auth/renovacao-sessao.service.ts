import { Injectable, inject } from '@angular/core';
import { AuthApiService } from './auth-api.service';

/**
 * Uma renovação por vez: várias requisições que vencem juntas (várias abas, vários componentes) esperam
 * o mesmo `POST /auth/refresh`. Sem isso, a segunda chamada usaria um refresh token já rotacionado e o
 * servidor revogaria a sessão inteira (reuse detection, ADR-0004).
 */
@Injectable({ providedIn: 'root' })
export class RenovacaoSessaoService {
  private readonly api = inject(AuthApiService);
  private emAndamento: Promise<void> | null = null;

  renovar(): Promise<void> {
    this.emAndamento ??= this.api.refresh().finally(() => (this.emAndamento = null));
    return this.emAndamento;
  }
}
