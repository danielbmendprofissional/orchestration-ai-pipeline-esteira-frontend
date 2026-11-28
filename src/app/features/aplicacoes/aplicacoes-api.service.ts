import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { cabecalhosDePaginacao, lerPagina, type Pagina, type PedidoDePagina } from '../../core/http/paginacao';
import type {
  AlterarAplicacaoRequest,
  AlterarPoliticaRequest,
  AplicacaoDetalhe,
  AplicacaoLista,
  CadastrarProjetoRequest,
  CriarAplicacaoRequest,
  Destino,
  DestinoRequest,
  FiltroApi,
  PapelResumo,
  PermissoesAplicacao,
  PermissoesGlobais,
  PessoaLista,
  TetoCusto,
  Politica,
  ProjetoGitLabItem,
  ProjetoResumo,
  WebhookProjeto,
  VincularPapelRequest,
} from './aplicacoes.tipos';

const BASE = '/api/v1/aplicacoes';
const PROJETOS = '/api/v1/projetos';

/** Camada API de Aplicações (ADR-0005): só HttpClient e URL, sem regra nem signal. */
@Injectable({ providedIn: 'root' })
export class AplicacoesApiService {
  private readonly http = inject(HttpClient);

  async listar(filtro: FiltroApi, pedido: PedidoDePagina): Promise<Pagina<AplicacaoLista>> {
    let params = new HttpParams();
    if (filtro.busca) params = params.set('busca', filtro.busca);
    if (filtro.ativa !== undefined) params = params.set('ativa', String(filtro.ativa));
    if (filtro.sort) params = params.set('sort', filtro.sort);
    if (filtro.order) params = params.set('order', filtro.order);

    const resposta = await firstValueFrom(
      this.http.get<AplicacaoLista[]>(BASE, { params, headers: cabecalhosDePaginacao(pedido), observe: 'response' }),
    );
    return lerPagina(resposta);
  }

  permissoesGlobais(): Promise<PermissoesGlobais> {
    return firstValueFrom(this.http.get<PermissoesGlobais>(`${BASE}/permissoes`));
  }

  permissoes(id: string): Promise<PermissoesAplicacao> {
    return firstValueFrom(this.http.get<PermissoesAplicacao>(`${BASE}/${id}/permissoes`));
  }

  obter(id: string): Promise<AplicacaoDetalhe> {
    return firstValueFrom(this.http.get<AplicacaoDetalhe>(`${BASE}/${id}`));
  }

  criar(pedido: CriarAplicacaoRequest): Promise<AplicacaoLista> {
    return firstValueFrom(this.http.post<AplicacaoLista>(BASE, pedido));
  }

  alterar(id: string, pedido: AlterarAplicacaoRequest): Promise<AplicacaoLista> {
    return firstValueFrom(this.http.put<AplicacaoLista>(`${BASE}/${id}`, pedido));
  }

  projetosDoGrupo(id: string): Promise<ProjetoGitLabItem[]> {
    return firstValueFrom(this.http.get<ProjetoGitLabItem[]>(`${BASE}/${id}/gitlab/projetos`));
  }

  async definirWorkspace(id: string, projetoGitLabId: number | string | null): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${BASE}/${id}/workspace`, { projetoGitLabId }));
  }

  /** X3: `null` volta ao padrão da Esteira. A resposta omite `tetoCustoUsd` quando não definido. */
  definirTetoCusto(id: string, tetoCustoUsd: number | null): Promise<TetoCusto> {
    return firstValueFrom(this.http.put<TetoCusto>(`${BASE}/${id}/teto-custo`, { tetoCustoUsd }));
  }

  cadastrarProjeto(id: string, pedido: CadastrarProjetoRequest): Promise<ProjetoResumo> {
    return firstValueFrom(this.http.post<ProjetoResumo>(`${BASE}/${id}/projetos`, pedido));
  }

  substituirDependencias(projetoId: string, dependeDe: string[]): Promise<ProjetoResumo> {
    return firstValueFrom(this.http.put<ProjetoResumo>(`${PROJETOS}/${projetoId}/dependencias`, { dependeDe }));
  }

  alterarAmbiente(projetoId: string, ambiente: string, habilitado: boolean): Promise<ProjetoResumo> {
    return firstValueFrom(this.http.put<ProjetoResumo>(`${PROJETOS}/${projetoId}/ambientes/${ambiente}`, { habilitado }));
  }

  /** T1: volta o registro do hook a `pendente` (só MOR; 409 `webhook.nao-reexecutavel` fora de `falhou`). */
  reexecutarWebhook(projetoId: string): Promise<WebhookProjeto> {
    return firstValueFrom(this.http.post<WebhookProjeto>(`${PROJETOS}/${projetoId}/webhook/reexecutar`, null));
  }

  criarDestino(projetoId: string, ambiente: string, pedido: DestinoRequest): Promise<Destino> {
    return firstValueFrom(this.http.post<Destino>(`${PROJETOS}/${projetoId}/ambientes/${ambiente}/destinos`, pedido));
  }

  alterarDestino(projetoId: string, ambiente: string, destinoId: string, pedido: DestinoRequest): Promise<Destino> {
    return firstValueFrom(this.http.put<Destino>(`${PROJETOS}/${projetoId}/ambientes/${ambiente}/destinos/${destinoId}`, pedido));
  }

  async removerDestino(projetoId: string, ambiente: string, destinoId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${PROJETOS}/${projetoId}/ambientes/${ambiente}/destinos/${destinoId}`));
  }

  alterarPolitica(id: string, ambiente: string, pedido: AlterarPoliticaRequest): Promise<Politica> {
    return firstValueFrom(this.http.put<Politica>(`${BASE}/${id}/politicas/${ambiente}`, pedido));
  }

  buscarPessoas(busca: string): Promise<PessoaLista[]> {
    return firstValueFrom(this.http.get<PessoaLista[]>('/api/v1/pessoas', { params: new HttpParams().set('busca', busca) }));
  }

  vincularPapel(id: string, pedido: VincularPapelRequest): Promise<PapelResumo> {
    return firstValueFrom(this.http.post<PapelResumo>(`${BASE}/${id}/papeis`, pedido));
  }

  async desvincularPapel(id: string, papelId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/${id}/papeis/${papelId}`));
  }
}
