import { HttpErrorResponse } from '@angular/common/http';
import type { components } from '../api/esteira-api';

export type ErroApi = components['schemas']['ErroNaResposta'];

/** Códigos estáveis de sessão (spec B3, `docs/agents/padrao-api.md`): o front decide pelo `code`, nunca pelo status. */
export const CODIGO = {
  tokenExpirado: 'auth.access-token-expired',
  naoAutenticado: 'auth.nao-autenticado',
  sessaoInvalida: 'auth.sessao-invalida',
  provedorIndisponivel: 'auth.provedor-indisponivel',
} as const;

/** `errors[]` do corpo (ADR-0003), ou lista vazia quando a resposta tem outra forma (Problem Details, rede, HTML do proxy). */
export function errosDaResposta(erro: unknown): ErroApi[] {
  if (!(erro instanceof HttpErrorResponse)) return [];
  const lista = (erro.error as { errors?: unknown } | null)?.errors;
  return Array.isArray(lista) ? (lista as ErroApi[]) : [];
}

/** Código do primeiro erro, ou `null`. */
export function codigoDoErro(erro: unknown): string | null {
  return errosDaResposta(erro)[0]?.code ?? null;
}
