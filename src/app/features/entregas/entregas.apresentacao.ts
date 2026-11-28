import type { EstadoTempoReal } from '../../core/tempo-real/tempo-real.tipos';

/** Apresentação da tela da Entrega (E1b): rótulo, ícone e tom de cada estado. Texto e ícone sempre; a cor só reforça. */
export type TomDoEstado = 'neutro' | 'azul' | 'ambar' | 'verde' | 'vermelho';
export interface RotuloDeEstado {
  texto: string;
  icone: string;
  tom: TomDoEstado;
  gira?: boolean;
}

/** Ordem fixa das Etapas na faixa (ADR-0023). */
export const ETAPAS_DO_FLUXO = ['abertura', 'qa', 'hml', 'prd'] as const;

const NOMES: Record<string, string> = { abertura: 'Abertura', qa: 'QA', hml: 'HML', prd: 'PRD' };
export const nomeDaEtapa = (etapa: string): string => NOMES[etapa] ?? etapa;

const ETAPA: Record<string, RotuloDeEstado> = {
  'nao-iniciado': { texto: 'Não iniciado', icone: 'lucideCircleDashed', tom: 'neutro' },
  executando: { texto: 'Executando', icone: 'lucideLoaderCircle', tom: 'azul', gira: true },
  'aguardando-aprovacao': { texto: 'Aguardando aprovação', icone: 'lucideClock', tom: 'ambar' },
  concluido: { texto: 'Concluído', icone: 'lucideCircleCheck', tom: 'verde' },
  pulada: { texto: 'Pulada', icone: 'lucideSkipForward', tom: 'neutro' },
  falhou: { texto: 'Falhou', icone: 'lucideCircleX', tom: 'vermelho' },
  bloqueada: { texto: 'Bloqueada', icone: 'lucideLock', tom: 'vermelho' },
};
const ENTREGA: Record<string, RotuloDeEstado> = {
  'bloqueada-ou-falha': { texto: 'Bloqueada ou com falha', icone: 'lucideCircleX', tom: 'vermelho' },
  'aguardando-aprovacao': { texto: 'Aguardando aprovação', icone: 'lucideClock', tom: 'ambar' },
  'em-andamento': { texto: 'Em andamento', icone: 'lucideLoaderCircle', tom: 'azul', gira: true },
};
const DESCONHECIDO = (texto: string): RotuloDeEstado => ({ texto, icone: 'lucideCircleHelp', tom: 'neutro' });

export const rotuloDaEtapa = (estado: string): RotuloDeEstado => ETAPA[estado] ?? DESCONHECIDO(estado);
export const rotuloDaEntrega = (estado: string): RotuloDeEstado => ENTREGA[estado] ?? DESCONHECIDO(estado);

export const CLASSES_DO_TOM: Record<TomDoEstado, string> = {
  neutro: 'border-line-strong bg-surface-2 text-fg-2',
  azul: 'border-brand/40 bg-brand-soft text-brand-fg',
  ambar: 'border-run-line bg-run-soft text-run-fg',
  verde: 'border-ok-line bg-ok-soft text-ok-fg',
  vermelho: 'border-bad-line bg-bad-soft text-bad-fg',
};

/** Código de falha da pipeline (ADR-0013) em português; o que não é conhecido aparece como veio (sempre escapado). */
export function falhaTraduzida(codigo: string): string {
  switch (codigo) {
    case 'pipeline.falhou':
      return 'A pipeline falhou.';
    case 'pipeline.cancelada':
      return 'A pipeline foi cancelada.';
    default:
      return `Falha: ${codigo}`;
  }
}

export function rotuloDoTempoReal(estado: EstadoTempoReal | null): string | null {
  switch (estado) {
    case 'ao-vivo':
      return 'Ao vivo';
    case 'reconectando':
      return 'Reconectando…';
    case 'consulta':
      return 'Atualização a cada 30 s';
    default:
      return null;
  }
}

/** Só http(s) vira link: o endereço vem da pipeline e nunca vai a `javascript:`. */
export const urlSegura = (url: string | null): url is string => !!url && /^https?:\/\//i.test(url);
