import { TestBed } from '@angular/core/testing';
import { EstadoBadgeComponent } from './estado-badge.component';

describe('[P1] EstadoBadgeComponent', () => {
  function montar(estado: string, emCorrecao = false) {
    const fixture = TestBed.createComponent(EstadoBadgeComponent);
    fixture.componentRef.setInput('estado', estado);
    fixture.componentRef.setInput('emCorrecao', emCorrecao);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra ícone e texto, nunca só cor', () => {
    const raiz = montar('em-execucao');
    const badge = raiz.querySelector('[data-testid="estado-badge"]')!;
    expect(badge.textContent).toContain('Em execução');
    expect(badge.querySelector('ng-icon')).not.toBeNull();
    expect(badge.getAttribute('data-tom')).toBe('azul');
  });

  it('Em revisão com correção diz "Em correção"', () => {
    expect(montar('em-revisao', true).textContent).toContain('Em correção');
  });

  it('Pronta para Entrega é âmbar e Planejada é neutra', () => {
    expect(montar('pronta-para-entrega').querySelector('[data-testid="estado-badge"]')!.getAttribute('data-tom')).toBe('ambar');
    expect(montar('planejada').querySelector('[data-testid="estado-badge"]')!.getAttribute('data-tom')).toBe('neutro');
  });
});
