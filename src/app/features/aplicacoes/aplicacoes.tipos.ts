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

export type ColunaOrdenavel = 'nome' | 'sigla' | 'grupo' | 'quantidadeProjetos' | 'ativa';

/** Filtro da lista como a API o entende; `ativa` ausente = todas. */
export interface FiltroApi {
  busca?: string;
  ativa?: boolean;
  sort?: ColunaOrdenavel;
  order?: 'asc' | 'desc';
}

export type { Pagina, PedidoDePagina };
