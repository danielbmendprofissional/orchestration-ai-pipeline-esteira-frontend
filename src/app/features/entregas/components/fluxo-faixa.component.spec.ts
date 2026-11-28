import { TestBed } from '@angular/core/testing';
import type { EntregaFluxo } from '../entregas.tipos';
import { FluxoFaixaComponent } from './fluxo-faixa.component';

const etapa = (nome: string, estado: string) => ({ etapa: nome, estado, codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: '2026-11-27T10:00:00Z' });
const fluxo: EntregaFluxo = {
  id: 'f1', projeto: { id: 'p1', nome: 'valuto-api' }, tipoMudanca: 'feature', sha: 'abc1234',
  fatias: [], etapas: [etapa('abertura', 'concluido'), etapa('qa', 'executando'), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')],
};

describe('[E1b] FluxoFaixaComponent', () => {
  const montar = (f: EntregaFluxo = fluxo, aberta: string | null = null) => {
    const fixture = TestBed.createComponent(FluxoFaixaComponent);
    fixture.componentRef.setInput('fluxo', f);
    fixture.componentRef.setInput('aberta', aberta);
    fixture.detectChanges();
    return fixture;
  };
  const raiz = (fx: ReturnType<typeof montar>) => fx.nativeElement as HTMLElement;

  it('mostra Projeto, tipo da mudança, SHA curto e as quatro Etapas em ordem', () => {
    const el = raiz(montar());
    expect(el.textContent).toContain('valuto-api');
    expect(el.textContent).toContain('feature');
    expect(el.textContent).toContain('abc1234');
    const botoes = el.querySelectorAll('[data-testid="etapa"]');
    expect(Array.from(botoes).map((b) => b.getAttribute('data-etapa'))).toEqual(['abertura', 'qa', 'hml', 'prd']);
  });

  it('cada Etapa tem ícone (aria-hidden), texto do estado e nome acessível "QA Executando" (lido do conteúdo, sem aria-label divergente)', () => {
    const qa = raiz(montar()).querySelector<HTMLElement>('[data-etapa="qa"]')!;
    expect(qa.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(qa.textContent).toContain('Executando');
    expect(Array.from(qa.querySelectorAll('span span')).map((s) => s.textContent?.trim())).toEqual(['QA', 'Executando']);
    expect(qa.hasAttribute('aria-label')).toBe(false);
  });

  it('SHA ausente não deixa buraco e Etapa faltante aparece como não iniciado', () => {
    const el = raiz(montar({ ...fluxo, sha: null, etapas: [etapa('abertura', 'concluido')] }));
    expect(el.querySelectorAll('[data-testid="etapa"]').length).toBe(4);
    expect(el.querySelector<HTMLElement>('[data-etapa="prd"]')!.textContent).toContain('Não iniciado');
  });

  it('clicar emite a Etapa e a aberta fica com aria-expanded', () => {
    const fx = montar(fluxo, 'qa');
    const emitidas: string[] = [];
    fx.componentInstance.abrir.subscribe((e: string) => emitidas.push(e));
    raiz(fx).querySelector<HTMLButtonElement>('[data-etapa="hml"]')!.click();
    expect(emitidas).toEqual(['hml']);
    expect(raiz(fx).querySelector('[data-etapa="qa"]')!.getAttribute('aria-expanded')).toBe('true');
    expect(raiz(fx).querySelector('[data-etapa="hml"]')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('não tem botão de ação (aprovar/reprovar/atalho são da E3)', () => {
    const textos = Array.from(raiz(montar()).querySelectorAll('button')).map((b) => b.textContent?.toLowerCase() ?? '');
    expect(textos.some((t) => /aprovar|reprovar|atalho|pular/.test(t))).toBe(false);
  });
});
