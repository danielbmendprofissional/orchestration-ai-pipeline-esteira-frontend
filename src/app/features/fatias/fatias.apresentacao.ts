/** Regras de exibição do Painel de Fatias, puras (sem Angular): rótulos, janela de páginas, hora e link seguro. */

export type TomDoBadge = 'neutro' | 'azul' | 'ambar';

export interface RotuloDeEstado {
  texto: string;
  /** Nome do ícone lucide; o badge sempre leva ícone e texto (nunca só cor). */
  icone: string;
  tom: TomDoBadge;
}

const ESTADOS: Record<string, RotuloDeEstado> = {
  planejada: { texto: 'Planejada', icone: 'lucideCircleDashed', tom: 'neutro' },
  'com-spec': { texto: 'Com spec', icone: 'lucideFileText', tom: 'neutro' },
  'em-execucao': { texto: 'Em execução', icone: 'lucideLoaderCircle', tom: 'azul' },
  'em-revisao': { texto: 'Em revisão', icone: 'lucideGitPullRequest', tom: 'azul' },
  'pronta-para-entrega': { texto: 'Pronta para Entrega', icone: 'lucidePackageCheck', tom: 'ambar' },
};

export function rotuloDoEstado(estado: string, emCorrecao: boolean): RotuloDeEstado {
  const conhecido = ESTADOS[estado];
  if (!conhecido) return { texto: estado, icone: 'lucideCircleHelp', tom: 'neutro' };
  return estado === 'em-revisao' && emCorrecao ? { ...conhecido, texto: 'Em correção' } : conhecido;
}

export function rotuloDoProjeto(repositorio: string): string {
  return repositorio === 'api' ? 'API' : repositorio === 'frontend' ? 'Front' : repositorio;
}

export interface RotuloDePipeline {
  texto: string;
  icone: string;
}

const PIPELINES: Record<string, RotuloDePipeline> = {
  success: { texto: 'pipeline verde', icone: 'lucideCircleCheck' },
  failed: { texto: 'pipeline falhou', icone: 'lucideCircleX' },
  running: { texto: 'pipeline rodando', icone: 'lucideLoaderCircle' },
  pending: { texto: 'pipeline na fila', icone: 'lucideClock' },
  canceled: { texto: 'pipeline cancelado', icone: 'lucideCircleSlash' },
};

export function rotuloDoPipeline(status: string | null | undefined): RotuloDePipeline {
  if (!status) return { texto: 'sem pipeline', icone: 'lucideCircleDashed' };
  return PIPELINES[status] ?? { texto: `pipeline ${status}`, icone: 'lucideCircleHelp' };
}

/** Só http/https vindos da API viram `href`; qualquer outro esquema (javascript:, data:), relativo ou vazio é ignorado. */
export function linkSeguro(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  if (!texto) return null;
  try {
    const url = new URL(texto);
    return url.protocol === 'https:' || url.protocol === 'http:' ? texto : null;
  } catch {
    return null;
  }
}

/** `1 2 … 5 6 7 … 59 60`: duas primeiras, a atual com vizinhas e duas últimas (páginas de 1 a `total`). */
export function janelaDePaginas(atual: number, total: number): (number | '…')[] {
  const visiveis = [...new Set([1, 2, atual - 1, atual, atual + 1, total - 1, total].filter((p) => p >= 1 && p <= total))].sort((a, b) => a - b);
  const janela: (number | '…')[] = [];
  visiveis.forEach((p, i) => {
    if (i > 0 && p - visiveis[i - 1] > 1) janela.push('…');
    janela.push(p);
  });
  return janela;
}

/** "HH:MM" do instante, no fuso do navegador; nulo se faltar ou for inválido. */
export function horaDosDados(instante: string | null | undefined): string | null {
  if (!instante) return null;
  const data = new Date(instante);
  if (Number.isNaN(data.getTime())) return null;
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}
