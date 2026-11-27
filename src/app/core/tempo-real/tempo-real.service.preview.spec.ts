import { TestBed } from '@angular/core/testing';
import { TempoRealService } from './tempo-real.service.preview';
import type { EventoTempoReal } from './tempo-real.tipos';

describe('[T1] TempoRealService (preview)', () => {
  it('iniciar deixa ao-vivo e emitirFalso entrega o evento aos consumidores', () => {
    const servico = TestBed.inject(TempoRealService);
    const recebidos: EventoTempoReal[] = [];
    servico.eventos.subscribe((e) => recebidos.push(e));

    servico.iniciar();
    servico.emitirFalso({ tipo: 'fatias.mudaram', aplicacaoId: 'a1' });

    expect(servico.ativo()).toBe(true);
    expect(servico.estado()).toBe('ao-vivo');
    expect(recebidos).toEqual([{ tipo: 'fatias.mudaram', aplicacaoId: 'a1' }]);
  });

  it('parar desativa', () => {
    const servico = TestBed.inject(TempoRealService);
    servico.iniciar();
    servico.parar();

    expect(servico.ativo()).toBe(false);
  });
});
