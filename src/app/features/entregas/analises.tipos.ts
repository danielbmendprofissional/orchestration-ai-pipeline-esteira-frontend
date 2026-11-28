import type { components } from '../../core/api/esteira-api';
import type { Pagina } from '../../core/http/paginacao';

/** Tipos da feature: aliases do contrato gerado (nunca interface própria de payload). */
type Esquemas = components['schemas'];

export type AnalisesDaEtapa = Esquemas['AnalisesDaEtapaDto'];
export type AnaliseDaEtapa = Esquemas['AnaliseDaEtapaDto'];
export type DecisaoDaEtapa = Esquemas['DecisaoDaEtapaDto'];
export type Achado = Esquemas['AchadoDto'];

/** Severidades que o filtro de Achados aceita (`info` não é Achado listável na Política). */
export type SeveridadeDoAchado = 'critica' | 'alta' | 'media' | 'baixa';

/** Estado das Análises que o painel da Etapa desenha (montado pela page a partir do `AnalisesService`). */
export interface EstadoDasAnalises {
  gate: DecisaoDaEtapa | null;
  doArtefato: AnaliseDaEtapa[];
  doDeploy: AnalisesDoDestino[];
  carregando: boolean;
  erro: boolean;
  vazio: boolean;
  analiseAberta: string | null;
  severidade: SeveridadeDoAchado | undefined;
  achados: Pagina<Achado> | null;
  achadosCarregando: boolean;
  achadosErro: boolean;
}

/** Análises do Deploy de um mesmo Destino. */
export interface AnalisesDoDestino {
  destino: string;
  analises: AnaliseDaEtapa[];
}
