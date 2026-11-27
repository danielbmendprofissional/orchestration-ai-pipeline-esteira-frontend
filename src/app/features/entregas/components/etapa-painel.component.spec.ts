import { TestBed } from '@angular/core/testing';
import type { EntregaEtapa, EntregaFluxo } from '../entregas.tipos';
import { EtapaPainelComponent } from './etapa-painel.component';

const base: EntregaEtapa = { etapa: 'qa', estado: 'executando', codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: '2026-11-27T10:00:00Z' };
const fluxo: EntregaFluxo = {
  id: 'f1', projeto: { id: 'p1', nome: 'valuto-api' }, tipoMudanca: 'feature', sha: 'abc1234',
  fatias: [{ codigo: 'E1b', comFlag: true }, { codigo: 'E1a', comFlag: false }], etapas: [base],
};

describe('[E1b] EtapaPainelComponent', () => {
  const montar = (etapa: Partial<EntregaEtapa> = {}) => {
    const fixture = TestBed.createComponent(EtapaPainelComponent);
    fixture.componentRef.setInput('etapa', { ...base, ...etapa });
    fixture.componentRef.setInput('fluxo', fluxo);
    fixture.detectChanges();
    return fixture;
  };
  const el = (fx: ReturnType<typeof montar>) => fx.nativeElement as HTMLElement;

  it('mostra nome e estado da Etapa e as Fatias do Fluxo com a marca de flag', () => {
    const e = el(montar());
    expect(e.textContent).toContain('QA');
    expect(e.textContent).toContain('Executando');
    const fatias = Array.from(e.querySelectorAll('[data-testid="fatia"]')).map((f) => f.textContent ?? '');
    expect(fatias[0]).toContain('E1b');
    expect(fatias[0]).toContain('flag');
    expect(fatias[1]).toContain('E1a');
    expect(fatias[1]).not.toContain('flag');
  });

  it('pipelineUrl vira link externo seguro; sem url, sem link', () => {
    const a = el(montar({ pipelineUrl: 'https://gitlab.exemplo/p/1' })).querySelector<HTMLAnchorElement>('[data-testid="pipeline-link"]')!;
    expect(a.getAttribute('href')).toBe('https://gitlab.exemplo/p/1');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(el(montar()).querySelector('[data-testid="pipeline-link"]')).toBeNull();
  });

  it('url que não é http(s) não vira link (javascript:)', () => {
    expect(el(montar({ pipelineUrl: 'javascript:alert(1)' })).querySelector('[data-testid="pipeline-link"]')).toBeNull();
  });

  it('traduz o código da falha', () => {
    expect(el(montar({ estado: 'falhou', codigoFalha: 'pipeline.falhou' })).querySelector('[data-testid="falha"]')!.textContent).toContain('A pipeline falhou.');
    expect(el(montar({ estado: 'falhou', codigoFalha: 'pipeline.cancelada' })).querySelector('[data-testid="falha"]')!.textContent).toContain('A pipeline foi cancelada.');
  });

  it('Pulada por <nome> — <motivo>, com texto escapado (nunca HTML)', () => {
    const fx = montar({ estado: 'pulada', pulada: { por: '<img src=x onerror=alert(1)>', motivo: '<b>urgente</b>' } });
    const pulada = el(fx).querySelector('[data-testid="pulada"]')!;
    expect(pulada.textContent).toContain('Pulada por <img src=x onerror=alert(1)> — <b>urgente</b>');
    expect(pulada.querySelector('img, b')).toBeNull();
  });

  it('não tem botão de ação, só o de fechar, que emite fechar', () => {
    const fx = montar();
    let fechou = 0;
    fx.componentInstance.fechar.subscribe(() => fechou++);
    const botoes = Array.from(el(fx).querySelectorAll('button'));
    expect(botoes.map((b) => b.getAttribute('aria-label'))).toEqual(['Fechar painel da Etapa']);
    botoes[0].click();
    expect(fechou).toBe(1);
  });
});
