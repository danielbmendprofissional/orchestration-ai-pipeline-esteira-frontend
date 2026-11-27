/**
 * Contrato do `GET /api/v1/eventos` (ADR-0011). Ainda não está no `esteira-api.d.ts` gerado (o endpoint SSE não
 * entra no OpenAPI); quando entrar, estes tipos passam a vir de lá.
 */
export type EstadoTempoReal = 'ao-vivo' | 'reconectando' | 'consulta';

export interface AcaoAtualizada {
  tipo: 'acao.atualizada';
  aplicacaoId: string;
  fatiaCodigo: string;
  acaoId: string;
  estado: string;
}
export interface PipelineAtualizada {
  tipo: 'pipeline.atualizada';
  aplicacaoId: string;
  projetoId: string;
  pipelineId: number;
  status: string;
  ref: string;
  sha: string;
}
export interface FatiasMudaram {
  tipo: 'fatias.mudaram';
  aplicacaoId: string;
  fatiaCodigo?: string | null;
}
export interface EntregaAtualizada {
  tipo: 'entrega.atualizada';
  aplicacaoId: string;
  entregaId: string;
  fluxoId: string;
  etapa: string;
  estado: string;
}
/** Evento do servidor, tal como chega no SSE. */
export type EventoDoServidor = AcaoAtualizada | PipelineAtualizada | FatiasMudaram | EntregaAtualizada;
/** Gerado no cliente: reconexão ou consulta de 30 s. Pede recarga sem apontar Aplicação. */
export interface Recarga {
  tipo: 'recarga';
}
export type EventoTempoReal = EventoDoServidor | Recarga;

/** O que o serviço usa de um `EventSource` (permite um falso nos testes). */
export interface FonteDeEventos {
  readonly readyState: number;
  onopen: ((e: Event) => void) | null;
  onerror: ((e: Event) => void) | null;
  addEventListener(tipo: string, ouvinte: (e: MessageEvent<string>) => void): void;
  close(): void;
}

export const TIPOS_DE_EVENTO = ['acao.atualizada', 'pipeline.atualizada', 'fatias.mudaram', 'entrega.atualizada'] as const;
