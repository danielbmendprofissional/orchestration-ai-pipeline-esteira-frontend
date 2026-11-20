import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Configuração de ambiente lida em runtime (ADR-0006). Pública: nunca segredo aqui. */
export interface AppConfig {
  /** Rótulo do ambiente mostrado no header (DEV, QA, HML, PRD). */
  ambiente: string;
}

/**
 * O bundle não carrega nada de ambiente: a mesma imagem roda em qa, hml e produção.
 * No boot o app busca `/config.json` (em dev, `public/config.json`; nos ambientes,
 * o nginx do template-ci responde com a variável APP_RUNTIME_CONFIG).
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly carregada = signal<AppConfig | null>(null);

  readonly config = (): AppConfig => {
    const config = this.carregada();
    if (!config) {
      throw new Error('Configuração não carregada: AppConfigService.carregar() roda no provideAppInitializer.');
    }
    return config;
  };

  async carregar(): Promise<void> {
    this.carregada.set(await firstValueFrom(this.http.get<AppConfig>('/config.json')));
  }
}
