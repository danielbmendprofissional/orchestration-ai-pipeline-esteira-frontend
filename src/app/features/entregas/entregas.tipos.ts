import type { components } from '../../core/api/esteira-api';

/** Tipos da feature: aliases do contrato gerado (nunca interface própria de payload). */
type Esquemas = components['schemas'];

export type Entrega = Esquemas['EntregaDto'];
export type EntregaFluxo = Esquemas['FluxoDaEntregaDto'];
export type EntregaEtapa = Esquemas['EtapaDto'];
export type EntregaFatia = Esquemas['FatiaDaEntregaDto'];

/** Valores que a API devolve em `etapa` e `estado` (string solta no OpenAPI): ADR-0023. */
export type NomeDaEtapa = 'abertura' | 'qa' | 'hml' | 'prd';
export type EstadoDaEtapa = 'nao-iniciado' | 'executando' | 'aguardando-aprovacao' | 'concluido' | 'pulada' | 'falhou';
export type EstadoDaEntrega = 'bloqueada-ou-falha' | 'aguardando-aprovacao' | 'em-andamento';

export type ErroDaEntrega = 'nao-encontrada' | 'falha';
