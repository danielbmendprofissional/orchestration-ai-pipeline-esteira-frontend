import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCircleDashed, lucideCircleHelp, lucideCircleX, lucideClock, lucideLoaderCircle, lucideSkipForward } from '@ng-icons/lucide';
import { CLASSES_DO_TOM, type RotuloDeEstado } from '../entregas.apresentacao';

/** Pílula de estado (Entrega ou Etapa): ícone + texto, a cor só reforça (DESIGN.md). */
@Component({
  selector: 'est-estado-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCircleCheck, lucideCircleDashed, lucideCircleHelp, lucideCircleX, lucideClock, lucideLoaderCircle, lucideSkipForward })],
  template: `
    <span
      class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-2xs font-semibold shadow-edge"
      [class]="classes()"
    >
      <ng-icon [name]="rotulo().icone" size="14" aria-hidden="true" [class.motion-safe:animate-spin]="rotulo().gira" />
      <span>{{ rotulo().texto }}</span>
    </span>
  `,
})
export class EstadoPillComponent {
  readonly rotulo = input.required<RotuloDeEstado>();
  protected classes(): string {
    return CLASSES_DO_TOM[this.rotulo().tom];
  }
}
