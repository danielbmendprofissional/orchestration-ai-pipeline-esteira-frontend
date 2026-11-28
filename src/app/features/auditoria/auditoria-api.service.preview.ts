import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Pagina } from '../../core/http/paginacao';
import type {
  CategoriaContagemBruta, FiltroAuditoria, FiltrosDeAuditoria, MudancaDoRegistro, PedidoDePagina, PessoaDoFiltro, RegistroDaLista, RegistroDetalhe,
} from './auditoria.tipos';

/**
 * Dados falsos do build `preview` (`docs/agents/padrao-frontend.md`, "Preview da Fatia"): o angular.json troca
 * `auditoria-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `auditoria-api.service.preview.spec.ts`). Registros das oito categorias nas três origens, tipados pelo contrato
 * gerado, em memória, sem API. O escopo por papel é da API real; aqui o preview mostra o que o MOR vê (tudo).
 */
const VALUTO = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto' };
const PORTAL = { id: '019a0000-0000-7000-8000-000000000002', nome: 'Portal' };
const PESSOAS: PessoaDoFiltro[] = [
  { id: 'sub-carla', nome: 'Carla Mendes' },
  { id: 'sub-rui', nome: 'Rui Tavares' },
  { id: '@bot', nome: 'Bot da Esteira' },
  { id: '@pipeline', nome: 'Pipelines' },
];
const QUEM: Record<string, { nome: string; origem: string }> = {
  'sub-carla': { nome: 'Carla Mendes', origem: 'tela' },
  'sub-rui': { nome: 'Rui Tavares', origem: 'tela' },
  '@bot': { nome: 'Bot da Esteira', origem: 'bot' },
  '@pipeline': { nome: 'Pipeline do GitLab', origem: 'pipeline' },
};

const HORA_MS = 3_600_000;
const eid = (n: number) => `019a0000-0000-7000-8000-${String(n).padStart(12, '0')}`;

interface Semente {
  quem: string; categoria: string; verbo: string; codigo: string; nome?: string; entidade: string; app?: typeof VALUTO;
  autoaprovacao?: boolean; mudancas: MudancaDoRegistro[]; motivo?: string;
}

const SEMENTES: Semente[] = [
  { quem: 'sub-carla', categoria: 'cadastro', verbo: 'alterou a Aplicação', codigo: 'VLT', nome: 'Valuto', entidade: 'Aplicacao', app: VALUTO, mudancas: [{ campo: 'teto de custo (USD)', antes: '40', depois: '60' }] },
  { quem: '@bot', categoria: 'aprovacao', verbo: 'aprovou a Fatia', codigo: 'P2', entidade: 'Fatia', app: VALUTO, mudancas: [{ campo: 'status', antes: 'em revisão', depois: 'aprovada' }] },
  { quem: 'sub-rui', categoria: 'aprovacao', verbo: 'aprovou a Fatia', codigo: 'X1', entidade: 'Fatia', app: PORTAL, autoaprovacao: true, mudancas: [{ campo: 'status', antes: 'em revisão', depois: 'aprovada' }] },
  { quem: '@pipeline', categoria: 'entrega', verbo: 'concluiu a etapa QA da Entrega', codigo: 'ENT-1', entidade: 'Entrega', app: VALUTO, mudancas: [{ campo: 'qa', antes: 'executando', depois: 'concluído' }] },
  { quem: 'sub-carla', categoria: 'entrega', verbo: 'abriu a Entrega', codigo: 'ENT-1', entidade: 'Entrega', app: VALUTO, mudancas: [{ campo: 'estado', antes: '—', depois: 'em andamento' }] },
  { quem: '@bot', categoria: 'fatias', verbo: 'abriu o review da Fatia', codigo: 'E1b', entidade: 'Fatia', app: PORTAL, mudancas: [{ campo: 'review', antes: 'pedido', depois: 'aberto' }] },
  { quem: '@pipeline', categoria: 'publicacao', verbo: 'publicou no Ambiente QA', codigo: 'ENT-2', entidade: 'Entrega', app: PORTAL, mudancas: [{ campo: 'versão', antes: '1.4.0', depois: '1.5.0' }] },
  { quem: 'sub-carla', categoria: 'excecao', verbo: 'pulou QA e HML na Entrega', codigo: 'ENT-3', entidade: 'Entrega', app: VALUTO, motivo: 'falha no extrato de contas encerradas em produção', mudancas: [{ campo: 'qa', antes: 'não iniciado', depois: 'pulada' }, { campo: 'hml', antes: 'não iniciado', depois: 'pulada' }] },
  { quem: 'sub-rui', categoria: 'politica', verbo: 'alterou a Política de severidade', codigo: 'VLT', nome: 'Valuto', entidade: 'PoliticaSeveridade', app: VALUTO, mudancas: [{ campo: 'bloqueia em', antes: 'crítica', depois: 'alta' }] },
  { quem: 'sub-carla', categoria: 'papeis', verbo: 'alterou o Papel na Aplicação', codigo: 'PRT', nome: 'Portal', entidade: 'PapelAplicacao', app: PORTAL, mudancas: [{ campo: 'papel', antes: 'membro', depois: 'aprovador técnico' }] },
  { quem: 'sub-rui', categoria: 'cadastro', verbo: 'alterou o Destino', codigo: 'VLT', nome: 'Valuto', entidade: 'Destino', app: VALUTO, mudancas: [{ campo: 'token', antes: '••••', depois: '••••' }] },
  { quem: '@bot', categoria: 'fatias', verbo: 'comentou na MR da Fatia', codigo: 'P1', entidade: 'Fatia', mudancas: [{ campo: 'comentário', antes: '—', depois: 'Reprovada: faltou teste' }] },
];

type Guardado = RegistroDetalhe & { resumoMudancas: string; quemId: string };

/** 5 voltas sobre as sementes: 60 registros, os 12 primeiros de 3 em 3 horas e os demais de 36 em 36 (cobre ~3 meses). */
const gerar = (agora: number): Guardado[] =>
  Array.from({ length: SEMENTES.length * 5 }, (_, i) => {
    const s = SEMENTES[i % SEMENTES.length];
    const quando = new Date(agora - (i + 1) * (i < 12 ? 3 : 36) * HORA_MS).toISOString();
    return {
      id: eid(i + 1), quando, quem: QUEM[s.quem], quemId: s.quem, categoria: s.categoria, verbo: s.verbo,
      objeto: { codigo: s.codigo, nome: s.nome ?? null, entidade: s.entidade, entidadeId: eid(1000 + (i % SEMENTES.length)) },
      aplicacao: s.app ?? null, autoaprovacao: s.autoaprovacao ?? false, mudancas: s.mudancas, motivo: s.motivo ?? null,
      resumoMudancas: s.mudancas.length === 1 ? `${s.mudancas[0].campo}: ${s.mudancas[0].antes} → ${s.mudancas[0].depois}` : `${s.mudancas.length} campos`,
    };
  });

let memoria = gerar(Date.now());

function filtrar(filtro: FiltroAuditoria, comCategoria: boolean): Guardado[] {
  const corte = filtro.periodoDias ? Date.now() - filtro.periodoDias * 24 * HORA_MS : 0;
  const busca = filtro.busca?.trim().toLowerCase();
  return memoria
    .filter((r) => !filtro.aplicacaoId || r.aplicacao?.id === filtro.aplicacaoId)
    .filter((r) => !filtro.quem || r.quemId === filtro.quem)
    .filter((r) => !comCategoria || !filtro.categoria || r.categoria === filtro.categoria)
    .filter((r) => !filtro.objeto || r.objeto.codigo === filtro.objeto)
    .filter((r) => Date.parse(r.quando) >= corte)
    .filter((r) => !busca || `${r.verbo} ${r.objeto.codigo} ${r.objeto.nome ?? ''} ${r.quem.nome}`.toLowerCase().includes(busca))
    .sort((a, b) => (filtro.order === 'asc' ? 1 : -1) * (Date.parse(a.quando) - Date.parse(b.quando)));
}

const paraLista = (r: Guardado): RegistroDaLista => ({
  id: r.id, quando: r.quando, quem: r.quem, categoria: r.categoria, verbo: r.verbo, objeto: r.objeto,
  aplicacao: r.aplicacao, autoaprovacao: r.autoaprovacao, resumoMudancas: r.resumoMudancas,
});

@Injectable({ providedIn: 'root' })
export class AuditoriaApiService {
  listar(filtro: FiltroAuditoria, { pagina, tamanho }: PedidoDePagina): Promise<Pagina<RegistroDaLista>> {
    const todos = filtrar(filtro, true);
    return Promise.resolve({
      itens: todos.slice((pagina - 1) * tamanho, pagina * tamanho).map(paraLista),
      total: todos.length, totalPaginas: Math.ceil(todos.length / tamanho), pagina, tamanho,
    });
  }

  categorias(filtro: FiltroAuditoria): Promise<CategoriaContagemBruta[]> {
    const contagem = new Map<string, number>();
    for (const r of filtrar(filtro, false)) contagem.set(r.categoria, (contagem.get(r.categoria) ?? 0) + 1);
    return Promise.resolve([...contagem].map(([categoria, total]) => ({ categoria, total })));
  }

  filtros(): Promise<FiltrosDeAuditoria> {
    return Promise.resolve({ aplicacoes: [VALUTO, PORTAL], pessoas: PESSOAS });
  }

  detalhe(id: string): Promise<RegistroDetalhe> {
    const achado = memoria.find((r) => r.id === id);
    if (!achado) {
      return Promise.reject(new HttpErrorResponse({ status: 404, error: { errors: [{ code: 'auditoria.nao-encontrado', message: 'Registro não encontrado.', type: 'NotFound' }] } }));
    }
    return Promise.resolve(structuredClone({ ...paraLista(achado), mudancas: achado.mudancas, motivo: achado.motivo }));
  }
}

/** Para os testes: volta os exemplos ao começo. */
export function reiniciarAuditoriaDoPreview(): void {
  memoria = gerar(Date.now());
}
