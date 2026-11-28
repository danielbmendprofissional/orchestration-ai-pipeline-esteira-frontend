import type { components } from '../../core/api/esteira-api';
import type { PedidoDePagina } from '../../core/http/paginacao';

/** Tipos da feature: aliases do contrato gerado (nunca interface própria de payload). */
type Esquemas = components['schemas'];

export type RegistroDaLista = Esquemas['RegistroAuditoriaListaDto'];
export type RegistroDetalhe = Esquemas['RegistroAuditoriaDetalheDto'];
export type MudancaDoRegistro = Esquemas['MudancaDto'];
export type ObjetoDoRegistro = Esquemas['ObjetoDto'];
export type QuemDoRegistro = Esquemas['QuemDto'];
export type AplicacaoDoRegistro = Esquemas['AplicacaoDoRegistroDto'];
export type PessoaDoFiltro = Esquemas['PessoaDoFiltroDto'];
export type FiltrosDeAuditoria = Esquemas['FiltrosDeAuditoriaDto'];
export type CategoriaContagemBruta = Esquemas['CategoriaContagemDto'];

/** Valores que a API devolve em `categoria` e `quem.origem` (string solta no OpenAPI). */
export type CategoriaDeAuditoria = 'aprovacao' | 'fatias' | 'entrega' | 'publicacao' | 'excecao' | 'politica' | 'cadastro' | 'papeis';
export type OrigemDoRegistro = 'tela' | 'bot' | 'pipeline';
export type PeriodoEmDias = 7 | 30 | 90;
export type ColunaOrdenavel = 'quando';

/** Contagem já com `total` numérico (o OpenAPI o declara `number | string`). */
export interface CategoriaContagem {
  categoria: string;
  total: number;
}

/** Filtro da consulta. `periodoDias: null` = "tudo" (não vai na query); ausente também não vai. */
export interface FiltroAuditoria {
  aplicacaoId?: string;
  quem?: string;
  categoria?: string;
  periodoDias?: PeriodoEmDias | null;
  objeto?: string;
  busca?: string;
  sort?: ColunaOrdenavel;
  order?: 'asc' | 'desc';
}

export type { PedidoDePagina };
