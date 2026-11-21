import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Notificador } from '../notificacao/notificador.service';
import { ehDaApi, errosDaResposta } from './erro-api';

export const MENSAGEM_GENERICA = 'Algo deu errado. Tente de novo.';

/**
 * Mensagem de erro para a pessoa (ADR-0003, `docs/agents/padrao-api.md`). Decide pela forma do corpo:
 *
 * - `errors[]` (400, 403, 404, 409, 422): um toast com o `message` de cada erro. O erro segue intacto
 *   para a page, que lê o `code` com `codigoDoErro`.
 * - Problem Details (500), falha de rede ou corpo sem a forma esperada (HTML do proxy): mensagem genérica;
 *   só o `traceId` vai ao console. Nunca stacktrace nem detalhe técnico na tela.
 * - 401: fica com o `sessaoInterceptor` (renovação ou login). Este interceptor é o mais interno da lista
 *   justamente para ver a resposta antes dele e ignorar o 401; o erro de um refresh que falhou aparece uma
 *   vez só, quando o próprio refresh responde.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificador = inject(Notificador);

  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse) || erro.status === 401 || !ehDaApi(req.url)) return throwError(() => erro);

      const erros = errosDaResposta(erro);
      if (erros.length > 0) {
        erros.forEach((e) => notificador.erro(e.message));
      } else {
        notificador.erro(MENSAGEM_GENERICA);
        console.error('Erro inesperado da API', { status: erro.status, traceId: traceIdDe(erro) });
      }
      return throwError(() => erro);
    }),
  );
};

function traceIdDe(erro: HttpErrorResponse): string | null {
  const traceId = (erro.error as { traceId?: unknown } | null)?.traceId;
  return typeof traceId === 'string' ? traceId : null;
}
