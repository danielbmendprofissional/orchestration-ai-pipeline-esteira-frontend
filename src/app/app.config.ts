import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { iniciarApp } from './core/boot';
import { errorInterceptor } from './core/http/error.interceptor';
import { sessaoInterceptor } from './core/http/sessao.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // sessaoInterceptor por fora, errorInterceptor por dentro: o 401 passa pela sessão antes do toast.
    provideHttpClient(withFetch(), withInterceptors([sessaoInterceptor, errorInterceptor])),
    // Config e sessão, nessa ordem, antes de qualquer rota (ver core/boot.ts).
    provideAppInitializer(iniciarApp),
    provideRouter(routes),
    provideSpartanHlm(),
  ],
};
