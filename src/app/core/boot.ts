import { inject } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { AppConfigService } from './config/app-config.service';

/**
 * Boot do app, num inicializador só: inicializadores separados rodam em paralelo, e a ordem importa.
 * Primeiro o `/config.json` (ADR-0006; sem ele o app não sobe) e só então o `me` da sessão (ADR-0004).
 *
 * Os dois `inject` vêm antes do primeiro `await`: depois dele o contexto de injeção se perde (NG0203).
 */
export async function iniciarApp(): Promise<void> {
  const config = inject(AppConfigService);
  const auth = inject(AuthService);

  await config.carregar();
  await auth.carregar();
}
