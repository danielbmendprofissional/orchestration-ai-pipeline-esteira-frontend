import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleDashed, lucideCircleHelp, lucideFileText, lucideGitPullRequest, lucideLoaderCircle, lucidePackageCheck } from '@ng-icons/lucide';
import { rotuloDoEstado, type TomDoBadge } from '../fatias.apresentacao';

const TONS: Record<TomDoBadge, string> = {
  neutro: 'border-line-strong bg-surface-2 text-fg-2',
  azul: 'border-brand/40 bg-brand-soft text-brand-fg',
  ambar: 'border-run-line bg-run-soft text-run-fg',
};

/** Badge de estado da Fatia (DESIGN.md): pílula com ícone e texto, sem barra. A cor só reforça o que o texto já diz. */
@Component({
  selector: 'est-estado-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCircleDashed, lucideCircleHelp, lucideFileText, lucideGitPullRequest, lucideLoaderCircle, lucidePackageCheck })],
  template: `
    <span
      data-testid="estado-badge"
      class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-2xs font-semibold shadow-edge"
      [class]="tom()"
      [attr.data-tom]="rotulo().tom"
    >
      <ng-icon [name]="rotulo().icone" size="14" aria-hidden="true" />
      <span>{{ rotulo().texto }}</span>
    </span>
  `,
})
export class EstadoBadgeComponent {
  readonly estado = input.required<string>();
  readonly emCorrecao = input(false);

  protected readonly rotulo = computed(() => rotuloDoEstado(this.estado(), this.emCorrecao()));
  protected readonly tom = computed(() => TONS[this.rotulo().tom]);
}
