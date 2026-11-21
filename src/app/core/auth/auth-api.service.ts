import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { components } from '../api/esteira-api';

export type UsuarioLogado = components['schemas']['UsuarioLogadoDto'];

/** Camada API da sessão (ADR-0004): só HttpClient e URL, sem regra nem signal. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  me(): Promise<UsuarioLogado> {
    return firstValueFrom(this.http.get<UsuarioLogado>('/api/v1/usuarios/me'));
  }

  /** 204 sem corpo; a rotação do token acontece no servidor, o cookie não muda. */
  async refresh(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/v1/auth/refresh', null));
  }
}
