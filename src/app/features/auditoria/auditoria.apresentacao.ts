import type { CategoriaDeAuditoria } from './auditoria.tipos';

/** Rótulo e ícone (lucide) de cada categoria: a categoria nunca é só cor (DESIGN.md). Ordem = ordem dos chips. */
export const CATEGORIAS: readonly { chave: CategoriaDeAuditoria; rotulo: string; icone: string }[] = [
  { chave: 'aprovacao', rotulo: 'Aprovações', icone: 'lucideUserCheck' },
  { chave: 'fatias', rotulo: 'Fatias', icone: 'lucideListChecks' },
  { chave: 'entrega', rotulo: 'Entregas', icone: 'lucideLayers' },
  { chave: 'publicacao', rotulo: 'Publicações', icone: 'lucideRocket' },
  { chave: 'excecao', rotulo: 'Exceções', icone: 'lucideShield' },
  { chave: 'politica', rotulo: 'Política', icone: 'lucideShieldCheck' },
  { chave: 'cadastro', rotulo: 'Cadastro', icone: 'lucideLayoutGrid' },
  { chave: 'papeis', rotulo: 'Papéis', icone: 'lucideUsers' },
];

export function categoriaDe(chave: string): { rotulo: string; icone: string } {
  return CATEGORIAS.find((c) => c.chave === chave) ?? { rotulo: chave, icone: 'lucideCircleHelp' };
}

const ORIGENS: Record<string, string> = {
  tela: 'Tela da Esteira',
  bot: 'Bot da Esteira, no GitLab',
  pipeline: 'Pipeline do GitLab',
};

export const rotuloDaOrigem = (origem: string): string => ORIGENS[origem] ?? origem;

export function iconeDaOrigem(origem: string): string | null {
  return origem === 'bot' ? 'lucideBot' : origem === 'pipeline' ? 'lucideGitBranch' : null;
}

export function horaDe(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function dataEHoraDe(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
