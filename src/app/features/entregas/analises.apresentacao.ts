import type { DecisaoDaEtapa, SeveridadeDoAchado } from './analises.tipos';
import type { TomDoEstado } from './entregas.apresentacao';

/** Apresentação das Análises (E2): rótulos em português; texto desconhecido aparece como veio (sempre escapado). */
export const SEVERIDADES: readonly { id: SeveridadeDoAchado; rotulo: string; plural: string; classe: string }[] = [
  { id: 'critica', rotulo: 'Crítica', plural: 'críticas', classe: 'text-bad-fg' },
  { id: 'alta', rotulo: 'Alta', plural: 'altas', classe: 'text-run-fg' },
  { id: 'media', rotulo: 'Média', plural: 'médias', classe: 'text-sev-media' },
  { id: 'baixa', rotulo: 'Baixa', plural: 'baixas', classe: 'text-sev-baixa' },
];

export const rotuloDaSeveridade = (s: string): string => SEVERIDADES.find((x) => x.id === s)?.rotulo ?? s;
export const classeDaSeveridade = (s: string): string => SEVERIDADES.find((x) => x.id === s)?.classe ?? 'text-fg-2';

const VEREDITOS: Record<string, { texto: string; tom: TomDoEstado }> = {
  aprovado: { texto: 'Aprovado', tom: 'verde' },
  reprovado: { texto: 'Reprovado', tom: 'vermelho' },
  erro: { texto: 'Erro na análise', tom: 'ambar' },
};
export const rotuloDoVeredito = (v: string): { texto: string; tom: TomDoEstado } => VEREDITOS[v] ?? { texto: v, tom: 'neutro' };

type Contagem = Partial<Record<SeveridadeDoAchado, number | string>>;

/** "1 crítica · 2 altas"; sem nenhum Achado, "sem Achados". */
export function resumoDaContagem(c: Contagem): string {
  const partes = SEVERIDADES.flatMap((s) => {
    const n = Number(c[s.id] ?? 0);
    return n > 0 ? [`${n} ${n === 1 ? s.rotulo.toLowerCase() : s.plural}`] : [];
  });
  return partes.length ? partes.join(' · ') : 'sem Achados';
}

export const custoEmDolar = (valor: number | string): string => `US$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Linha "Gate de segurança": Liberado / Avisou / Bloqueou, com o motivo que a API devolveu. */
export function textoDoGate(g: DecisaoDaEtapa): { texto: string; tom: TomDoEstado } {
  if (g.decisao === 'liberado') return { texto: 'Liberado', tom: 'verde' };
  if (g.decisao === 'avisou') return { texto: 'Avisou', tom: 'ambar' };
  if (g.decisao === 'bloqueado' || g.decisao === 'bloqueou') {
    const c = g.contagem;
    const detalhe = resumoDaContagem({ critica: c.critica, alta: c.alta });
    return { texto: `Bloqueou: ${detalhe === 'sem Achados' ? (g.motivo ?? 'motivo não informado') : detalhe}`, tom: 'vermelho' };
  }
  return { texto: g.decisao, tom: 'neutro' };
}
