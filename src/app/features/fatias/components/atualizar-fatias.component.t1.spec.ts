import { TestBed } from '@angular/core/testing';
import type { EstadoTempoReal } from '../../../core/tempo-real/tempo-real.tipos';
import { AtualizarFatiasComponent } from './atualizar-fatias.component';

describe('[T1] AtualizarFatiasComponent: indicador de tempo real', () => {
  function montar(estado: EstadoTempoReal | null | undefined) {
    const fixture = TestBed.createComponent(AtualizarFatiasComponent);
    if (estado !== undefined) fixture.componentRef.setInput('tempoReal', estado);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, indicador: () => raiz.querySelector<HTMLElement>('[data-testid="tempo-real"]') };
  }

  it('sem estado (flag desligado ou serviço parado): não mostra indicador', () => {
    expect(montar(null).indicador()).toBeNull();
    expect(montar(undefined).indicador()).toBeNull();
  });

  it.each([
    ['ao-vivo', 'Ao vivo'],
    ['reconectando', 'Reconectando…'],
    ['consulta', 'Atualização a cada 30 s'],
  ] as const)('estado %s mostra "%s" numa região aria-live polite', (estado, texto) => {
    const { indicador } = montar(estado);
    expect(indicador()!.textContent!.trim()).toBe(texto);
    expect(indicador()!.getAttribute('aria-live')).toBe('polite');
  });

  it('o texto muda na mesma região (anuncia só a troca) e o botão Atualizar segue ativo', () => {
    const { fixture, indicador, raiz } = montar('ao-vivo');
    const regiao = indicador()!;
    fixture.componentRef.setInput('tempoReal', 'reconectando');
    fixture.detectChanges();
    expect(indicador()).toBe(regiao);
    expect(regiao.textContent!.trim()).toBe('Reconectando…');
    expect(raiz.querySelector<HTMLButtonElement>('[data-testid="atualizar"]')!.disabled).toBe(false);
  });
});
