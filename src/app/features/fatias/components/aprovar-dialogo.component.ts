import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideGitPullRequest } from '@ng-icons/lucide';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { rotuloDoProjeto } from '../fatias.apresentacao';
import type { ErroDaDecisao, MrParaAprovar } from './decisao-dialogo.tipos';

let proximo = 0;

/**
 * Diálogo de Aprovar (burro): diz o que vai acontecer e lista as MRs, API primeiro. O erro de negócio da API
 * (CI não verde, decisão em andamento...) aparece aqui dentro, como texto.
 */
@Component({
  selector: 'est-aprovar-dialogo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmDialogImports, HlmButtonImports],
  providers: [provideIcons({ lucideCircleAlert, lucideGitPullRequest })],
  template: `
    <hlm-dialog [state]="aberto() ? 'open' : 'closed'" [aria-describedby]="descricao()" (stateChanged)="aoMudarEstado($event)">
      <hlm-dialog-content *hlmDialogPortal="let ctx" [showCloseButton]="false" class="border-line bg-surface-1 shadow-popover sm:max-w-lg">
        <hlm-dialog-header>
          <h2 hlmDialogTitle class="text-base font-semibold text-fg">Aprovar {{ codigo() }}</h2>
          <p [id]="idTexto" class="text-sm text-fg-muted">
            Aprovar mergeia na <code class="font-mono text-xs text-fg-2">main</code> com o flag <code class="font-mono text-xs text-fg-2">Features:{{ codigo() }}</code>
            desligado; a API primeiro. Estas MRs serão mergeadas:
          </p>
        </hlm-dialog-header>

        <ul class="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface-2 text-sm">
          @for (mr of ordenadas(); track mr.repositorio + (mr.iid ?? '')) {
            <li data-testid="aprovar-mr" class="flex flex-wrap items-center gap-x-2 px-3.5 py-2.5">
              <ng-icon name="lucideGitPullRequest" size="14" class="text-fg-muted" aria-hidden="true" />
              <span class="font-semibold text-fg">{{ rotulo(mr.repositorio) }}</span>
              @if (mr.iid !== undefined) {
                <span class="font-mono text-xs text-fg-2">!{{ mr.iid }}</span>
              }
              @if (mr.titulo) {
                <span class="min-w-0 break-words text-fg-muted">{{ mr.titulo }}</span>
              }
            </li>
          }
        </ul>

        @if (erro(); as e) {
          <div role="alert" [id]="idErro" class="flex items-start gap-2 rounded-lg border border-bad-line bg-bad-soft px-3.5 py-2.5 text-sm text-fg-2">
            <ng-icon name="lucideCircleAlert" size="16" class="mt-0.5 shrink-0 text-bad-fg" aria-hidden="true" />
            <span>{{ e.mensagem ?? 'Não foi possível aprovar a Fatia.' }}</span>
          </div>
        }

        <hlm-dialog-footer>
          <button hlmBtn type="button" variant="outline" data-testid="aprovar-cancelar" (click)="cancelar.emit()">Cancelar</button>
          <button hlmBtn type="button" data-testid="aprovar-confirmar" [disabled]="enviando()" (click)="confirmar.emit()">
            {{ enviando() ? 'Aprovando…' : 'Aprovar' }}
          </button>
        </hlm-dialog-footer>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class AprovarDialogoComponent {
  readonly aberto = input.required<boolean>();
  readonly codigo = input.required<string>();
  readonly mrs = input.required<MrParaAprovar[]>();
  readonly enviando = input(false);
  readonly erro = input<ErroDaDecisao | null>(null);
  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  private readonly id = ++proximo;
  protected readonly idTexto = `aprovar-texto-${this.id}`;
  protected readonly idErro = `aprovar-erro-${this.id}`;
  protected readonly rotulo = rotuloDoProjeto;
  protected readonly descricao = computed(() => (this.erro() ? `${this.idTexto} ${this.idErro}` : this.idTexto));
  /** A API vai primeiro (ADR-0025). */
  protected readonly ordenadas = computed(() => [...this.mrs()].sort((a, b) => Number(a.repositorio === 'frontend') - Number(b.repositorio === 'frontend')));

  /** Esc e clique no véu fecham pelo diálogo; o estado volta para o pai. */
  protected aoMudarEstado(estado: BrnDialogState): void {
    if (estado === 'closed' && this.aberto()) this.cancelar.emit();
  }
}
