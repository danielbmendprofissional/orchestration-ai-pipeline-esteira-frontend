import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { cabecalhosDePaginacao } from '../../core/http/paginacao';
import type { FiltroFatias, Gaveta, Hotfixes, PainelLista, PedidoDePagina } from './fatias.tipos';

const FATIAS = '/api/v1/fatias';
const APLICACOES = '/api/v1/aplicacoes';

/** Camada API do Painel de Fatias (ADR-0005): só HttpClient e URL, sem regra nem signal. Só leitura (o POST de atualizar apenas descarta o guardado). */
@Injectable({ providedIn: 'root' })
export class FatiasApiService {
  private readonly http = inject(HttpClient);

  /** O corpo já traz página e totais; os headers `X-*` vão na requisição por contrato (ADR-0002). */
  listar(filtro: FiltroFatias, pedido: PedidoDePagina): Promise<PainelLista> {
    let params = new HttpParams().set('aba', filtro.aba);
    if (filtro.fatia) params = params.set('fatia', filtro.fatia);
    if (filtro.projeto) params = params.set('projeto', filtro.projeto);
    if (filtro.aplicacoes?.length) params = params.set('aplicacoes', filtro.aplicacoes.join(','));
    if (filtro.sort) params = params.set('sort', filtro.sort);
    if (filtro.order) params = params.set('order', filtro.order);

    return firstValueFrom(this.http.get<PainelLista>(FATIAS, { params, headers: cabecalhosDePaginacao(pedido) }));
  }

  async atualizar(aplicacaoId: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${APLICACOES}/${aplicacaoId}/fatias/atualizar`, null));
  }

  gaveta(aplicacaoId: string, codigo: string): Promise<Gaveta> {
    return firstValueFrom(this.http.get<Gaveta>(`${APLICACOES}/${aplicacaoId}/fatias/${encodeURIComponent(codigo)}`));
  }

  hotfixes(aplicacaoId: string): Promise<Hotfixes> {
    return firstValueFrom(this.http.get<Hotfixes>(`${APLICACOES}/${aplicacaoId}/hotfixes`));
  }
}
