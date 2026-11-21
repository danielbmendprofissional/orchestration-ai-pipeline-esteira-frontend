import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { cabecalhosDePaginacao, lerPagina } from './paginacao';

const HEADERS = ['X-Total-Count', 'X-Total-Pages', 'X-Page', 'X-Page-Size'] as const;

const resposta = (corpo: unknown, headers: Record<string, string>) =>
  new HttpResponse<unknown[]>({ body: corpo as unknown[], headers: new HttpHeaders(headers) });

const valida = { 'X-Total-Count': '23', 'X-Total-Pages': '3', 'X-Page': '2', 'X-Page-Size': '10' };

describe('[F0.5] paginação por headers X-*', () => {
  it('lê o array puro e os quatro headers', () => {
    const pagina = lerPagina(resposta([{ id: 1 }, { id: 2 }], valida));

    expect(pagina).toEqual({ itens: [{ id: 1 }, { id: 2 }], total: 23, totalPaginas: 3, pagina: 2, tamanho: 10 });
  });

  it('aceita a lista vazia com total zero', () => {
    const pagina = lerPagina(
      resposta([], { 'X-Total-Count': '0', 'X-Total-Pages': '0', 'X-Page': '1', 'X-Page-Size': '10' }),
    );

    expect(pagina).toEqual({ itens: [], total: 0, totalPaginas: 0, pagina: 1, tamanho: 10 });
  });

  it.each(HEADERS)('falha com erro explícito quando o header %s não vem', (ausente) => {
    const headers: Record<string, string> = { ...valida };
    delete headers[ausente];

    expect(() => lerPagina(resposta([], headers))).toThrow(ausente);
  });

  it.each(['abc', '', '1.5', '-1', '1e3', ' 7'])('falha quando um header não é número inteiro (%j)', (invalido) => {
    expect(() => lerPagina(resposta([], { ...valida, 'X-Total-Count': invalido }))).toThrow('X-Total-Count');
  });

  it.each([null, { id: 1 }, 'texto'])('falha quando o corpo não é o array puro (%j)', (corpo) => {
    expect(() => lerPagina(resposta(corpo, valida))).toThrow(/array/i);
  });

  it('escreve X-Page e X-Page-Size na requisição', () => {
    const headers = cabecalhosDePaginacao({ pagina: 3, tamanho: 25 });

    expect(headers.get('X-Page')).toBe('3');
    expect(headers.get('X-Page-Size')).toBe('25');
  });

  it('preserva os headers que já existiam ao escrever a paginação', () => {
    const headers = cabecalhosDePaginacao({ pagina: 1, tamanho: 10 }, new HttpHeaders({ 'X-Outro': 'a' }));

    expect(headers.get('X-Outro')).toBe('a');
    expect(headers.get('X-Page')).toBe('1');
  });
});
