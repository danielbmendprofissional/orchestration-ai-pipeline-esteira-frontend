import { Injectable } from '@angular/core';
import type { Pagina, PedidoDePagina } from '../../core/http/paginacao';
import type {
  AlterarAplicacaoRequest,
  AplicacaoDetalhe,
  AplicacaoLista,
  CriarAplicacaoRequest,
  FiltroApi,
  PermissoesAplicacao,
  PermissoesGlobais,
} from './aplicacoes.tipos';

/**
 * Dados falsos do build `preview` (`docs/agents/padrao-frontend.md`, "Preview da Fatia"): o angular.json troca
 * `aplicacoes-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `aplicacoes-api.service.preview.spec.ts`). Tudo tipado pelo contrato gerado e em memória: sem API nem banco.
 * A sessão falsa é MOR, então todas as permissões são verdadeiras.
 */
const APLICACOES: AplicacaoLista[] = [
  { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 3, ativa: true },
  { id: '019a0000-0000-7000-8000-000000000002', nome: 'Portal do Cliente', sigla: 'PCL', grupo: 'portal-cliente', quantidadeProjetos: 2, ativa: true },
];

const PERMISSOES: PermissoesAplicacao = { podeEditar: true, podeEditarCadastro: true, podeEditarPolitica: true, podeGerenciarPapeis: true };

@Injectable({ providedIn: 'root' })
export class AplicacoesApiService {
  private readonly dados: AplicacaoLista[] = APLICACOES.map((a) => ({ ...a }));

  listar(filtro: FiltroApi, pedido: PedidoDePagina): Promise<Pagina<AplicacaoLista>> {
    const busca = filtro.busca?.toLowerCase();
    const filtradas = this.dados
      .filter((a) => filtro.ativa === undefined || a.ativa === filtro.ativa)
      .filter((a) => !busca || `${a.nome} ${a.sigla} ${a.grupo}`.toLowerCase().includes(busca));
    const inicio = (pedido.pagina - 1) * pedido.tamanho;
    return Promise.resolve({
      itens: filtradas.slice(inicio, inicio + pedido.tamanho),
      total: filtradas.length,
      totalPaginas: Math.ceil(filtradas.length / pedido.tamanho),
      pagina: pedido.pagina,
      tamanho: pedido.tamanho,
    });
  }

  permissoesGlobais(): Promise<PermissoesGlobais> {
    return Promise.resolve({ podeCriar: true });
  }

  permissoes(id: string): Promise<PermissoesAplicacao> {
    void id;
    return Promise.resolve({ ...PERMISSOES });
  }

  obter(id: string): Promise<AplicacaoDetalhe> {
    const a = this.dados.find((x) => x.id === id);
    if (!a) return Promise.reject(new Error('Aplicação do preview não encontrada.'));
    return Promise.resolve({ id: a.id, nome: a.nome, sigla: a.sigla, grupo: a.grupo, ativa: a.ativa, politicas: [], projetos: [], papeis: [] });
  }

  criar(pedido: CriarAplicacaoRequest): Promise<AplicacaoLista> {
    const nova: AplicacaoLista = {
      id: `019a0000-0000-7000-8000-${String(this.dados.length + 1).padStart(12, '0')}`,
      nome: pedido.nome ?? '',
      sigla: (pedido.sigla ?? '').toUpperCase(),
      grupo: pedido.grupoGitLab ?? '',
      quantidadeProjetos: 0,
      ativa: true,
    };
    this.dados.unshift(nova);
    return Promise.resolve(nova);
  }

  alterar(id: string, pedido: AlterarAplicacaoRequest): Promise<AplicacaoLista> {
    const a = this.dados.find((x) => x.id === id);
    if (!a) return Promise.reject(new Error('Aplicação do preview não encontrada.'));
    Object.assign(a, { nome: pedido.nome ?? a.nome, sigla: pedido.sigla ?? a.sigla, ativa: pedido.ativa ?? a.ativa });
    return Promise.resolve({ ...a });
  }
}
