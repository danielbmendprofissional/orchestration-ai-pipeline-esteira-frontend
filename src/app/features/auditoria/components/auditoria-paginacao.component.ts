import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { janelaDePaginas } from '../../fatias/fatias.apresentacao';

const BOTAO =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line-strong bg-surface-1 px-2 text-fg-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:cursor-not-allowed disabled:opacity-45';

/** Paginação da Auditoria (12 por página, fixo): mesma janela de páginas do Painel, sem "Por página". Páginas começam em 1. */
@Component({
  selector: 'est-auditoria-paginacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  template: `
    @if (total() > 0) {
      <nav aria-label="Paginação" class="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <span data-testid="paginacao-info">{{ inicio() }}–{{ fim() }} de {{ total() }}</span>
        @if (totalPaginas() > 1) {
          <div class="flex items-center gap-1">
            <button type="button" [class]="botao" aria-label="Página anterior" [disabled]="pagina() <= 1" (click)="irPara.emit(pagina() - 1)">
              <ng-icon name="lucideChevronLeft" size="16" aria-hidden="true" />
            </button>
            @for (p of janela(); track $index) {
              @if (p === '…') {
                <span class="px-1 text-fg-dim" aria-hidden="true">…</span>
              } @else {
                <button
                  type="button"
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
        }
      </nav>
    }
  `,
})
export class AuditoriaPaginacaoComponent {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly total = input.required<number>();
  readonly tamanho = input.required<number>();
  readonly irPara = output<number>();

  protected readonly botao = BOTAO;
  protected readonly janela = computed(() => janelaDePaginas(this.pagina(), this.totalPaginas()));
  protected readonly inicio = computed(() => (this.pagina() - 1) * this.tamanho() + 1);
  protected readonly fim = computed(() => Math.min(this.total(), this.pagina() * this.tamanho()));
}
