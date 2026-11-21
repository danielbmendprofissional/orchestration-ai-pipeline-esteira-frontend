import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AppConfigService } from './core/config/app-config.service';
import { sessaoInterceptor } from './core/http/sessao.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([sessaoInterceptor])),
    // Sequencial de propósito (inicializadores separados rodam em paralelo): o /config.json vem antes de
    // qualquer outro serviço (ADR-0006; sem ele o app não sobe) e só então o `me` da sessão (ADR-0004).
    provideAppInitializer(async () => {
      await inject(AppConfigService).carregar();
      await inject(AuthService).carregar();
    }),
    provideRouter(routes),
    provideSpartanHlm(),
  ],
};
