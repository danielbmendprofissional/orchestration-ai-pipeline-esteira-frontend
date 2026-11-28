import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBot, lucideExternalLink, lucideGitBranch, lucideLayers, lucideLayoutGrid, lucideListChecks, lucideRocket, lucideShield, lucideShieldCheck, lucideUserCheck, lucideUsers, lucideX } from '@ng-icons/lucide';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { categoriaDe, dataEHoraDe, iconeDaOrigem, rotuloDaOrigem } from '../auditoria.apresentacao';
import { destinoDoObjeto } from '../auditoria.service';
import type { RegistroDetalhe } from '../auditoria.tipos';

/**
 * Gaveta do registro (só leitura): Quando, Quem e origem, Aplicação, Objeto, Campo × Antes × Depois e Motivo. Foco preso e
 * `Esc` vêm do diálogo do spartan; a URL (`/auditoria/:id`) é do pai. Todo texto vem da API e entra por interpolação.
 */
@Component({
  selector: 'est-auditoria-gaveta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, RouterLink, HlmSheetImports, HlmButtonImports],
  providers: [
    provideIcons({ lucideBot, lucideExternalLink, lucideGitBranch, lucideLayers, lucideLayoutGrid, lucideListChecks, lucideRocket, lucideShield, lucideShieldCheck, lucideUserCheck, lucideUsers, lucideX }),
  ],
  template: `
    <hlm-sheet side="right" [state]="aberta() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal [showCloseButton]="false" class="w-full gap-0 border-line bg-surface-1 p-0 shadow-drawer sm:max-w-[36rem]">
        <div data-testid="gaveta" class="flex h-full min-h-0 flex-col">
          <header class="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
            <div class="flex min-w-0 flex-col gap-2">
              @if (detalhe(); as d) {
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-2.5 py-0.5 text-2xs font-semibold text-fg-2">
                    <ng-icon [name]="categoria().icone" size="14" aria-hidden="true" />{{ categoria().rotulo }}
                  </span>
                  @if (d.autoaprovacao) {
                    <span class="rounded-full border border-run-line bg-run-soft px-2 py-0.5 text-2xs font-semibold text-run-fg">autoaprovação</span>
                  }
                </div>
                <h2 hlmSheetTitle class="text-xl leading-snug font-semibold text-fg break-words">
                  {{ d.quem.nome }} {{ d.verbo }} <span class="font-mono text-lg">{{ d.objeto.codigo }}</span>
                </h2>
              } @else {
                <h2 hlmSheetTitle class="text-xl font-semibold text-fg">Registro</h2>
              }
              <p hlmSheetDescription class="sr-only">Quando, quem, o que mudou e o motivo deste registro da auditoria.</p>
            </div>
            <button hlmBtn type="button" variant="ghost" size="icon-sm" data-testid="gaveta-fechar" aria-label="Fechar" (click)="fechar.emit()">
              <ng-icon name="lucideX" size="16" aria-hidden="true" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            @if (carregando()) {
              <p role="status" class="text-sm text-fg-muted">Carregando o registro…</p>
            } @else if (naoEncontrado()) {
              <p data-testid="nao-encontrado" role="alert" class="rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg-2">
                Registro não encontrado ou sem acesso.
              </p>
            } @else if (falhou()) {
              <div role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-bad-line bg-bad-soft px-3.5 py-2.5 text-sm text-fg-2">
                <span>Não foi possível carregar este registro.</span>
                <button hlmBtn type="button" variant="outline" size="sm" data-testid="tentar-de-novo" (click)="tentarDeNovo.emit()">Tentar de novo</button>
              </div>
            } @else if (detalhe(); as d) {
              <dl class="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt class="text-fg-muted">Quando</dt>
                <dd class="text-fg"><time [attr.datetime]="d.quando">{{ quando() }}</time></dd>
                <dt class="text-fg-muted">Quem</dt>
                <dd class="flex flex-wrap items-center gap-1.5 text-fg">
                  @if (iconeOrigem(); as icone) {
                    <ng-icon [name]="icone" size="14" aria-hidden="true" />
                  }{{ d.quem.nome }}
                </dd>
                <dt class="text-fg-muted">Origem</dt>
                <dd class="text-fg">{{ origem() }}</dd>
                <dt class="text-fg-muted">Aplicação</dt>
                <dd class="text-fg">{{ d.aplicacao?.nome ?? '—' }}</dd>
                <dt class="text-fg-muted">Objeto</dt>
                <dd class="text-fg"><span class="font-mono text-xs">{{ d.objeto.codigo }}</span>@if (d.objeto.nome) { · {{ d.objeto.nome }} }</dd>
              </dl>

              <h3 class="mt-6 mb-2 text-2xs font-semibold text-fg-muted">O que mudou</h3>
              <div class="overflow-x-auto rounded-lg border border-line">
                <table class="w-full text-left text-sm">
                  <thead class="bg-surface-2 text-2xs text-fg-muted">
                    <tr><th scope="col" class="px-3 py-2 font-semibold">Campo</th><th scope="col" class="px-3 py-2 font-semibold">Antes</th><th scope="col" class="px-3 py-2 font-semibold">Depois</th></tr>
                  </thead>
                  <tbody class="divide-y divide-line">
                    @for (m of d.mudancas; track $index) {
                      <tr class="align-top">
                        <th scope="row" class="px-3 py-2 font-normal text-fg-2 break-words">{{ m.campo }}</th>
                        <td class="px-3 py-2 break-words" [class]="m.antes === '—' ? 'text-fg-dim' : 'text-fg-muted line-through'">{{ m.antes }}</td>
                        <td class="px-3 py-2 break-words text-fg">{{ m.depois }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (d.motivo) {
                <h3 class="mt-6 mb-2 text-2xs font-semibold text-fg-muted">Motivo</h3>
                <p class="border-l-2 border-line-strong py-0.5 pl-3.5 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">{{ d.motivo }}</p>
              }

              <div class="mt-8 flex flex-wrap justify-end gap-2">
                <button hlmBtn type="button" variant="outline" (click)="fechar.emit()">Fechar</button>
                @if (destino(); as rota) {
                  <a hlmBtn data-testid="abrir-objeto" [routerLink]="rota">
                    <ng-icon name="lucideExternalLink" size="16" aria-hidden="true" />Abrir {{ d.objeto.codigo }}
                  </a>
                }
              </div>
            }
          </div>
        </div>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class AuditoriaGavetaComponent {
  readonly aberta = input.required<boolean>();
  readonly detalhe = input<RegistroDetalhe | null>(null);
  readonly carregando = input(false);
  /** 404: inexistente ou fora do escopo (a API não distingue). */
  readonly naoEncontrado = input(false);
  readonly falhou = input(false);
  readonly fechar = output<void>();
  readonly tentarDeNovo = output<void>();

  protected readonly categoria = computed(() => categoriaDe(this.detalhe()?.categoria ?? ''));
  protected readonly quando = computed(() => dataEHoraDe(this.detalhe()?.quando ?? ''));
  protected readonly origem = computed(() => rotuloDaOrigem(this.detalhe()?.quem.origem ?? ''));
  protected readonly iconeOrigem = computed(() => iconeDaOrigem(this.detalhe()?.quem.origem ?? ''));
  protected readonly destino = computed(() => {
    const d = this.detalhe();
    return d ? destinoDoObjeto(d.objeto) : null;
  });

  /** Esc e clique no véu fecham pelo diálogo; o estado volta para o pai (URL). */
  protected aoMudarEstado(estado: BrnDialogState): void {
    if (estado === 'closed' && this.aberta()) this.fechar.emit();
  }
}
