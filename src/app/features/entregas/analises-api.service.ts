import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { cabecalhosDePaginacao, lerPagina, type Pagina, type PedidoDePagina } from '../../core/http/paginacao';
import type { Achado, AnalisesDaEtapa } from './analises.tipos';

const ENTREGAS = '/api/v1/entregas';

/** Camada API das Análises (E2): só HttpClient e URL. A API omite campo nulo; aqui ausente vira `null`. */
@Injectable({ providedIn: 'root' })
export class AnalisesApiService {
  private readonly http = inject(HttpClient);

  async analisesDaEtapa(entregaId: string, fluxoId: string, etapa: string): Promise<AnalisesDaEtapa> {
    const url = `${ENTREGAS}/${encodeURIComponent(entregaId)}/fluxos/${encodeURIComponent(fluxoId)}/etapas/${encodeURIComponent(etapa)}/analises`;
    const corpo = await firstValueFrom(this.http.get<AnalisesDaEtapa>(url));
    return {
      gate: corpo.gate ? { ...corpo.gate, motivo: corpo.gate.motivo ?? null } : null,
      analises: (corpo.analises ?? []).map((a) => ({ ...a, destino: a.destino ?? null, custoUsd: a.custoUsd ?? null })),
    };
  }

  async achados(entregaId: string, fluxoId: string, analiseId: string, pedido: PedidoDePagina, severidade?: string): Promise<Pagina<Achado>> {
    const url = `${ENTREGAS}/${encodeURIComponent(entregaId)}/fluxos/${encodeURIComponent(fluxoId)}/analises/${encodeURIComponent(analiseId)}/achados`;
    const resposta = await firstValueFrom(
      this.http.get<Achado[]>(url, {
        observe: 'response',
        headers: cabecalhosDePaginacao(pedido, new HttpHeaders()),
        params: severidade ? new HttpParams().set('severidade', severidade) : undefined,
      }),
    );
    const pagina = lerPagina(resposta);
    return {
      ...pagina,
      itens: pagina.itens.map((a) => ({ ...a, regraId: a.regraId ?? null, arquivo: a.arquivo ?? null, linha: a.linha ?? null, descricao: a.descricao ?? null })),
    };
  }
}
