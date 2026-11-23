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

const MOTIVOS: Record<string, string> = {
  papel: 'Seu papel não permite esta ação.',
  'sem-mr-aberta': 'A Fatia não tem merge request aberta.',
  'ci-nao-verde': 'Todas as MRs abertas precisam estar com o CI verde.',
  'decisao-em-andamento': 'Já há uma decisão em andamento para esta Fatia.',
  'review-ja-pedido': 'O review já foi pedido.',
};

/** Texto do `title` do botão desativado: a API manda o código do motivo; desconhecido volta como veio. */
export function textoDoMotivo(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  return MOTIVOS[motivo] ?? motivo;
}

export interface RotuloDeDecisao {
  texto: string;
  icone: string;
}

const DECISOES: Record<string, RotuloDeDecisao> = {
  aprovando: { texto: 'aprovação pedida', icone: 'lucideClock' },
  reprovando: { texto: 'reprovação pedida', icone: 'lucideClock' },
  falhou: { texto: 'falhou, reexecutar na P2b', icone: 'lucideCircleX' },
};

/** Estado da decisão na linha; `nenhuma` (ou campo ausente, flag desligada) não mostra nada. */
export function rotuloDaDecisao(decisao: string | null | undefined): RotuloDeDecisao | null {
  return (decisao && DECISOES[decisao]) || null;
}

export interface RotuloDeReview extends RotuloDeDecisao {
  /** Só `aberto` com http/https vira link; texto da API nunca vira HTML. */
  link: string | null;
}

export function rotuloDoReview(review: { estado: string; link: string | null } | null | undefined): RotuloDeReview | null {
  switch (review?.estado) {
    case 'pedido':
      return { texto: 'review pedido…', icone: 'lucideClock', link: null };
    case 'aberto':
      return { texto: 'review aberto', icone: 'lucideExternalLink', link: linkSeguro(review.link) };
    case 'falhou':
      return { texto: 'review falhou', icone: 'lucideCircleX', link: null };
    default:
      return null;
  }
}

const TIPOS_DE_ACAO: Record<string, string> = { 'abrir-review': 'Abrir review', aprovar: 'Aprovar', reprovar: 'Reprovar' };
const ICONES_DE_ACAO: Record<string, string> = {
  pedida: 'lucideClock',
  executando: 'lucideLoaderCircle',
  confirmada: 'lucideCircleCheck',
  falhou: 'lucideCircleX',
  cancelada: 'lucideCircleSlash',
};

/** Linha da seção "Ações do bot" na gaveta: tipo e estado em texto, com ícone. */
export function rotuloDaAcao(acao: { tipo: string; estado: string }): { tipo: string; estado: string; icone: string } {
  return { tipo: TIPOS_DE_ACAO[acao.tipo] ?? acao.tipo, estado: acao.estado, icone: ICONES_DE_ACAO[acao.estado] ?? 'lucideCircleHelp' };
}
