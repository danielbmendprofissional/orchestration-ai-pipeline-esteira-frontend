import { TestBed } from '@angular/core/testing';
import { TempoRealService } from '../../../core/tempo-real/tempo-real.service.preview';
import type { EventoTempoReal } from '../../../core/tempo-real/tempo-real.tipos';
import { ENTREGAS_DO_PREVIEW } from '../entregas-api.service.preview';
import { EntregaTempoRealDevComponent } from './tempo-real-dev.component.preview';

describe('[E1b] EntregaTempoRealDevComponent (preview)', () => {
  it('o botão avança a Etapa falsa e emite entrega.atualizada da Entrega em tela', () => {
    const fixture = TestBed.createComponent(EntregaTempoRealDevComponent);
    fixture.componentRef.setInput('entregaId', ENTREGAS_DO_PREVIEW[0]);
    fixture.detectChanges();
    const recebidos: EventoTempoReal[] = [];
    TestBed.inject(TempoRealService).eventos.subscribe((e) => recebidos.push(e));

    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="emitir-evento-falso"]')!;
    expect(botao.textContent).toContain('Emitir evento');
    botao.click();

    expect(recebidos).toHaveLength(1);
    expect(recebidos[0]).toMatchObject({ tipo: 'entrega.atualizada', entregaId: ENTREGAS_DO_PREVIEW[0] });
  });
});
