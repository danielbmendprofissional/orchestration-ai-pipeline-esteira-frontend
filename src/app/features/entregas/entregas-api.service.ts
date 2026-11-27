import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Entrega, EntregaEtapa } from './entregas.tipos';

const ENTREGAS = '/api/v1/entregas';

/** Camada API da tela da Entrega (ADR-0005): só HttpClient e URL. A API omite campo nulo; aqui ausente vira `null`. */
@Injectable({ providedIn: 'root' })
export class EntregasApiService {
  private readonly http = inject(HttpClient);

  async obter(id: string): Promise<Entrega> {
    const corpo = await firstValueFrom(this.http.get<Entrega>(`${ENTREGAS}/${encodeURIComponent(id)}`));
    return {
      ...corpo,
      vezDe: corpo.vezDe ?? null,
      fluxos: (corpo.fluxos ?? []).map((f) => ({
        ...f,
        etapas: (f.etapas ?? []).map(
          (e): EntregaEtapa => ({ ...e, codigoFalha: e.codigoFalha ?? null, pulada: e.pulada ?? null, pipelineUrl: e.pipelineUrl ?? null }),
        ),
      })),
    };
  }
}
