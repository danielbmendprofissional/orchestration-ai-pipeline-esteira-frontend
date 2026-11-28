import { TestBed } from '@angular/core/testing';
import type { EstadoDasAnalises } from '../analises.tipos';
import type { EntregaEtapa, EntregaFluxo } from '../entregas.tipos';
import { ICONES_DO_SHELL } from '../../../layout/icones';
import { EtapaPainelComponent } from './etapa-painel.component';

const base: EntregaEtapa = { etapa: 'hml', estado: 'bloqueada', codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: '2026-11-28T10:00:00Z' };
const fluxo: EntregaFluxo = { id: 'f1', projeto: { id: 'p1', nome: 'valuto-api' }, tipoMudanca: 'feature', sha: 'abc1234', fatias: [], etapas: [base] };
const estado = (over: Partial<EstadoDasAnalises> = {}): EstadoDasAnalises => ({
  gate: { momento: 'gate', decisao: 'bloqueado', motivo: 'gate.politica-violada', contagem: { critica: 2, alta: 1, media: 4, baixa: 7 }, decididaEm: '2026-11-28T09:30:00Z' },
  doArtefato: [], doDeploy: [], carregando: false, erro: false, vazio: false,
  analiseAberta: null, severidade: undefined, achados: null, achadosCarregando: false, achadosErro: false, ...over,
});

describe('[E2] EtapaPainelComponent (Análises)', () => {
  const montar = (analises: EstadoDasAnalises | null, etapa: Partial<EntregaEtapa> = {}) => {
    const fixture = TestBed.createComponent(EtapaPainelComponent);
    fixture.componentRef.setInput('etapa', { ...base, ...etapa });
    fixture.componentRef.setInput('fluxo', fluxo);
    fixture.componentRef.setInput('analises', analises);
    fixture.detectChanges();
    return fixture;
  };
  const el = (fx: ReturnType<typeof montar>) => fx.nativeElement as HTMLElement;
  const q = (fx: ReturnType<typeof montar>, id: string) => el(fx).querySelector<HTMLElement>(`[data-testid="${id}"]`);

  it('o ícone de cadeado está registrado para a pill Bloqueada', () => {
    expect(ICONES_DO_SHELL).toHaveProperty('lucideLock');
  });

  it('Etapa bloqueada: pill com texto "Bloqueada" e ícone (nunca só cor)', () => {
    const pill = el(montar(estado())).querySelector('est-estado-pill')!;
    expect(pill.textContent).toContain('Bloqueada');
    expect(pill.querySelector('ng-icon svg')).not.toBeNull();
  });

  it('sem `analises` (flag desligada), não há abas', () => {
    const fx = montar(null);
    expect(el(fx).querySelector('[role="tablist"]')).toBeNull();
    expect(el(fx).textContent).not.toContain('Gate de segurança');
  });

  it('com Features:E2: abas Visão geral e Análises', () => {
    const abas = Array.from(el(montar(estado())).querySelectorAll('[role="tab"]')).map((t) => t.textContent!.trim());
    expect(abas).toEqual(['Visão geral', 'Análises']);
  });

  it('Visão geral: quatro contadores, linha "Gate de segurança" com o motivo e a data', () => {
    const fx = montar(estado());
    const contadores = Array.from(el(fx).querySelectorAll('[data-testid="contador"]')).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
    expect(contadores).toEqual(['Crítica2', 'Alta1', 'Média4', 'Baixa7']);
    const gate = q(fx, 'gate')!.textContent!;
    expect(gate).toContain('Gate de segurança');
    expect(gate).toContain('Bloqueou: 2 críticas · 1 alta');
    expect(gate).toContain('28/11/2026');
  });

  it('gate liberado e sem decisão', () => {
    expect(q(montar(estado({ gate: { momento: 'gate', decisao: 'liberado', motivo: null, contagem: { critica: 0, alta: 0, media: 1, baixa: 0 }, decididaEm: '2026-11-28T09:30:00Z' } })), 'gate')!.textContent).toContain('Liberado');
    expect(q(montar(estado({ gate: null })), 'gate')!.textContent).toContain('Sem decisão do gate ainda');
  });

  it('a aba Análises mostra o conteúdo e repassa os eventos', () => {
    const fx = montar(estado({ vazio: true }));
    const aba = Array.from(el(fx).querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => t.textContent!.includes('Análises'))!;
    aba.click();
    fx.detectChanges();
    expect(q(fx, 'vazio')!.textContent).toContain('Nenhuma Análise recebida ainda');
  });

  it('texto do motivo e do gate nunca vira HTML', () => {
    const fx = montar(estado({ gate: { momento: 'gate', decisao: '<b>x</b>', motivo: null, contagem: { critica: 0, alta: 0, media: 0, baixa: 0 }, decididaEm: '2026-11-28T09:30:00Z' } }));
    expect(q(fx, 'gate')!.querySelector('b')).toBeNull();
    expect(q(fx, 'gate')!.textContent).toContain('<b>x</b>');
  });
});
