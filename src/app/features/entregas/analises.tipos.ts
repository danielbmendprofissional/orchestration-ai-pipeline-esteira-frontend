import type { components } from '../../core/api/esteira-api';

/** Tipos da feature: aliases do contrato gerado (nunca interface própria de payload). */
type Esquemas = components['schemas'];

export type AnalisesDaEtapa = Esquemas['AnalisesDaEtapaDto'];
export type AnaliseDaEtapa = Esquemas['AnaliseDaEtapaDto'];
export type DecisaoDaEtapa = Esquemas['DecisaoDaEtapaDto'];
export type Achado = Esquemas['AchadoDto'];

/** Severidades que o filtro de Achados aceita (`info` não é Achado listável na Política). */
export type SeveridadeDoAchado = 'critica' | 'alta' | 'media' | 'baixa';

/** Análises do Deploy de um mesmo Destino. */
export interface AnalisesDoDestino {
  destino: string;
  analises: AnaliseDaEtapa[];
}
