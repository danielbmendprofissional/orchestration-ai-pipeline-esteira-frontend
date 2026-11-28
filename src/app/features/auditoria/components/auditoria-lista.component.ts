import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBot, lucideChevronRight, lucideCircleHelp, lucideClock, lucideGitBranch, lucideLayers, lucideLayoutGrid, lucideListChecks, lucideRocket, lucideShield,
  lucideShieldCheck, lucideUserCheck, lucideUsers,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import type { GrupoDoDia } from '../auditoria.service';
import { categoriaDe, horaDe, iconeDaOrigem } from '../auditoria.apresentacao';

/**
 * Linha do tempo da Auditoria, agrupada por dia (DESIGN.md, protótipo). Só `input()`/`output()`. Todo texto vem da API
 * e entra por interpolação. Cada linha é um botão: abre a gaveta do registro.
 */
@Component({
  selector: 'est-auditoria-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmButtonImports],
  providers: [
    provideIcons({
      lucideBot, lucideChevronRight, lucideCircleHelp, lucideClock, lucideGitBranch, lucideLayers, lucideLayoutGrid, lucideListChecks, lucideRocket, lucideShield,
      lucideShieldCheck, lucideUserCheck, lucideUsers,
    }),
  ],
  template: `
    <div class="overflow-hidden rounded-xl border border-line bg-surface-1 shadow-edge">
      @if (carregando() && !grupos().length) {
        <p role="status" class="px-5 py-8 text-center text-sm text-fg-muted">Carregando os registros…</p>
      } @else if (falhou()) {
        <div role="alert" class="m-4 flex flex-wrap items-center gap-3 rounded-lg border border-bad-line bg-bad-soft px-3.5 py-2.5 text-sm text-fg-2">
          <span>Não foi possível carregar os registros.</span>
          <button hlmBtn type="button" variant="outline" size="sm" data-testid="tentar-de-novo" (click)="tentarDeNovo.emit()">Tentar de novo</button>
        </div>
      } @else if (vazio()) {
        <div data-testid="vazio" class="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-fg-muted">
          <ng-icon name="lucideClock" size="28" aria-hidden="true" />
          <p class="font-semibold text-fg">{{ comFiltro() ? 'Nenhum registro com esses filtros' : 'Nenhum registro por aqui' }}</p>
          @if (avisoDeEscopo()) {
            <p>Você só vê as aplicações em que tem papel.</p>
          }
        </div>
      } @else {
        @for (g of grupos(); track g.dia) {
          <section [attr.aria-labelledby]="'dia-' + g.dia" [attr.aria-busy]="carregando()">
            <h3 data-testid="dia" [id]="'dia-' + g.dia" class="border-b border-line bg-surface-2 px-5 py-2 text-2xs font-semibold text-fg-muted">{{ g.rotulo }}</h3>
            <ul>
              @for (r of g.registros; track r.id) {
                <li class="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    data-testid="registro"
                    class="grid w-full grid-cols-[2.75rem_1.75rem_minmax(0,1fr)_1.25rem] items-center gap-x-3.5 gap-y-1 px-5 py-3 text-left text-sm hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-fg md:grid-cols-[2.75rem_1.75rem_minmax(0,1fr)_minmax(7rem,10rem)_1.25rem]"
                    (click)="abrir.emit(r.id)"
                  >
                    <time class="font-mono text-xs text-fg-muted" [attr.datetime]="r.quando">{{ hora(r.quando) }}</time>
                    <span class="grid size-7 place-items-center rounded-lg border border-line-strong bg-surface-3 text-fg-2" [attr.title]="categoria(r.categoria).rotulo">
                      <ng-icon [name]="categoria(r.categoria).icone" size="14" aria-hidden="true" />
                      <span class="sr-only">{{ categoria(r.categoria).rotulo }}:</span>
                    </span>
                    <span class="min-w-0">
                      <span class="block leading-snug">
                        <span class="inline-flex items-center gap-1 font-semibold text-fg">
                          @if (iconeOrigem(r.quem.origem); as icone) {
                            <ng-icon [name]="icone" size="14" aria-hidden="true" />
                          }{{ r.quem.nome }}
                        </span>
                        {{ r.verbo }}
                        <span class="font-mono text-xs text-fg">{{ r.objeto.codigo }}</span>
                        @if (r.autoaprovacao) {
                          <span class="ml-1 rounded-full border border-run-line bg-run-soft px-2 py-0.5 text-2xs font-semibold text-run-fg">autoaprovação</span>
                        }
                      </span>
                      <span class="block truncate text-xs text-fg-muted">{{ r.objeto.nome ?? r.objeto.codigo }} · {{ r.resumoMudancas }}</span>
                    </span>
                    <span class="col-start-3 truncate text-xs text-fg-muted md:col-start-auto">{{ r.aplicacao?.nome ?? '—' }}</span>
                    <ng-icon name="lucideChevronRight" size="16" class="hidden text-fg-dim md:block" aria-hidden="true" />
                  </button>
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>
  `,
})
export class AuditoriaListaComponent {
  readonly grupos = input.required<GrupoDoDia[]>();
  readonly carregando = input(false);
  readonly falhou = input(false);
  readonly vazio = input(false);
  /** Há filtro além do padrão: o vazio fala "com esses filtros". */
  readonly comFiltro = input(false);
  /** Quem não é MOR: o vazio lembra que só as Aplicações com papel aparecem. */
  readonly avisoDeEscopo = input(false);
  readonly abrir = output<string>();
  readonly tentarDeNovo = output<void>();

  protected readonly categoria = categoriaDe;
  protected readonly hora = horaDe;
  protected readonly iconeOrigem = iconeDaOrigem;
}
