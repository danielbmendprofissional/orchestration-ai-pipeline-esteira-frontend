import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Pagina, PedidoDePagina } from '../../core/http/paginacao';
import { ENTREGAS_DO_PREVIEW } from './entregas-api.service.preview';
import type { Achado, AnaliseDaEtapa, AnalisesDaEtapa } from './analises.tipos';

/**
 * Dados falsos do build `preview` (`docs/agents/padrao-frontend.md`, "Preview da Fatia"): o angular.json troca
 * `analises-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `analises-api.service.preview.spec.ts`). Tipados pelos tipos gerados do OpenAPI: campo fora do contrato quebra o build.
 * Só a Etapa hml da Entrega `ENTREGA_BLOQUEADA_DO_PREVIEW` tem Análises; as outras vêm vazias.
 */
export const ENTREGA_BLOQUEADA_DO_PREVIEW = ENTREGAS_DO_PREVIEW[4];
export const FLUXO_BLOQUEADO_DO_PREVIEW = 'f-e5-api';

const RECEBIDA_EM = '2026-11-28T09:30:00Z';
const SEVERIDADES = ['critica', 'alta', 'media', 'baixa'] as const;

/** Achados de uma Análise: `n` de cada severidade, em ordem de gravidade (a API devolve nessa ordem). */
function achadosDe(fonte: string, quantidade: Record<(typeof SEVERIDADES)[number], number>): Achado[] {
  return SEVERIDADES.flatMap((s) =>
    Array.from({ length: quantidade[s] }, (_, i): Achado => ({
      severidade: s,
      titulo: i === 0 && s === 'critica' ? 'Possível injeção de SQL por concatenação de entrada <script>alert(1)</script>' : `${fonte}: achado ${s} ${i + 1}`,
      regraId: `${fonte}.regra-${s}-${i + 1}`,
      arquivo: i % 4 === 3 ? null : `src/Valuto.Api/Repositorios/Contas${i + 1}.cs`,
      linha: i % 4 === 3 ? null : 10 + i * 7,
      descricao: i % 3 === 0 ? null : `A entrada chega sem validação até ${fonte}; confira o fluxo de dados antes de liberar.`,
    })),
  );
}

interface Semente {
  id: string;
  escopo: string;
  fonte: string;
  tipo: string;
  veredito: string;
  destino: string | null;
  custoUsd: number | null;
  quantidade: Record<(typeof SEVERIDADES)[number], number>;
}
const sem = (critica: number, alta: number, media: number, baixa: number) => ({ critica, alta, media, baixa });

const SEMENTES: Semente[] = [
  { id: '019a0000-0000-7000-8000-00000000a001', escopo: 'artefato', fonte: 'opengrep', tipo: 'ferramenta', veredito: 'reprovado', destino: null, custoUsd: null, quantidade: sem(2, 5, 18, 20) },
  { id: '019a0000-0000-7000-8000-00000000a002', escopo: 'artefato', fonte: 'trivy-fs', tipo: 'ferramenta', veredito: 'aprovado', destino: null, custoUsd: null, quantidade: sem(0, 0, 2, 3) },
  { id: '019a0000-0000-7000-8000-00000000a003', escopo: 'artefato', fonte: 'agent-security', tipo: 'agente', veredito: 'aprovado', destino: null, custoUsd: 0.31, quantidade: sem(0, 0, 0, 0) },
  { id: '019a0000-0000-7000-8000-00000000a004', escopo: 'deploy', fonte: 'zap', tipo: 'ferramenta', veredito: 'reprovado', destino: 'k8s-hml-a', custoUsd: null, quantidade: sem(0, 1, 3, 0) },
  { id: '019a0000-0000-7000-8000-00000000a005', escopo: 'deploy', fonte: 'smoke', tipo: 'ferramenta', veredito: 'aprovado', destino: 'k8s-hml-a', custoUsd: null, quantidade: sem(0, 0, 0, 0) },
  { id: '019a0000-0000-7000-8000-00000000a006', escopo: 'deploy', fonte: 'rollout', tipo: 'ferramenta', veredito: 'aprovado', destino: 'k8s-hml-b', custoUsd: null, quantidade: sem(0, 0, 0, 0) },
];

const total = (s: (typeof SEVERIDADES)[number]) => SEMENTES.reduce((n, x) => n + x.quantidade[s], 0);

const gate: AnalisesDaEtapa['gate'] = {
  momento: 'gate',
  decisao: 'bloqueado',
  motivo: 'gate.politica-violada',
  contagem: { critica: total('critica'), alta: total('alta'), media: total('media'), baixa: total('baixa') },
  decididaEm: RECEBIDA_EM,
};

const analises = (): AnaliseDaEtapa[] =>
  SEMENTES.map((s) => ({
    id: s.id, escopo: s.escopo, fonte: s.fonte, tipo: s.tipo, veredito: s.veredito, destino: s.destino, custoUsd: s.custoUsd, recebidaEm: RECEBIDA_EM,
    contagem: { ...s.quantidade, info: 0 },
  }));

const naoEncontrada = () => new HttpErrorResponse({ status: 404, error: { errors: [{ code: 'analise.nao-encontrada', message: 'Análise não encontrada.', type: 'NotFound' }] } });

@Injectable({ providedIn: 'root' })
export class AnalisesApiService {
  analisesDaEtapa(entregaId: string, fluxoId: string, etapa: string): Promise<AnalisesDaEtapa> {
    const tem = entregaId === ENTREGA_BLOQUEADA_DO_PREVIEW && fluxoId === FLUXO_BLOQUEADO_DO_PREVIEW && etapa === 'hml';
    return Promise.resolve(tem ? { gate: structuredClone(gate), analises: analises() } : { gate: null, analises: [] });
  }

  achados(entregaId: string, fluxoId: string, analiseId: string, pedido: PedidoDePagina, severidade?: string): Promise<Pagina<Achado>> {
    const semente = entregaId === ENTREGA_BLOQUEADA_DO_PREVIEW && fluxoId === FLUXO_BLOQUEADO_DO_PREVIEW ? SEMENTES.find((s) => s.id === analiseId) : undefined;
    if (!semente) return Promise.reject(naoEncontrada());
    const todos = achadosDe(semente.fonte, semente.quantidade).filter((a) => !severidade || a.severidade === severidade);
    const totalPaginas = Math.ceil(todos.length / pedido.tamanho);
    const inicio = (pedido.pagina - 1) * pedido.tamanho;
    return Promise.resolve({ itens: todos.slice(inicio, inicio + pedido.tamanho), total: todos.length, totalPaginas, pagina: pedido.pagina, tamanho: pedido.tamanho });
  }
}
