import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideLayoutGrid, lucideSearch } from '@ng-icons/lucide';
import type { AplicacaoDoPainel } from '../fatias.tipos';

export const MAXIMO_VISIVEL = 8;

/**
 * Seletor de Aplicação com busca e várias escolhas (DESIGN.md): botão que diz a escolha e um painel com busca, grupo
 * Recentes e no máximo 8 itens por vez ("digite para refinar"). Nunca um `select` com a lista inteira.
 * A seleção é do pai (`selecionadas`); este componente só emite a nova.
 */
@Component({
  selector: 'est-filtro-aplicacoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, NgTemplateOutlet],
  providers: [provideIcons({ lucideChevronDown, lucideLayoutGrid, lucideSearch })],
  host: { '(document:click)': 'cliqueFora($event)', '(keydown.escape)': 'fechar()', class: 'relative inline-block' },
  template: `
    <div>
      <button
        #gatilho
        type="button"
        data-testid="filtro-aplicacao"
        class="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface-1 px-3 text-sm text-fg-2 shadow-edge hover:bg-surface-2 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none"
        aria-haspopup="true"
        aria-controls="filtro-aplicacao-painel"
        [attr.aria-expanded]="aberto()"
        (click)="alternar()"
      >
        <ng-icon name="lucideLayoutGrid" size="16" aria-hidden="true" />
        <span>{{ rotulo() }}</span>
        <ng-icon name="lucideChevronDown" size="16" aria-hidden="true" />
      </button>

      @if (aberto()) {
        <div
          id="filtro-aplicacao-painel"
          role="group"
          aria-label="Filtrar por Aplicação"
          class="absolute left-0 top-11 z-20 w-[21.25rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line-strong bg-surface-1 shadow-popover"
        >
          <label class="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2 text-fg-muted">
            <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
            <input
              #campoBusca
              type="search"
              class="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-dim"
              [attr.aria-label]="'Buscar Aplicação'"
              [placeholder]="'Buscar entre ' + aplicacoes().length + ' aplicações'"
              [value]="busca()"
              (input)="busca.set($any($event.target).value)"
            />
          </label>

          <div class="max-h-[18.75rem] overflow-y-auto py-1">
            @if (recentesVisiveis().length) {
              <p class="px-3.5 pt-2 pb-1 text-2xs text-fg-dim">Recentes</p>
              @for (a of recentesVisiveis(); track a.id) {
                <ng-container *ngTemplateOutlet="opcao; context: { $implicit: a }" />
              }
            }
            @if (visiveis().length) {
              <p class="px-3.5 pt-2 pb-1 text-2xs text-fg-dim">{{ busca().trim() ? 'Resultado' : 'Outras aplicações' }}</p>
              @for (a of visiveis(); track a.id) {
                <ng-container *ngTemplateOutlet="opcao; context: { $implicit: a }" />
              }
            } @else if (!recentesVisiveis().length) {
              <p class="px-3.5 py-6 text-center text-sm text-fg-muted">Nenhuma aplicação com “{{ busca() }}”</p>
            }
          </div>

          <div class="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-3.5 py-2 text-2xs text-fg-muted">
            <span>
              @if (restantes().length > maximo) {
                Mostrando {{ visiveis().length }} de {{ restantes().length }}: digite para refinar
              } @else {
                {{ restantes().length + recentesVisiveis().length }} de {{ aplicacoes().length }} aplicações
              }
            </span>
            <button type="button" class="rounded-sm text-brand-fg hover:underline focus-visible:outline-2 focus-visible:outline-brand-fg" (click)="mudou.emit([])">Limpar seleção</button>
          </div>
        </div>
      }
    </div>

    <ng-template #opcao let-a>
      <label class="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-fg-2 hover:bg-surface-2">
        <input
          type="checkbox"
          data-testid="opcao-aplicacao"
          class="size-4 accent-brand"
          [value]="a.id"
          [checked]="selecionadas().includes(a.id)"
          (change)="alternarOpcao(a.id)"
        />
        <span>{{ a.nome }}</span>
        <span class="ml-auto font-mono text-2xs text-fg-muted">{{ a.sigla }}</span>
      </label>
    </ng-template>
  `,
})
export class FiltroAplicacoesComponent {
  readonly aplicacoes = input.required<AplicacaoDoPainel[]>();
  readonly selecionadas = input.required<string[]>();
  /** Ids das Aplicações escolhidas há pouco (memória da sessão, nada guardado no navegador). */
  readonly recentes = input<string[]>([]);
  readonly mudou = output<string[]>();

  protected readonly maximo = MAXIMO_VISIVEL;
  protected readonly aberto = signal(false);
  protected readonly busca = signal('');
  private readonly gatilho = viewChild<ElementRef<HTMLButtonElement>>('gatilho');
  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');
  private readonly injetor = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly rotulo = computed(() => {
    const nomes = this.selecionadas()
      .map((id) => this.aplicacoes().find((a) => a.id === id)?.nome)
      .filter((n): n is string => !!n);
    if (nomes.length === 0) return 'Todas as aplicações';
    return nomes.length === 1 ? nomes[0] : `${nomes[0]} +${nomes.length - 1}`;
  });

  private readonly achadas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.aplicacoes().filter((a) => !termo || a.nome.toLowerCase().includes(termo) || a.sigla.toLowerCase().includes(termo));
  });
  protected readonly recentesVisiveis = computed(() => {
    if (this.busca().trim()) return [];
    return this.recentes()
      .map((id) => this.aplicacoes().find((a) => a.id === id))
      .filter((a): a is AplicacaoDoPainel => !!a);
  });
  protected readonly restantes = computed(() => {
    const recentes = new Set(this.recentesVisiveis().map((a) => a.id));
    return this.achadas()
      .filter((a) => !recentes.has(a.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });
  protected readonly visiveis = computed(() => this.restantes().slice(0, MAXIMO_VISIVEL));

  protected alternar(): void {
    if (this.aberto()) {
      this.fechar();
      return;
    }
    this.busca.set('');
    this.aberto.set(true);
    afterNextRender(() => this.campoBusca()?.nativeElement.focus(), { injector: this.injetor });
  }

  protected fechar(): void {
    if (!this.aberto()) return;
    this.aberto.set(false);
    this.gatilho()?.nativeElement.focus();
  }

  protected cliqueFora(evento: Event): void {
    if (this.aberto() && !this.host.nativeElement.contains(evento.target as Node)) this.aberto.set(false);
  }

  protected alternarOpcao(id: string): void {
    const atuais = this.selecionadas();
    this.mudou.emit(atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]);
  }
}
