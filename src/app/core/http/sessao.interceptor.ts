import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, defer, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RenovacaoSessaoService } from '../auth/renovacao-sessao.service';
import { CODIGO, caminhoDe, codigoDoErro, ehDaApi } from './erro-api';

const URL_REFRESH = '/api/v1/auth/refresh';

/** Marca a requisição que já foi repetida depois de um refresh: se vencer de novo, não há segundo refresh (sem laço). */
const JA_REPETIDA = new HttpContextToken<boolean>(() => false);

/**
 * Sessão BFF (ADR-0004), do lado do front. Nenhum token passa por aqui: o cookie `esteira_session` é HttpOnly
 * e o refresh é um POST sem corpo.
 *
 * - `auth.access-token-expired`: um refresh só para todas as requisições simultâneas, depois repete cada
 *   original uma vez.
 * - `auth.nao-autenticado` / `auth.sessao-invalida` (inclusive vindo do refresh): login de página inteira com
 *   o `returnUrl` atual.
 * - Qualquer outro erro (inclusive `auth.provedor-indisponivel` no refresh) segue para quem chamou: a sessão
 *   continua e o usuário fica na página.
 */
export const sessaoInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const renovacao = inject(RenovacaoSessaoService);
  return ehDaApi(req.url) ? tratar(req, next, auth, renovacao) : next(req);
};

function tratar(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  renovacao: RenovacaoSessaoService,
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse) || erro.status !== 401) return throwError(() => erro);

      const codigo = codigoDoErro(erro);
      const ehRefresh = caminhoDe(req.url) === URL_REFRESH;

      if (codigo === CODIGO.tokenExpirado && !ehRefresh && !req.context.get(JA_REPETIDA)) {
        // defer: o POST sai no mesmo instante em que o 401 chega, e o switchMap repete a original só depois.
        return defer(() => renovacao.renovar()).pipe(
          switchMap(() => tratar(req.clone({ context: req.context.set(JA_REPETIDA, true) }), next, auth, renovacao)),
        );
      }

      // 401 do próprio refresh, com qualquer código, é fim de sessão: sem login o usuário ficaria preso.
      if (ehRefresh || codigo === CODIGO.naoAutenticado || codigo === CODIGO.sessaoInvalida) auth.entrar();
      return throwError(() => erro);
    }),
  );
}
