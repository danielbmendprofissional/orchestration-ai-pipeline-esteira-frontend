import { Injectable } from '@angular/core';
import type { AplicacaoDoPainel, EstadoDaFatia, FatiaDoPainel, FiltroFatias, Gaveta, Hotfixes, PainelLista, PedidoDePagina } from './fatias.tipos';

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
  private geradoEm = new Date(Date.now() - 3 * 60_000).toISOString();

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
      itens: filtradas.slice(inicio, inicio + pedido.tamanho),
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
