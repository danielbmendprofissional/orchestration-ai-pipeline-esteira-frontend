import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw } from '@ng-icons/lucide';
import type { EstadoTempoReal } from '../../../core/tempo-real/tempo-real.tipos';
import { horaDosDados } from '../fatias.apresentacao';

/** "Atualizar" + frescor ("dados de HH:MM"). A região aria-live anuncia atualização em curso, dado antigo e o limite de atualização (10 s). */
@Component({
  selector: 'est-atualizar-fatias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideRefreshCw })],
  template: `
    <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <span aria-live="polite" class="text-2xs" [class]="desatualizado() ? 'text-run-fg' : 'text-fg-muted'">
        @if (atualizando()) {
          Atualizando…
        } @else if (recente()) {
          Os dados já estão atualizados{{ hora() ? ' (dados de ' + hora() + ')' : '' }}
        } @else if (hora()) {
          dados de {{ hora() }}{{ desatualizado() ? ' · desatualizados' : '' }}
        }
      </span>
      @if (rotuloTempoReal(); as rotulo) {
        <span data-testid="tempo-real" aria-live="polite" class="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
          <span aria-hidden="true" class="size-1.5 rounded-full" [class]="tempoReal() === 'ao-vivo' ? 'bg-ok-fg' : 'bg-fg-dim'"></span>{{ rotulo }}
        </span>
      }
      <button
        type="button"
        data-testid="atualizar"
        class="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 text-2xs font-semibold text-fg shadow-edge hover:bg-surface-3 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        [disabled]="atualizando()"
        [attr.aria-busy]="atualizando()"
        (click)="atualizar.emit()"
      >
        <ng-icon name="lucideRefreshCw" size="14" [class.animate-spin]="atualizando()" aria-hidden="true" />
        Atualizar
      </button>
    </div>
  `,
})
export class AtualizarFatiasComponent {
  readonly geradoEm = input<string | null>(null);
  readonly desatualizado = input(false);
  readonly atualizando = input(false);
  /** O último Atualizar bateu no limite (`painel.atualizacao-recente`): aviso leve, não erro. */
  readonly recente = input(false);
  /** Estado do tempo real (T1); `null` com o flag desligado ou o serviço parado: o indicador nem aparece. */
  readonly tempoReal = input<EstadoTempoReal | null>(null);
  readonly atualizar = output<void>();

  protected readonly rotuloTempoReal = computed(() => {
    switch (this.tempoReal()) {
      case 'ao-vivo':
        return 'Ao vivo';
      case 'reconectando':
        return 'Reconectando…';
      case 'consulta':
        return 'Atualização a cada 30 s';
      default:
        return null;
    }
  });

  protected readonly hora = computed(() => horaDosDados(this.geradoEm()));
}
