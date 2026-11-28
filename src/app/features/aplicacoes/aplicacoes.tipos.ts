import type { components } from '../../core/api/esteira-api';
import type { Pagina, PedidoDePagina } from '../../core/http/paginacao';

/** Tipos da feature: aliases do contrato gerado (nunca interface própria de payload). Campo `null` da API chega omitido. */
type Esquemas = components['schemas'];

export type AplicacaoLista = Esquemas['AplicacaoListaDto'];
export type AplicacaoDetalhe = Esquemas['AplicacaoDetalheDto'];
export type PermissoesAplicacao = Esquemas['PermissoesAplicacao'];
export type PermissoesGlobais = Esquemas['PermissoesGlobaisAplicacao'];
export type CriarAplicacaoRequest = Esquemas['CriarAplicacaoRequest'];
export type AlterarAplicacaoRequest = Esquemas['AlterarAplicacaoRequest'];
export type Politica = Esquemas['PoliticaDto'];
export type AlterarPoliticaRequest = Esquemas['AlterarPoliticaRequest'];
export type PapelResumo = Esquemas['PapelResumoDto'];
export type VincularPapelRequest = Esquemas['VincularPapelRequest'];
export type PessoaLista = Esquemas['PessoaListaDto'];
export type ProjetoResumo = Esquemas['ProjetoResumoDto'];
export type WebhookProjeto = Esquemas['WebhookProjetoDto'];
export type AmbienteProjeto = Esquemas['AmbienteProjetoDto'];
export type Destino = Esquemas['DestinoDto'];
export type DestinoRequest = Esquemas['DestinoRequest'];
export type ProjetoGitLabItem = Esquemas['ProjetoGitLabItemDto'];
export type TetoCusto = Esquemas['TetoCustoDto'];
export type CadastrarProjetoRequest = Esquemas['CadastrarProjetoRequest'];

export type ColunaOrdenavel = 'nome' | 'sigla' | 'grupo' | 'quantidadeProjetos' | 'ativa';

/** Filtro da lista como a API o entende; `ativa` ausente = todas. */
export interface FiltroApi {
  busca?: string;
  ativa?: boolean;
  sort?: ColunaOrdenavel;
  order?: 'asc' | 'desc';
}

export type { Pagina, PedidoDePagina };
