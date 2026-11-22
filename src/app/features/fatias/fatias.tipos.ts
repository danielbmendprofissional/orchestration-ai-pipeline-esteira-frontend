import type { components } from '../../core/api/esteira-api';
import type { PedidoDePagina } from '../../core/http/paginacao';

/** Tipos da feature: aliases do contrato gerado (nunca interface própria de payload). */
type Esquemas = components['schemas'];

export type PainelLista = Esquemas['PainelListaDto'];
export type FatiaDoPainel = Esquemas['FatiaDoPainelDto'];
export type AvisoDoPainel = Esquemas['AvisoDoPainelDto'];
export type AplicacaoDoPainel = Esquemas['AplicacaoDoPainelDto'];
export type Gaveta = Esquemas['GavetaDto'];
export type GavetaIssue = Esquemas['GavetaIssueDto'];
export type GavetaRepositorio = Esquemas['GavetaRepositorioDto'];
export type GavetaMr = Esquemas['GavetaMrDto'];
export type GavetaTask = Esquemas['GavetaTaskDto'];
export type Hotfixes = Esquemas['HotfixesDto'];
export type Hotfix = Esquemas['HotfixDto'];

/** Valores que a API devolve em `estado` (string solta no OpenAPI): ADR-0024/0025. */
export type EstadoDaFatia = 'planejada' | 'com-spec' | 'em-execucao' | 'em-revisao' | 'pronta-para-entrega';
export type Aba = 'andamento' | 'prontas' | 'todas';
export type ProjetoFiltro = 'api' | 'frontend';
export type ColunaOrdenavel = 'aplicacao' | 'codigo' | 'titulo' | 'estado' | 'risco';

/** Filtro do Painel como a API o entende. */
export interface FiltroFatias {
  aba: Aba;
  fatia?: string;
  projeto?: ProjetoFiltro;
  aplicacoes?: string[];
  sort?: ColunaOrdenavel;
  order?: 'asc' | 'desc';
}

export type { PedidoDePagina };
