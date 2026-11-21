import { HttpHeaders, HttpResponse } from '@angular/common/http';

/** Página lida dos headers `X-*` (ADR-0002): o corpo é o array puro e nenhuma page conhece header. */
export interface Pagina<T> {
  itens: T[];
  total: number;
  totalPaginas: number;
  pagina: number;
  tamanho: number;
}

export interface PedidoDePagina {
  /** 1-based. */
  pagina: number;
  tamanho: number;
}

function inteiro(resposta: HttpResponse<unknown>, header: string): number {
  const bruto = resposta.headers.get(header);
  if (bruto === null || !/^\d+$/.test(bruto)) {
    throw new Error(`Contrato de paginação quebrado: o header ${header} está ausente ou não é um número inteiro (${JSON.stringify(bruto)}).`);
  }
  return Number(bruto);
}

/**
 * Header ausente ou não numérico é erro explícito: contrato quebrado precisa aparecer, não virar lista vazia.
 */
export function lerPagina<T>(resposta: HttpResponse<T[]>): Pagina<T> {
  const itens = resposta.body;
  if (!Array.isArray(itens)) {
    throw new Error('Contrato de paginação quebrado: o corpo da resposta deveria ser o array puro.');
  }
  return {
    itens,
    total: inteiro(resposta, 'X-Total-Count'),
    totalPaginas: inteiro(resposta, 'X-Total-Pages'),
    pagina: inteiro(resposta, 'X-Page'),
    tamanho: inteiro(resposta, 'X-Page-Size'),
  };
}

/** Headers de requisição `X-Page` e `X-Page-Size`; mantém os que já existiam. Usar com `observe: 'response'`. */
export function cabecalhosDePaginacao({ pagina, tamanho }: PedidoDePagina, existentes = new HttpHeaders()): HttpHeaders {
  return existentes.set('X-Page', String(pagina)).set('X-Page-Size', String(tamanho));
}
