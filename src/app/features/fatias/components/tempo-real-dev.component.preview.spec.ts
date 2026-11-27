import { TestBed } from '@angular/core/testing';
import { TempoRealService } from '../../../core/tempo-real/tempo-real.service.preview';
import type { EventoTempoReal } from '../../../core/tempo-real/tempo-real.tipos';
import { TempoRealDevComponent } from './tempo-real-dev.component.preview';

describe('[T1] TempoRealDevComponent (preview)', () => {
  it('o botão de desenvolvimento emite fatias.mudaram da Aplicação em tela', () => {
    const fixture = TestBed.createComponent(TempoRealDevComponent);
    fixture.componentRef.setInput('aplicacaoId', 'a1');
    fixture.detectChanges();
    const recebidos: EventoTempoReal[] = [];
    TestBed.inject(TempoRealService).eventos.subscribe((e) => recebidos.push(e));

    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="emitir-evento-falso"]')!;
    expect(botao.textContent).toContain('Emitir evento');
    botao.click();

    expect(recebidos).toEqual([{ tipo: 'fatias.mudaram', aplicacaoId: 'a1' }]);
  });
});
