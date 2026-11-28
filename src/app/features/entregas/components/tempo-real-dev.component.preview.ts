import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TempoRealService } from '../../../core/tempo-real/tempo-real.service.preview';
import { avancarEntregaFalsa } from '../entregas-api.service.preview';

/** Só existe no preview (`ng build --configuration preview`): avança a Etapa falsa e entrega `entrega.atualizada`, no contrato do SSE. */
@Component({
  selector: 'est-entrega-tempo-real-dev',
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
export class EntregaTempoRealDevComponent {
  private readonly tempoReal = inject(TempoRealService);
  readonly entregaId = input<string | null>(null);

  protected emitir(): void {
    const id = this.entregaId() ?? '';
    avancarEntregaFalsa(id);
    this.tempoReal.emitirFalso({
      tipo: 'entrega.atualizada',
      aplicacaoId: '019a0000-0000-7000-8000-000000000001',
      entregaId: id,
      fluxoId: '',
      etapa: 'qa',
      estado: 'aguardando-aprovacao',
    });
  }
}
