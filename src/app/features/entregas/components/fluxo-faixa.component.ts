import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideCircleCheck, lucideCircleDashed, lucideCircleHelp, lucideCircleX, lucideClock, lucideLoaderCircle, lucideSkipForward } from '@ng-icons/lucide';
import { CLASSES_DO_TOM, ETAPAS_DO_FLUXO, nomeDaEtapa, rotuloDaEtapa } from '../entregas.apresentacao';
import type { EntregaFluxo } from '../entregas.tipos';

/**
 * Faixa de um Fluxo: Projeto, tipo da mudança, SHA curto e as Etapas Abertura → QA → HML → PRD (estilo GitHub Actions).
 * Cada Etapa é um botão que só abre o painel dela; ícone + texto, nunca só cor. Em ≤ 760 px vira lista vertical.
 */
@Component({
  selector: 'est-fluxo-faixa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronRight, lucideCircleCheck, lucideCircleDashed, lucideCircleHelp, lucideCircleX, lucideClock, lucideLoaderCircle, lucideSkipForward })],
  template: `
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 class="text-lg font-semibold text-fg">{{ fluxo().projeto.nome }}</h2>
      <span class="rounded-sm border border-line-strong px-1.5 text-2xs text-fg-2">{{ fluxo().tipoMudanca }}</span>
      @if (fluxo().sha; as sha) {
        <span class="font-mono text-2xs text-fg-muted" title="SHA do Artefato">{{ sha.slice(0, 7) }}</span>
      }
    </div>
    <ol class="mt-3 flex flex-col gap-2 md:flex-row md:items-stretch" [attr.aria-label]="'Etapas de ' + fluxo().projeto.nome">
      @for (e of etapas(); track e.etapa; let ultimo = $last) {
        <li class="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            data-testid="etapa"
            class="flex min-w-0 flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 text-left shadow-edge hover:bg-surface-3 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none"
            [class]="e.classes"
            [attr.data-etapa]="e.etapa"
            [attr.aria-expanded]="aberta() === e.etapa"
            (click)="abrir.emit(e.etapa)"
          >
            <ng-icon [name]="e.rotulo.icone" size="20" aria-hidden="true" class="shrink-0" [class.motion-safe:animate-spin]="e.rotulo.gira" />
            <span class="flex min-w-0 flex-col">
              <span class="text-sm font-semibold text-fg">{{ e.nome }}</span>
              <span class="text-2xs">{{ e.rotulo.texto }}</span>
            </span>
          </button>
          @if (!ultimo) {
            <ng-icon name="lucideChevronRight" size="16" aria-hidden="true" class="hidden shrink-0 text-fg-dim md:block" />
          }
        </li>
      }
    </ol>
  `,
})
export class FluxoFaixaComponent {
  readonly fluxo = input.required<EntregaFluxo>();
  /** Etapa deste Fluxo com o painel aberto. */
  readonly aberta = input<string | null>(null);
  readonly abrir = output<string>();

  protected readonly etapas = computed(() =>
    ETAPAS_DO_FLUXO.map((nome) => {
      const rotulo = rotuloDaEtapa(this.fluxo().etapas.find((x) => x.etapa === nome)?.estado ?? 'nao-iniciado');
      return { etapa: nome, nome: nomeDaEtapa(nome), rotulo, classes: CLASSES_DO_TOM[rotulo.tom] };
    }),
  );
}
