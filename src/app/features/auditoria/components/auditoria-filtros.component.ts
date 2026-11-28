import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayers, lucideLayoutGrid, lucideListChecks, lucideRocket, lucideSearch, lucideShield, lucideShieldCheck, lucideUserCheck, lucideUsers, lucideX,
} from '@ng-icons/lucide';
import type { MudancaDeFiltro } from '../auditoria.service';
import { CATEGORIAS } from '../auditoria.apresentacao';
import type { AplicacaoDoRegistro, CategoriaContagem, FiltroAuditoria, PessoaDoFiltro } from '../auditoria.tipos';

const ATRASO_DA_BUSCA_MS = 300;
const SELECT =
  'h-9 max-w-full rounded-lg border border-line-strong bg-surface-1 px-3 text-sm text-fg-2 shadow-edge hover:bg-surface-2 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none';
const CHIP =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface-1 px-3 text-2xs font-semibold text-fg-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg aria-pressed:border-brand-hover aria-pressed:bg-brand-soft aria-pressed:text-fg';

/**
 * Filtros da Auditoria: busca, Aplicação, Quem, período, chips de categoria com contagem e o chip "Só <código>".
 * Os filtros são do pai (`filtro`); este componente só emite a mudança. A API só devolve as Aplicações em que a pessoa
 * tem papel, então um `select` basta (não é a lista inteira do cadastro).
 */
@Component({
  selector: 'est-auditoria-filtros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [
    provideIcons({ lucideLayers, lucideLayoutGrid, lucideListChecks, lucideRocket, lucideSearch, lucideShield, lucideShieldCheck, lucideUserCheck, lucideUsers, lucideX }),
  ],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <label class="flex h-9 min-w-0 flex-[1_1_16rem] items-center gap-2 rounded-lg border border-line-strong bg-surface-1 px-3 text-fg-muted shadow-edge focus-within:border-brand-hover focus-within:shadow-focus sm:max-w-[20rem]">
        <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
        <input
          type="search"
          data-testid="filtro-busca"
          aria-label="Buscar na auditoria"
          placeholder="Buscar por pessoa, código ou texto"
          class="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-dim"
          [value]="filtro().busca ?? ''"
          (input)="digitou($any($event.target).value)"
        />
      </label>
      <select data-testid="filtro-aplicacao" aria-label="Aplicação" [class]="select" (change)="filtrar.emit({ aplicacaoId: valor($event) || undefined })">
        <option value="" [selected]="!filtro().aplicacaoId">Todas as aplicações</option>
        @for (a of aplicacoes(); track a.id) {
          <option [value]="a.id" [selected]="a.id === filtro().aplicacaoId">{{ a.nome }}</option>
        }
      </select>
      <select data-testid="filtro-quem" aria-label="Quem" [class]="select" (change)="filtrar.emit({ quem: valor($event) || undefined })">
        <option value="" [selected]="!filtro().quem">Qualquer pessoa</option>
        @for (p of pessoas(); track p.id) {
          <option [value]="p.id" [selected]="p.id === filtro().quem">{{ p.nome }}</option>
        }
      </select>
      <select data-testid="filtro-periodo" aria-label="Período" [class]="select" (change)="mudouPeriodo(valor($event))">
        @for (o of periodos; track o.valor) {
          <option [value]="o.valor" [selected]="o.valor === periodoAtual()">{{ o.rotulo }}</option>
        }
      </select>
    </div>

    <div role="group" aria-label="Tipo de registro" class="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" data-testid="categoria" [class]="chip" [attr.aria-pressed]="!filtro().categoria" (click)="filtrar.emit({ categoria: undefined })">
        Todos <span class="font-mono font-normal text-fg-muted">{{ totalGeral() }}</span>
      </button>
      @for (c of categorias_; track c.chave) {
        <button type="button" data-testid="categoria" [class]="chip" [attr.aria-pressed]="filtro().categoria === c.chave" (click)="filtrar.emit({ categoria: c.chave })">
          <ng-icon [name]="c.icone" size="14" aria-hidden="true" />{{ c.rotulo }}
          <span class="font-mono font-normal text-fg-muted">{{ contagem(c.chave) }}</span>
        </button>
      }
    </div>

    @if (filtro().objeto; as objeto) {
      <span data-testid="chip-objeto" class="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-hover bg-brand-soft py-1 pr-1.5 pl-3 text-sm text-fg">
        Só <span class="font-mono text-xs">{{ objeto }}</span>
        <button
          type="button"
          data-testid="chip-objeto-limpar"
          class="grid size-6 place-items-center rounded-full bg-surface-3 text-fg-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
          [attr.aria-label]="'Tirar o filtro do objeto ' + objeto"
          (click)="limparObjeto.emit()"
        ><ng-icon name="lucideX" size="12" aria-hidden="true" /></button>
      </span>
    }
  `,
})
export class AuditoriaFiltrosComponent {
  readonly filtro = input.required<FiltroAuditoria>();
  readonly aplicacoes = input<AplicacaoDoRegistro[]>([]);
  readonly pessoas = input<PessoaDoFiltro[]>([]);
  readonly categorias = input<CategoriaContagem[]>([]);
  readonly filtrar = output<MudancaDeFiltro>();
  readonly limparObjeto = output<void>();

  protected readonly select = SELECT;
  protected readonly chip = CHIP;
  protected readonly categorias_ = CATEGORIAS;
  protected readonly periodos = [
    { valor: '7', rotulo: 'Últimos 7 dias' },
    { valor: '30', rotulo: 'Últimos 30 dias' },
    { valor: '90', rotulo: 'Últimos 90 dias' },
    { valor: 'tudo', rotulo: 'Tudo' },
  ];
  protected readonly periodoAtual = computed(() => (this.filtro().periodoDias === null ? 'tudo' : String(this.filtro().periodoDias ?? 30)));
  protected readonly totalGeral = computed(() => this.categorias().reduce((soma, c) => soma + c.total, 0));

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  protected contagem(chave: string): number {
    return this.categorias().find((c) => c.categoria === chave)?.total ?? 0;
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected mudouPeriodo(valor: string): void {
    this.filtrar.emit({ periodoDias: valor === 'tudo' ? null : (Number(valor) as 7 | 30 | 90) });
  }

  /** A busca espera a pessoa parar de digitar; uma consulta por pausa, não por tecla. */
  protected digitou(texto: string): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.filtrar.emit({ busca: texto }), ATRASO_DA_BUSCA_MS);
  }
}
