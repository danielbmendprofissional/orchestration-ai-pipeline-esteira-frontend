import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { cabecalhosDePaginacao, lerPagina, type Pagina, type PedidoDePagina } from '../../core/http/paginacao';
import type {
  AlterarAplicacaoRequest,
  AplicacaoDetalhe,
  AplicacaoLista,
  CriarAplicacaoRequest,
  FiltroApi,
  PermissoesAplicacao,
  PermissoesGlobais,
} from './aplicacoes.tipos';

const BASE = '/api/v1/aplicacoes';

/** Camada API de Aplicações (ADR-0005): só HttpClient e URL, sem regra nem signal. */
@Injectable({ providedIn: 'root' })
export class AplicacoesApiService {
  private readonly http = inject(HttpClient);

  async listar(filtro: FiltroApi, pedido: PedidoDePagina): Promise<Pagina<AplicacaoLista>> {
    let params = new HttpParams();
    if (filtro.busca) params = params.set('busca', filtro.busca);
    if (filtro.ativa !== undefined) params = params.set('ativa', String(filtro.ativa));
    if (filtro.sort) params = params.set('sort', filtro.sort);
    if (filtro.order) params = params.set('order', filtro.order);

    const resposta = await firstValueFrom(
      this.http.get<AplicacaoLista[]>(BASE, { params, headers: cabecalhosDePaginacao(pedido), observe: 'response' }),
    );
    return lerPagina(resposta);
  }

  permissoesGlobais(): Promise<PermissoesGlobais> {
    return firstValueFrom(this.http.get<PermissoesGlobais>(`${BASE}/permissoes`));
  }

  permissoes(id: string): Promise<PermissoesAplicacao> {
    return firstValueFrom(this.http.get<PermissoesAplicacao>(`${BASE}/${id}/permissoes`));
  }

  obter(id: string): Promise<AplicacaoDetalhe> {
    return firstValueFrom(this.http.get<AplicacaoDetalhe>(`${BASE}/${id}`));
  }

  criar(pedido: CriarAplicacaoRequest): Promise<AplicacaoLista> {
    return firstValueFrom(this.http.post<AplicacaoLista>(BASE, pedido));
  }

  alterar(id: string, pedido: AlterarAplicacaoRequest): Promise<AplicacaoLista> {
    return firstValueFrom(this.http.put<AplicacaoLista>(`${BASE}/${id}`, pedido));
  }
}
