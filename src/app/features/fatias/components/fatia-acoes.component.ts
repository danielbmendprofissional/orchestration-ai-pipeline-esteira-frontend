import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleX, lucideClock, lucideExternalLink } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { rotuloDaDecisao, rotuloDoReview, textoDoMotivo } from '../fatias.apresentacao';
import type { AcoesDaLinha } from '../fatias.service';

let proximo = 0;

/**
 * Botões de decisão de uma Fatia Em revisão (burro): Abrir review (ou o estado do review), Reprovar e Aprovar.
 * Sem permissão, o botão fica desativado e o motivo vai no `title` (e num texto só para leitor de tela).
 * `acoes` nulo = flag desligada: nada é desenhado.
 */
@Component({
  selector: 'est-fatia-acoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, NgIcon, HlmButtonImports],
  providers: [provideIcons({ lucideCircleX, lucideClock, lucideExternalLink })],
  template: `
    @if (acoes(); as a) {
      <div class="flex flex-col items-start gap-1.5">
        <div class="flex flex-wrap items-center gap-1.5">
          @if (review(); as r) {
            @if (r.link) {
              <a
                data-testid="review-link"
                [href]="r.link"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 rounded-sm text-xs text-brand-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
                (click)="$event.stopPropagation()"
              >
                <ng-icon name="lucideExternalLink" size="12" aria-hidden="true" />{{ r.texto }}<span class="sr-only"> de {{ codigo() }} (abre em outra aba)</span>
              </a>
            } @else {
              <span data-testid="review-estado" class="inline-flex items-center gap-1 text-xs text-fg-muted">
                <ng-icon [name]="r.icone" size="12" aria-hidden="true" />{{ r.texto }}
              </span>
            }
          }
          @if (mostrarAbrirReview()) {
            <ng-container *ngTemplateOutlet="botao; context: { id: 'abrir-review', rotulo: 'Abrir review', p: a.abrirReview, variante: 'outline' }" />
          }
          <ng-container *ngTemplateOutlet="botao; context: { id: 'reprovar', rotulo: 'Reprovar', p: a.reprovar, variante: 'destructive' }" />
          <ng-container *ngTemplateOutlet="botao; context: { id: 'aprovar', rotulo: 'Aprovar', p: a.aprovar, variante: 'default' }" />
        </div>
        @if (decisao(); as d) {
          <span data-testid="decisao-estado" class="inline-flex items-center gap-1 text-xs text-fg-2">
            <ng-icon [name]="d.icone" size="12" aria-hidden="true" />{{ d.texto }}
          </span>
        }
      </div>
    }

    <ng-template #botao let-id="id" let-rotulo="rotulo" let-p="p" let-variante="variante">
      <button
        hlmBtn
        type="button"
        size="sm"
        [variant]="variante"
        [attr.data-testid]="'acao-' + id"
        [attr.aria-label]="rotulo + ' ' + codigo()"
        [disabled]="!p.pode"
        [attr.title]="p.pode ? null : motivo(p.motivo)"
        [attr.aria-describedby]="p.pode || !motivo(p.motivo) ? null : idMotivo + id"
        (click)="$event.stopPropagation(); emitir(id)"
      >{{ rotulo }}</button>
      @if (!p.pode && motivo(p.motivo)) {
        <span class="sr-only" [id]="idMotivo + id">{{ motivo(p.motivo) }}</span>
      }
    </ng-template>
  `,
})
export class FatiaAcoesComponent {
  readonly acoes = input.required<AcoesDaLinha | null>();
  /** Só para o nome acessível dos botões ("Aprovar P2"). */
  readonly codigo = input.required<string>();
  readonly abrirReview = output<void>();
  readonly reprovar = output<void>();
  readonly aprovar = output<void>();

  protected readonly idMotivo = `acao-motivo-${++proximo}-`;
  protected readonly motivo = textoDoMotivo;
  protected readonly review = computed(() => rotuloDoReview(this.acoes()?.review));
  protected readonly decisao = computed(() => rotuloDaDecisao(this.acoes()?.decisao));
  /** Review pedido ou aberto: o estado ocupa o lugar do botão. */
  protected readonly mostrarAbrirReview = computed(() => {
    const estado = this.acoes()?.review.estado;
    return estado !== 'pedido' && estado !== 'aberto';
  });

  protected emitir(id: string): void {
    if (id === 'abrir-review') this.abrirReview.emit();
    else if (id === 'reprovar') this.reprovar.emit();
    else this.aprovar.emit();
  }
}
