import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TempoRealService } from '../../../core/tempo-real/tempo-real.service.preview';

/** Só existe no preview (`ng build --configuration preview`): entrega um evento falso, no contrato do SSE, ao Painel. */
@Component({
  selector: 'est-tempo-real-dev',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      data-testid="emitir-evento-falso"
      class="mt-4 h-8 rounded-md border border-dashed border-line-strong px-3 text-2xs text-fg-muted hover:bg-surface-2 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none"
      (click)="emitir()"
    >
      Emitir evento falso (preview)
    </button>
  `,
})
export class TempoRealDevComponent {
  private readonly tempoReal = inject(TempoRealService);
  readonly aplicacaoId = input<string | null>(null);

  protected emitir(): void {
    this.tempoReal.emitirFalso({ tipo: 'fatias.mudaram', aplicacaoId: this.aplicacaoId() ?? '' });
  }
}
