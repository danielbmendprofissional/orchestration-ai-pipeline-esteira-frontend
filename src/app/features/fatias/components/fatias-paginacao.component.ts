import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { janelaDePaginas } from '../fatias.apresentacao';

export const TAMANHOS_DE_PAGINA = [5, 8, 10, 20, 50, 100];

const BOTAO =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line-strong bg-surface-1 px-2 text-fg-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:cursor-not-allowed disabled:opacity-45';
const CAMPO =
  'h-8 rounded-md border border-line-strong bg-surface-1 px-2 text-fg-2 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none';

/** Paginação com janela (`1 2 … 5 6 7 … 59 60`), "Ir para" e "Por página" (DESIGN.md). Páginas começam em 1. */
@Component({
  selector: 'est-fatias-paginacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  template: `
    @if (total() > 0) {
      <nav aria-label="Paginação" class="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <span data-testid="paginacao-info">{{ inicio() }}–{{ fim() }} de {{ total() }}</span>

        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-1.5">
            Por página
            <select [class]="campo" aria-label="Fatias por página" (change)="mudarTamanho.emit(+$any($event.target).value)">
              @for (t of tamanhos; track t) {
                <option [value]="t" [selected]="t === tamanho()">{{ t }}</option>
              }
            </select>
          </label>

          @if (totalPaginas() > 1) {
            <div class="flex items-center gap-1">
              <button type="button" [class]="botao" aria-label="Página anterior" [disabled]="pagina() <= 1" (click)="irPara.emit(pagina() - 1)">
                <ng-icon name="lucideChevronLeft" size="16" aria-hidden="true" />
              </button>
              @for (p of janela(); track $index) {
                @if (p === '…') {
                  <span data-testid="pagina-reticencias" class="px-1 text-fg-dim" aria-hidden="true">…</span>
                } @else {
                  <button
                    type="button"
                    data-testid="pagina-numero"
                    [class]="p === pagina() ? botao + ' border-brand-hover! bg-brand-soft! text-fg!' : botao"
                    [attr.aria-current]="p === pagina() ? 'page' : null"
                    [attr.aria-label]="'Página ' + p"
                    (click)="irPara.emit(+p)"
                  >{{ p }}</button>
                }
              }
              <button type="button" [class]="botao" aria-label="Próxima página" [disabled]="pagina() >= totalPaginas()" (click)="irPara.emit(pagina() + 1)">
                <ng-icon name="lucideChevronRight" size="16" aria-hidden="true" />
              </button>
            </div>

            <label class="flex items-center gap-1.5">
              Ir para
              <input
                type="number"
                [class]="campo + ' w-16'"
                min="1"
                [max]="totalPaginas()"
                [placeholder]="'' + pagina()"
                aria-label="Ir para a página"
                (keydown.enter)="ir($any($event.target).value)"
              />
            </label>
          }
        </div>
      </nav>
    }
  `,
})
export class FatiasPaginacaoComponent {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly total = input.required<number>();
  readonly tamanho = input.required<number>();
  readonly irPara = output<number>();
  readonly mudarTamanho = output<number>();

  protected readonly tamanhos = TAMANHOS_DE_PAGINA;
  protected readonly botao = BOTAO;
  protected readonly campo = CAMPO;
  protected readonly janela = computed(() => janelaDePaginas(this.pagina(), this.totalPaginas()));
  protected readonly inicio = computed(() => (this.pagina() - 1) * this.tamanho() + 1);
  protected readonly fim = computed(() => Math.min(this.total(), this.pagina() * this.tamanho()));

  protected ir(valor: string): void {
    const pedida = Math.trunc(Number(valor));
    if (!Number.isFinite(pedida) || pedida < 1) return;
    this.irPara.emit(Math.min(pedida, this.totalPaginas()));
  }
}
