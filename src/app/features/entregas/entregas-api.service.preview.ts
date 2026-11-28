import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Entrega, EntregaEtapa, EntregaFluxo } from './entregas.tipos';

/**
 * Dados falsos do build `preview` (`docs/agents/padrao-frontend.md`, "Preview da Fatia"): o angular.json troca
 * `entregas-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `entregas-api.service.preview.spec.ts`). Quatro Entregas de exemplo, uma por estado, tipadas pelo contrato gerado
 * (campo fora do OpenAPI quebra o build), em memória, sem API.
 */
const APLICACAO = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto' };
const ABERTA_EM = '2026-11-27T10:00:00Z';
const GITLAB = 'https://gitlab.exemplo.local/valuto/valuto-api/-/pipelines';

/** Ids de exemplo, na ordem: QA executando · HML aguardando aprovação · QA falhou · Atalho (QA e HML pulados) · HML bloqueada pelo gate (E2). */
export const ENTREGAS_DO_PREVIEW = [
  '019a0000-0000-7000-8000-0000000000e1',
  '019a0000-0000-7000-8000-0000000000e2',
  '019a0000-0000-7000-8000-0000000000e3',
  '019a0000-0000-7000-8000-0000000000e4',
  '019a0000-0000-7000-8000-0000000000e5',
] as const;

const etapa = (nome: string, estado: string, extra: Partial<EntregaEtapa> = {}): EntregaEtapa => ({
  etapa: nome, estado, codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: ABERTA_EM, ...extra,
});
const fluxo = (id: string, projeto: string, etapas: EntregaEtapa[], fatias = [{ codigo: 'E1b', comFlag: true }, { codigo: 'E1a', comFlag: false }]): EntregaFluxo => ({
  id, projeto: { id: 'p-' + id, nome: projeto }, tipoMudanca: 'feature', sha: '3f9c2ab71d', fatias, etapas,
});
const entrega = (n: number, estado: string, fluxos: EntregaFluxo[], vezDe: string | null = null): Entrega => ({
  id: ENTREGAS_DO_PREVIEW[n], aplicacao: APLICACAO, abertaPor: { nome: 'Pessoa de Preview' }, abertaEm: ABERTA_EM, estado, vezDe, fluxos,
});

const estaticas = (): Entrega[] => [
  entrega(0, 'em-andamento', [
    fluxo('f-e1-api', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'executando', { pipelineUrl: `${GITLAB}/2841` }), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')]),
    fluxo('f-e1-web', 'valuto-frontend', [etapa('abertura', 'concluido'), etapa('qa', 'nao-iniciado'), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')]),
  ]),
  entrega(1, 'aguardando-aprovacao', [
    fluxo('f-e2-api', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'concluido', { pipelineUrl: `${GITLAB}/2790` }), etapa('hml', 'aguardando-aprovacao', { pipelineUrl: `${GITLAB}/2802` }), etapa('prd', 'nao-iniciado')]),
  ]),
  entrega(2, 'bloqueada-ou-falha', [
    fluxo('f-e3-api', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'falhou', { codigoFalha: 'pipeline.falhou', pipelineUrl: `${GITLAB}/2815` }), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')]),
  ]),
  entrega(3, 'em-andamento', [
    fluxo('f-e4-api', 'valuto-api', [
      etapa('abertura', 'concluido'),
      etapa('qa', 'pulada', { pulada: { por: 'Carla Mendes', motivo: 'falha no extrato de contas encerradas em produção' } }),
      etapa('hml', 'pulada', { pulada: { por: 'Carla Mendes', motivo: 'falha no extrato de contas encerradas em produção' } }),
      etapa('prd', 'concluido', { pipelineUrl: `${GITLAB}/2833` }),
    ], []),
  ]),
  entrega(4, 'bloqueada-ou-falha', [
    fluxo('f-e5-api', 'valuto-api', [etapa('abertura', 'concluido'), etapa('qa', 'concluido', { pipelineUrl: `${GITLAB}/2850` }), etapa('hml', 'bloqueada', { pipelineUrl: `${GITLAB}/2861` }), etapa('prd', 'nao-iniciado')], [{ codigo: 'E2', comFlag: true }]),
  ]),
];

let memoria = estaticas();

/** Só existe no preview: o botão de desenvolvimento avança a primeira Etapa em andamento (executando → aguardando aprovação → concluído). */
export function avancarEntregaFalsa(id: string): void {
  const atual = memoria.find((e) => e.id === id);
  const etapaAtual = atual?.fluxos.flatMap((f) => f.etapas).find((e) => e.estado === 'executando' || e.estado === 'aguardando-aprovacao');
  if (!atual || !etapaAtual) return;
  etapaAtual.estado = etapaAtual.estado === 'executando' ? 'aguardando-aprovacao' : 'concluido';
  etapaAtual.atualizadaEm = new Date().toISOString();
  const todas = atual.fluxos.flatMap((f) => f.etapas);
  atual.estado = todas.some((e) => e.estado === 'falhou') ? 'bloqueada-ou-falha' : todas.some((e) => e.estado === 'aguardando-aprovacao') ? 'aguardando-aprovacao' : 'em-andamento';
}

@Injectable({ providedIn: 'root' })
export class EntregasApiService {
  obter(id: string): Promise<Entrega> {
    const achada = memoria.find((e) => e.id === id);
    if (!achada) {
      return Promise.reject(new HttpErrorResponse({ status: 404, error: { errors: [{ code: 'entrega.nao-encontrada', message: 'Entrega não encontrada.', type: 'NotFound' }] } }));
    }
    return Promise.resolve(structuredClone(achada));
  }
}

/** Para os testes: volta os exemplos ao começo. */
export function reiniciarEntregasDoPreview(): void {
  memoria = estaticas();
}
