import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { COMENTARIO_MAXIMO } from '../fatias.service';
import type { ErroDaDecisao } from './decisao-dialogo.tipos';

let proximo = 0;

/**
 * Diálogo de Reprovar (burro): Comentário obrigatório com contador, vai para a MR com o nome de quem reprova.
 * O erro de negócio da API aparece aqui dentro (texto, nunca HTML) e o comentário digitado fica para nova tentativa.
 */
@Component({
  selector: 'est-reprovar-dialogo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmDialogImports, HlmButtonImports, HlmInputImports, HlmLabelImports],
  providers: [provideIcons({ lucideCircleAlert })],
  template: `
    <hlm-dialog [state]="aberto() ? 'open' : 'closed'" [autoFocus]="'#' + idCampo" (stateChanged)="aoMudarEstado($event)">
      <hlm-dialog-content *hlmDialogPortal="let ctx" [showCloseButton]="false" class="border-line bg-surface-1 shadow-popover sm:max-w-lg">
        <hlm-dialog-header>
          <h2 hlmDialogTitle class="text-base font-semibold text-fg">Reprovar {{ codigo() }}</h2>
          <p class="text-sm text-fg-muted">A MR será fechada e o comentário será postado na MR com o seu nome.</p>
        </hlm-dialog-header>

        <div class="flex flex-col gap-1.5">
          <label hlmLabel [for]="idCampo" class="text-sm font-medium text-fg">Comentário</label>
          <textarea
            hlmInput
            data-testid="reprovar-comentario"
            rows="5"
            required
            class="h-auto min-h-28 resize-y py-2 text-sm"
            [id]="idCampo"
            [value]="comentario()"
            [attr.aria-invalid]="excedeu() ? 'true' : null"
            #campo
            (input)="comentario.set($any($event.target).value)"
          ></textarea>
          <p data-testid="reprovar-contador" [id]="idContador" class="self-end text-2xs tabular-nums" [class]="excedeu() ? 'font-semibold text-bad-fg' : 'text-fg-muted'">
            {{ tamanho() }} / {{ maximo }}
          </p>
        </div>

        @if (erro(); as e) {
          <div role="alert" [id]="idErro" class="flex items-start gap-2 rounded-lg border border-bad-line bg-bad-soft px-3.5 py-2.5 text-sm text-fg-2">
            <ng-icon name="lucideCircleAlert" size="16" class="mt-0.5 shrink-0 text-bad-fg" aria-hidden="true" />
            <span>{{ e.mensagem ?? 'Não foi possível reprovar a Fatia.' }}</span>
          </div>
        }

        <hlm-dialog-footer>
          <button hlmBtn type="button" variant="outline" data-testid="reprovar-cancelar" (click)="cancelar.emit()">Cancelar</button>
          <button hlmBtn type="button" variant="destructive" data-testid="reprovar-confirmar" [disabled]="!valido() || enviando()" (click)="confirmar.emit(comentario().trim())">
            {{ enviando() ? 'Reprovando…' : 'Reprovar' }}
          </button>
        </hlm-dialog-footer>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class ReprovarDialogoComponent {
  readonly aberto = input.required<boolean>();
  readonly codigo = input.required<string>();
  readonly enviando = input(false);
  readonly erro = input<ErroDaDecisao | null>(null);
  readonly confirmar = output<string>();
  readonly cancelar = output<void>();

  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  protected readonly maximo = COMENTARIO_MAXIMO;
  protected readonly comentario = signal('');
  protected readonly idCampo = `reprovar-comentario-${++proximo}`;
  protected readonly idContador = `${this.idCampo}-contador`;
  protected readonly idErro = `${this.idCampo}-erro`;
  protected readonly tamanho = computed(() => this.comentario().length);
  protected readonly excedeu = computed(() => this.tamanho() > COMENTARIO_MAXIMO);
  protected readonly valido = computed(() => this.comentario().trim().length > 0 && !this.excedeu());
  protected readonly descricao = computed(() => (this.erro() ? `${this.idContador} ${this.idErro}` : this.idContador));

  constructor() {
    // fechou: o próximo Reprovar começa em branco
    effect(() => {
      if (!this.aberto()) this.comentario.set('');
    });
    // o `hlmInput` já escreve `aria-describedby` (campo do spartan) e não aceita o valor por binding: o texto vai direto no elemento
    effect(() => {
      const el = this.campo()?.nativeElement;
      const ids = this.descricao();
      el?.setAttribute('aria-describedby', ids);
    });
  }

  /** Esc e clique no véu fecham pelo diálogo; o estado volta para o pai. */
  protected aoMudarEstado(estado: BrnDialogState): void {
    if (estado === 'closed' && this.aberto()) this.cancelar.emit();
  }
}
