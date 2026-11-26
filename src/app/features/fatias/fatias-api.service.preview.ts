import { Injectable } from '@angular/core';
import type {
  AcaoDaFatia,
  AcaoPedida,
  AcoesPedidas,
  AplicacaoDoPainel,
  DecisaoDaFatia,
  EstadoDaFatia,
  FatiaDoPainel,
  FiltroFatias,
  Gaveta,
  Hotfixes,
  PainelLista,
  PedidoDePagina,
} from './fatias.tipos';

/**
 * Dados falsos do build `preview` (`docs/agents/padrao-frontend.md`, "Preview da Fatia"): o angular.json troca
 * `fatias-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `fatias-api.service.preview.spec.ts`). 2 Aplicações, 300 linhas em todos os estados desta fatia, tipadas pelo
 * contrato gerado e em memória, sem API nem GitLab.
 */
const APLICACOES = [
  { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT' },
  { id: '019a0000-0000-7000-8000-000000000002', nome: 'Portal do Cliente', sigla: 'PCL' },
];

const ESTADOS: EstadoDaFatia[] = ['planejada', 'com-spec', 'em-execucao', 'em-revisao', 'pronta-para-entrega'];
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'P', 'T', 'X'];
const RISCOS = ['baixo', 'medio', 'alto'];
const REPOSITORIOS = [['api'], ['frontend'], ['api', 'frontend']];
const ORDEM_DE_RISCO: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };

function montarFatias(): FatiaDoPainel[] {
  return Array.from({ length: 300 }, (_, i) => {
    const aplicacao = APLICACOES[i % 2];
    const n = Math.floor(i / 2);
    const estado = ESTADOS[n % ESTADOS.length];
    const codigo = `${LETRAS[n % LETRAS.length]}${Math.floor(n / LETRAS.length) + 1}`;
    return {
      aplicacaoId: aplicacao.id,
      aplicacao: aplicacao.nome,
      sigla: aplicacao.sigla,
      codigo,
      // Texto do GitLab com marcação: a tela precisa mostrá-lo como texto.
      titulo: n % 37 === 0 ? `Fatia ${codigo} <b>em negrito</b> & "aspas"` : `Fatia ${codigo} de ${aplicacao.nome}`,
      estado,
      progresso: estado === 'em-execucao' ? `${(n % 6) + 1}/7 tasks` : estado === 'em-revisao' ? '7/7 tasks' : null,
      emCorrecao: estado === 'em-revisao' && n % 2 === 0,
      formatoAnterior: n % 11 === 0,
      risco: RISCOS[n % RISCOS.length],
      status: estado === 'planejada' ? 'planejada' : 'aprovada',
      statusReconhecido: true,
      repositorios: REPOSITORIOS[n % REPOSITORIOS.length],
      specDisponivel: estado !== 'planejada',
    } satisfies FatiaDoPainel;
  });
}

/** Situações da P2 nas Fatias Em revisão, ciclando a cada 8 linhas. */
const SITUACOES = ['ci-verde', 'ci-vermelho', 'review-pedido', 'review-aberto', 'aprovando', 'reprovando', 'api-e-front', 'falhou', 'reexecutada'] as const;
type Situacao = (typeof SITUACOES)[number];
const COMENTARIO_COM_MARCACAO = '<b>Falta</b> teste do erro & "aspas"';

const chave = (aplicacaoId: string, codigo: string) => `${aplicacaoId}/${codigo}`;

function hash(texto: string): number {
  return [...texto].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
}

function acaoDeExemplo(f: FatiaDoPainel, tipo: string, estado: string, repositorio: string | null, extra: Partial<AcaoDaFatia> = {}): AcaoDaFatia {
  const sufixo = String(Math.abs(hash(`${f.aplicacaoId}${f.codigo}${tipo}${repositorio}${extra.pedidaEm ?? ''}`))).padStart(12, '0').slice(0, 12);
  return {
    id: `019b0000-0000-7000-8000-${sufixo}`,
    tipo,
    estado,
    repositorio,
    mrIid: 7,
    pedidaPor: 'dev',
    pedidaEm: new Date(Date.now() - 10 * 60_000).toISOString(),
    atualizadaEm: new Date(Date.now() - 5 * 60_000).toISOString(),
    codigoErro: null,
    comentario: null,
    podeReexecutar: { pode: false, motivo: 'nao-falhou' },
    ...extra,
  };
}

function acoesIniciais(f: FatiaDoPainel, situacao: Situacao): AcaoDaFatia[] {
  switch (situacao) {
    case 'review-pedido':
      return [acaoDeExemplo(f, 'abrir-review', 'pedida', null)];
    case 'review-aberto':
      return [acaoDeExemplo(f, 'abrir-review', 'confirmada', null)];
    case 'aprovando':
      return f.repositorios.map((r) => acaoDeExemplo(f, 'aprovar', 'pedida', r));
    case 'reprovando':
      return f.repositorios.map((r) => acaoDeExemplo(f, 'reprovar', 'pedida', r, { comentario: COMENTARIO_COM_MARCACAO }));
    case 'falhou':
      return f.repositorios.map((r) => acaoDeExemplo(f, 'aprovar', 'falhou', r, { codigoErro: 'gitlab.merge-recusado', podeReexecutar: { pode: true, motivo: null } }));
    case 'reexecutada':
      // A falha original (já não é a última) e a Ação nova da reexecução, em andamento.
      return f.repositorios.flatMap((r) => [
        acaoDeExemplo(f, 'aprovar', 'falhou', r, { codigoErro: 'gitlab.merge-recusado', podeReexecutar: { pode: false, motivo: 'nao-e-a-ultima' } }),
        acaoDeExemplo(f, 'aprovar', 'pedida', r, { pedidaEm: new Date(Date.now() - 60_000).toISOString() }),
      ]);
    default:
      return [];
  }
}

/** Permissões como a API as devolveria a um MOR; muda quando o preview "aceita" uma decisão. */
function recalcularAcoes(f: FatiaDoPainel, ciVerde: boolean): void {
  const decisao = (f.decisao ?? 'nenhuma') as DecisaoDaFatia;
  const emAndamento = { pode: false, motivo: 'decisao-em-andamento' };
  const comReview = f.review?.estado === 'pedido' || f.review?.estado === 'aberto';
  f.acoes = {
    podeAbrirReview: comReview ? { pode: false, motivo: 'review-ja-pedido' } : decisao !== 'nenhuma' ? emAndamento : { pode: true, motivo: null },
    podeAprovar: decisao !== 'nenhuma' ? emAndamento : ciVerde ? { pode: true, motivo: null } : { pode: false, motivo: 'ci-nao-verde' },
    podeReprovar: decisao !== 'nenhuma' ? emAndamento : { pode: true, motivo: null },
  };
}

/** Só as Fatias Em revisão levam os campos de decisão (as outras vêm sem eles, como na API). */
function aplicarSituacoes(fatias: FatiaDoPainel[], ci: Map<string, boolean>, pedidas: Map<string, AcaoDaFatia[]>): void {
  let k = 0;
  for (const f of fatias) {
    if (f.estado !== 'em-revisao') continue;
    const situacao: Situacao = SITUACOES[k++ % SITUACOES.length];
    if (situacao === 'api-e-front') f.repositorios = ['api', 'frontend'];
    if (situacao === 'review-aberto') f.repositorios = ['frontend'];
    f.review = {
      estado: situacao === 'review-pedido' ? 'pedido' : situacao === 'review-aberto' ? 'aberto' : 'nenhum',
      link: situacao === 'review-aberto' ? `https://review.exemplo.local/${f.codigo.toLowerCase()}` : null,
    };
    f.decisao = situacao === 'aprovando' || situacao === 'reexecutada' ? 'aprovando' : situacao === 'reprovando' ? 'reprovando' : situacao === 'falhou' ? 'falhou' : 'nenhuma';
    ci.set(chave(f.aplicacaoId, f.codigo), situacao !== 'ci-vermelho');
    pedidas.set(chave(f.aplicacaoId, f.codigo), acoesIniciais(f, situacao));
    recalcularAcoes(f, situacao !== 'ci-vermelho');
  }
}

const COMPARADORES: Record<NonNullable<FiltroFatias['sort']>, (a: FatiaDoPainel, b: FatiaDoPainel) => number> = {
  aplicacao: (a, b) => a.aplicacao.localeCompare(b.aplicacao),
  codigo: (a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }),
  titulo: (a, b) => a.titulo.localeCompare(b.titulo),
  estado: (a, b) => ESTADOS.indexOf(a.estado as EstadoDaFatia) - ESTADOS.indexOf(b.estado as EstadoDaFatia),
  risco: (a, b) => (ORDEM_DE_RISCO[a.risco ?? ''] ?? 0) - (ORDEM_DE_RISCO[b.risco ?? ''] ?? 0),
};

@Injectable({ providedIn: 'root' })
export class FatiasApiService {
  private readonly fatias = montarFatias();
  private readonly ciVerde = new Map<string, boolean>();
  private readonly pedidas = new Map<string, AcaoDaFatia[]>();
  private geradoEm = new Date(Date.now() - 3 * 60_000).toISOString();

  constructor() {
    aplicarSituacoes(this.fatias, this.ciVerde, this.pedidas);
  }

  listar(filtro: FiltroFatias, pedido: PedidoDePagina): Promise<PainelLista> {
    const termo = filtro.fatia?.toLowerCase();
    let filtradas = this.fatias
      .filter((f) => filtro.aba === 'todas' || (filtro.aba === 'prontas') === (f.estado === 'pronta-para-entrega'))
      .filter((f) => !filtro.aplicacoes?.length || filtro.aplicacoes.includes(f.aplicacaoId))
      .filter((f) => !filtro.projeto || f.repositorios.includes(filtro.projeto))
      .filter((f) => !termo || `${f.codigo} ${f.titulo}`.toLowerCase().includes(termo));

    if (filtro.sort) {
      const comparar = COMPARADORES[filtro.sort];
      const sinal = filtro.order === 'desc' ? -1 : 1;
      filtradas = [...filtradas].sort((a, b) => sinal * comparar(a, b));
    }

    const inicio = (pedido.pagina - 1) * pedido.tamanho;
    const aplicacoes: AplicacaoDoPainel[] = APLICACOES.map((a, i) => ({
      ...a,
      geradoEm: this.geradoEm,
      desatualizado: i === 1,
    }));
    return Promise.resolve({
      itens: filtradas.slice(inicio, inicio + pedido.tamanho).map((f) => ({ ...f })),
      pagina: pedido.pagina,
      tamanhoPagina: pedido.tamanho,
      total: filtradas.length,
      totalPaginas: Math.ceil(filtradas.length / pedido.tamanho),
      avisos: [
        {
          aplicacaoId: APLICACOES[1].id,
          aplicacao: APLICACOES[1].nome,
          codigo: 'gitlab.indisponivel',
          mensagem: 'O GitLab não respondeu; mostrando o último estado guardado.',
        },
      ],
      aplicacoes,
      geradoEm: this.geradoEm,
      desatualizado: true,
    });
  }

  atualizar(aplicacaoId: string): Promise<void> {
    void aplicacaoId;
    this.geradoEm = new Date().toISOString();
    return Promise.resolve();
  }

  gaveta(aplicacaoId: string, codigo: string): Promise<Gaveta> {
    const f = this.fatias.find((x) => x.aplicacaoId === aplicacaoId && x.codigo === codigo);
    if (!f) return Promise.reject(new Error('Fatia do preview não encontrada.'));
    const base = `https://gitlab.exemplo.local/${f.sigla.toLowerCase()}`;
    return Promise.resolve({
      aplicacaoId,
      codigo,
      titulo: f.titulo,
      estado: f.estado,
      progresso: f.progresso,
      emCorrecao: f.emCorrecao,
      formatoAnterior: f.formatoAnterior,
      spec: {
        disponivel: f.specDisponivel,
        caminho: f.specDisponivel ? `specs/feature/${codigo.toLowerCase()}.md` : null,
        link: f.specDisponivel ? `${base}/workspace/-/blob/main/specs/${codigo}.md` : null,
        risco: f.risco,
        formatoAnterior: f.formatoAnterior,
      },
      mae: f.estado === 'planejada' ? null : { numero: 100, titulo: `${codigo} — ${f.titulo}`, estado: 'opened', link: `${base}/workspace/-/issues/100` },
      filhas: f.estado === 'planejada' ? [] : [{ numero: 101, titulo: 'Task 1', estado: 'closed', link: `${base}/workspace/-/issues/101` }],
      repositorios: f.repositorios.map((repositorio) => ({
        repositorio,
        branch: `feature/${codigo.toLowerCase()}-slug`,
        linkBranch: `${base}/${repositorio}/-/tree/feature/${codigo.toLowerCase()}-slug`,
        mrs: [
          {
            iid: 7,
            titulo: `${codigo}: ${f.titulo}`,
            estado: 'opened',
            branch: `feature/${codigo.toLowerCase()}-slug`,
            statusPipeline: 'success',
            link: `${base}/${repositorio}/-/merge_requests/7`,
            linkBranch: null,
          },
        ],
      })),
      acoes: f.acoes,
      review: f.review,
      decisao: f.decisao,
      acoesPedidas: f.estado === 'em-revisao' ? [...(this.pedidas.get(chave(aplicacaoId, codigo)) ?? [])] : undefined,
      tasks: [
        {
          codigo: `${codigo}.1`,
          numero: 1,
          issue: 101,
          linkIssue: `${base}/workspace/-/issues/101`,
          feita: true,
          emAndamento: false,
          reviewPass: true,
          sha: 'a1b2c3d',
          executor: 'backend',
          repositorio: f.repositorios[0],
          linkCommit: `${base}/${f.repositorios[0]}/-/commit/a1b2c3d`,
        },
        { codigo: `${codigo}.2`, numero: 2, issue: 102, linkIssue: null, feita: false, emAndamento: true, reviewPass: false, sha: null, executor: null, repositorio: null, linkCommit: null },
      ],
    });
  }

  /** Decisões em memória: mudam a linha como o backend a mudaria depois do 202 (sem GitLab e sem executor). */
  abrirReview(aplicacaoId: string, codigo: string): Promise<AcoesPedidas> {
    return this.decidir(aplicacaoId, codigo, 'abrir-review', null);
  }

  aprovar(aplicacaoId: string, codigo: string): Promise<AcoesPedidas> {
    return this.decidir(aplicacaoId, codigo, 'aprovar', null);
  }

  reprovar(aplicacaoId: string, codigo: string, comentario: string): Promise<AcoesPedidas> {
    return this.decidir(aplicacaoId, codigo, 'reprovar', comentario);
  }

  private decidir(aplicacaoId: string, codigo: string, tipo: 'abrir-review' | 'aprovar' | 'reprovar', comentario: string | null): Promise<AcoesPedidas> {
    const f = this.fatias.find((x) => x.aplicacaoId === aplicacaoId && x.codigo === codigo);
    if (!f?.acoes) return Promise.reject(new Error('Fatia do preview sem ações.'));
    const agora = new Date().toISOString();
    // API primeiro (ADR-0025): uma Ação por MR aberta, na ordem api, frontend.
    const repositorios = tipo === 'abrir-review' ? [null] : [...f.repositorios].sort((a) => (a === 'api' ? -1 : 1));
    const novas = repositorios.map((r) => acaoDeExemplo(f, tipo, 'pedida', r, { comentario, pedidaEm: agora, atualizadaEm: agora }));
    if (tipo === 'abrir-review') f.review = { estado: 'pedido', link: null };
    else f.decisao = tipo === 'aprovar' ? 'aprovando' : 'reprovando';
    recalcularAcoes(f, this.ciVerde.get(chave(aplicacaoId, codigo)) ?? true);
    this.pedidas.set(chave(aplicacaoId, codigo), [...(this.pedidas.get(chave(aplicacaoId, codigo)) ?? []), ...novas]);
    const acoes: AcaoPedida[] = novas.map((a) => ({ id: a.id, tipo: a.tipo, estado: a.estado, repositorio: a.repositorio ?? 'workspace', mrIid: a.mrIid }));
    return Promise.resolve({ acoes });
  }

  /** Reexecutar em memória: cria a Ação nova (tentativa + 1), tira a permissão da falhada e põe a decisão em andamento. */
  reexecutar(aplicacaoId: string, codigo: string, acaoId: string): Promise<AcoesPedidas> {
    const f = this.fatias.find((x) => x.aplicacaoId === aplicacaoId && x.codigo === codigo);
    const k = chave(aplicacaoId, codigo);
    const lista = this.pedidas.get(k) ?? [];
    const falhada = lista.find((a) => a.id === acaoId);
    if (!f || !falhada || falhada.estado !== 'falhou' || !falhada.podeReexecutar.pode) {
      return Promise.reject(new Error('Ação do preview não reexecutável.'));
    }
    const agora = new Date().toISOString();
    const nova = acaoDeExemplo(f, falhada.tipo, 'pedida', falhada.repositorio, { pedidaEm: agora, atualizadaEm: agora });
    falhada.podeReexecutar = { pode: false, motivo: 'nao-e-a-ultima' };
    if (falhada.tipo === 'abrir-review') f.review = { estado: 'pedido', link: null };
    else f.decisao = falhada.tipo === 'aprovar' ? 'aprovando' : 'reprovando';
    recalcularAcoes(f, this.ciVerde.get(k) ?? true);
    this.pedidas.set(k, [...lista, nova]);
    return Promise.resolve({ acoes: [{ id: nova.id, tipo: nova.tipo, estado: nova.estado, repositorio: nova.repositorio ?? 'workspace', mrIid: nova.mrIid }] });
  }

  hotfixes(aplicacaoId: string): Promise<Hotfixes> {
    const base = 'https://gitlab.exemplo.local/workspace/-';
    return Promise.resolve({
      aplicacaoId,
      itens: [
        { issue: 201, motivo: 'Cálculo de juros errado em produção', estado: 'aguardando-a-correcao', linkIssue: `${base}/issues/201`, mr: null },
        {
          issue: 202,
          motivo: 'Tela em branco no login',
          estado: 'mr-aberta',
          linkIssue: `${base}/issues/202`,
          mr: { repositorio: 'frontend', iid: 12, titulo: 'hotfix: login', estado: 'opened', branch: 'hotfix/login', link: `${base}/merge_requests/12` },
        },
        {
          issue: 203,
          motivo: 'Timeout na listagem',
          estado: 'pronto-para-entrega',
          linkIssue: `${base}/issues/203`,
          mr: { repositorio: 'api', iid: 13, titulo: 'hotfix: timeout', estado: 'merged', branch: 'hotfix/timeout', link: `${base}/merge_requests/13` },
        },
      ],
      aviso: null,
    });
  }
}
