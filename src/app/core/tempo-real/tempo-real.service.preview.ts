import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { EstadoTempoReal, EventoTempoReal } from './tempo-real.tipos';

/**
 * Preview (`ng build --configuration preview`): no lugar do SSE, fica sempre `ao-vivo` e só emite o que
 * `emitirFalso` mandar (a T1.6 liga um botão de desenvolvimento nele). Mesma superfície do serviço real.
 */
@Injectable({ providedIn: 'root' })
export class TempoRealService {
  private readonly estado$ = signal<EstadoTempoReal>('reconectando');
  private readonly ativo$ = signal(false);
  private readonly fluxo = new Subject<EventoTempoReal>();

  readonly estado = this.estado$.asReadonly();
  readonly ativo = this.ativo$.asReadonly();
  readonly eventos = this.fluxo.asObservable();

  iniciar(): void {
    this.ativo$.set(true);
    this.estado$.set('ao-vivo');
  }

  parar(): void {
    this.ativo$.set(false);
    this.estado$.set('reconectando');
  }

  /** Só existe no preview: entrega um evento aos consumidores como se viesse do servidor. */
  emitirFalso(evento: EventoTempoReal): void {
    this.fluxo.next(evento);
  }
}
