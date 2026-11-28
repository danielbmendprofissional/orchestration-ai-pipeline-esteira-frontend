import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Botão de desenvolvimento do preview: no build normal não renderiza nada (a versão `.preview.ts` o substitui). */
@Component({
  selector: 'est-entrega-tempo-real-dev',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class EntregaTempoRealDevComponent {
  readonly entregaId = input<string | null>(null);
}
