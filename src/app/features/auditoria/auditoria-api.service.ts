import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { cabecalhosDePaginacao, lerPagina, type Pagina } from '../../core/http/paginacao';
import type { CategoriaContagemBruta, FiltroAuditoria, FiltrosDeAuditoria, PedidoDePagina, RegistroDaLista, RegistroDetalhe } from './auditoria.tipos';

const AUDITORIA = '/api/v1/auditoria';

/** Query dos filtros: só o que foi pedido; `periodoDias` nulo ("tudo") e texto vazio ficam de fora. */
export function paramsDoFiltro(filtro: FiltroAuditoria, incluirCategoria = true): HttpParams {
  let params = new HttpParams();
  const texto: [string, string | undefined][] = [
    ['aplicacaoId', filtro.aplicacaoId],
    ['quem', filtro.quem],
    ['categoria', incluirCategoria ? filtro.categoria : undefined],
    ['objeto', filtro.objeto],
    ['busca', filtro.busca],
    ['sort', filtro.sort],
    ['order', filtro.order],
  ];
  for (const [nome, valor] of texto) if (valor) params = params.set(nome, valor);
  if (filtro.periodoDias) params = params.set('periodoDias', String(filtro.periodoDias));
  return params;
}

/** Camada API da Auditoria (ADR-0005): só HttpClient e URL, sem regra nem signal. Só leitura. */
@Injectable({ providedIn: 'root' })
export class AuditoriaApiService {
  private readonly http = inject(HttpClient);

  /** Array puro; a paginação vem nos headers `X-*` (ADR-0002). */
  async listar(filtro: FiltroAuditoria, pedido: PedidoDePagina): Promise<Pagina<RegistroDaLista>> {
    const resposta = await firstValueFrom(
      this.http.get<RegistroDaLista[]>(AUDITORIA, { params: paramsDoFiltro(filtro), headers: cabecalhosDePaginacao(pedido), observe: 'response' }),
    );
    return lerPagina(resposta);
  }

  /** Mesmos filtros da lista, menos `categoria` (as contagens são de todas as categorias). */
  categorias(filtro: FiltroAuditoria): Promise<CategoriaContagemBruta[]> {
    return firstValueFrom(this.http.get<CategoriaContagemBruta[]>(`${AUDITORIA}/categorias`, { params: paramsDoFiltro(filtro, false) }));
  }

  filtros(): Promise<FiltrosDeAuditoria> {
    return firstValueFrom(this.http.get<FiltrosDeAuditoria>(`${AUDITORIA}/filtros`));
  }

  detalhe(id: string): Promise<RegistroDetalhe> {
    return firstValueFrom(this.http.get<RegistroDetalhe>(`${AUDITORIA}/${encodeURIComponent(id)}`));
  }
}
