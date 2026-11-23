import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucideCircleDashed,
  lucideCircleHelp,
  lucideCircleSlash,
  lucideCircleX,
  lucideClock,
  lucideExternalLink,
  lucideFileText,
  lucideGitBranch,
  lucideGitPullRequest,
  lucideListChecks,
  lucideLoaderCircle,
  lucideX,
} from '@ng-icons/lucide';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { linkSeguro, rotuloDoPipeline, rotuloDoProjeto } from '../fatias.apresentacao';
import type { FatiaDoPainel, Gaveta } from '../fatias.tipos';
import { EstadoBadgeComponent } from './estado-badge.component';

const ESTADO_DE_ISSUE_OU_MR: Record<string, string> = { opened: 'aberta', closed: 'fechada', merged: 'mergeada', locked: 'bloqueada' };

const LINK = 'inline-flex items-center gap-1 rounded-sm text-brand-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg';

/**
 * Gaveta lateral do Painel (só leitura): links do GitLab, MRs com o pipeline e tasks. Foco preso e Esc vêm do diálogo
 * do spartan. Todo texto vem do GitLab e entra por interpolação; `href` só passa por `linkSeguro` (http/https).
 */
@Component({
  selector: 'est-fatia-gaveta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, NgIcon, HlmSheetImports, HlmButtonImports, EstadoBadgeComponent],
  providers: [
    provideIcons({
      lucideCircleCheck, lucideCircleDashed, lucideCircleHelp, lucideCircleSlash, lucideCircleX, lucideClock, lucideExternalLink, lucideFileText,
      lucideGitBranch, lucideGitPullRequest, lucideListChecks, lucideLoaderCircle, lucideX,
    }),
  ],
  template: `
    <hlm-sheet side="right" [state]="aberta() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal [showCloseButton]="false" class="w-full gap-0 border-line bg-surface-1 p-0 shadow-drawer sm:max-w-[34rem]">
        <div data-testid="gaveta" class="flex h-full min-h-0 flex-col">
          <header class="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
            <div class="flex min-w-0 flex-col gap-2">
              @if (fatia(); as f) {
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs text-fg-2">{{ f.codigo }}</span>
                  <est-estado-badge [estado]="f.estado" [emCorrecao]="f.emCorrecao" />
                  @if (f.formatoAnterior) {
                    <span class="rounded-sm border border-line-strong px-1.5 text-2xs text-fg-muted">formato anterior ao padrão</span>
                  }
                </div>
                <h2 hlmSheetTitle class="text-xl leading-snug font-semibold text-fg break-words">{{ f.titulo }}</h2>
              } @else {
                <h2 hlmSheetTitle class="text-xl font-semibold text-fg">Fatia</h2>
              }
              <p hlmSheetDescription class="sr-only">Links do GitLab, merge requests e tasks desta Fatia.</p>
            </div>
            <button hlmBtn type="button" variant="ghost" size="icon-sm" data-testid="gaveta-fechar" aria-label="Fechar" (click)="fechar.emit()">
              <ng-icon name="lucideX" size="16" aria-hidden="true" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            @if (fatia(); as f) {
              <dl class="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt class="text-fg-muted">Aplicação</dt>
                <dd class="text-fg">{{ f.aplicacao }}</dd>
                <dt class="text-fg-muted">Projeto</dt>
                <dd class="text-fg">{{ projetos(f) }}</dd>
                <dt class="text-fg-muted">Risco</dt>
                <dd class="text-fg">{{ gaveta()?.spec?.risco ?? f.risco ?? '—' }}</dd>
                @if (f.progresso) {
                  <dt class="text-fg-muted">Progresso</dt>
                  <dd class="text-fg">{{ f.progresso }}</dd>
                }
              </dl>
            }

            @if (carregando()) {
              <p data-testid="gaveta-carregando" role="status" class="mt-6 text-sm text-fg-muted">Carregando os links do GitLab…</p>
            } @else if (falhou()) {
              <div role="alert" class="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-bad-line bg-bad-soft px-3.5 py-2.5 text-sm text-fg-2">
                <span>Não foi possível carregar os detalhes desta Fatia.</span>
                <button hlmBtn type="button" variant="outline" size="sm" (click)="tentarDeNovo.emit()">Tentar de novo</button>
              </div>
            } @else if (gaveta(); as g) {
              <h3 class="mt-6 mb-2 flex items-center gap-2 text-2xs font-semibold text-fg-muted"><ng-icon name="lucideFileText" size="14" aria-hidden="true" />Spec e issues</h3>
              <ul class="flex flex-col gap-1.5 text-sm">
                <li>
                  <span class="text-fg-muted">Spec · </span>
                  @if (g.spec.disponivel && g.spec.caminho) {
                    <ng-container *ngTemplateOutlet="externo; context: { href: g.spec.link, texto: g.spec.caminho, mono: true }" />
                  } @else {
                    <span class="text-fg-dim">Spec ainda não disponível</span>
                  }
                </li>
                <li>
                  <span class="text-fg-muted">Issue-mãe · </span>
                  @if (g.mae; as m) {
                    <ng-container *ngTemplateOutlet="externo; context: { href: m.link, texto: '#' + m.numero + (m.titulo ? ' ' + m.titulo : '') }" />
                    @if (m.estado) {
                      <span class="text-fg-muted"> · {{ estadoDe(m.estado) }}</span>
                    }
                  } @else {
                    <span class="text-fg-dim">Sem issue-mãe</span>
                  }
                </li>
                @for (filha of g.filhas; track filha.numero) {
                  <li class="pl-4">
                    <span class="text-fg-muted">Filha · </span>
                    <ng-container *ngTemplateOutlet="externo; context: { href: filha.link, texto: '#' + filha.numero + (filha.titulo ? ' ' + filha.titulo : '') }" />
                    @if (filha.estado) {
                      <span class="text-fg-muted"> · {{ estadoDe(filha.estado) }}</span>
                    }
                  </li>
                }
              </ul>

              @if (g.repositorios.length) {
                <h3 class="mt-6 mb-2 flex items-center gap-2 text-2xs font-semibold text-fg-muted"><ng-icon name="lucideGitBranch" size="14" aria-hidden="true" />Branch e merge requests</h3>
                <ul class="flex flex-col gap-3">
                  @for (r of g.repositorios; track r.repositorio) {
                    <li class="rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm" data-testid="gaveta-repositorio">
                      <p class="font-semibold text-fg">{{ rotuloProjeto(r.repositorio) }}</p>
                      @if (r.branch) {
                        <p class="mt-1">
                          <span class="text-fg-muted">Branch · </span>
                          <ng-container *ngTemplateOutlet="externo; context: { href: r.linkBranch, texto: r.branch, mono: true }" />
                        </p>
                      }
                      @for (mr of r.mrs; track mr.iid) {
                        <div class="mt-2">
                          <ng-container *ngTemplateOutlet="externo; context: { href: mr.link, texto: '!' + mr.iid + ' ' + mr.titulo }" />
                          <p class="mt-0.5 flex flex-wrap items-center gap-x-3 text-fg-muted">
                            <span>{{ estadoDe(mr.estado) }}</span>
                            <span class="inline-flex items-center gap-1 text-fg-2">
                              <ng-icon [name]="pipeline(mr.statusPipeline).icone" size="14" aria-hidden="true" />{{ pipeline(mr.statusPipeline).texto }}
                            </span>
                          </p>
                        </div>
                      }
                      @if (!r.mrs.length) {
                        <p class="mt-1 text-fg-dim">Sem merge request</p>
                      }
                    </li>
                  }
                </ul>
              }

              @if (g.tasks.length) {
                <h3 class="mt-6 mb-2 flex items-center gap-2 text-2xs font-semibold text-fg-muted"><ng-icon name="lucideListChecks" size="14" aria-hidden="true" />Tasks</h3>
                <ul class="flex flex-col divide-y divide-line rounded-lg border border-line text-sm">
                  @for (t of g.tasks; track t.codigo) {
                    <li data-testid="gaveta-task" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
                      <span class="inline-flex items-center gap-1.5" [class]="t.feita ? 'text-fg-2' : t.emAndamento ? 'text-brand-fg' : 'text-fg-muted'">
                        <ng-icon [name]="t.feita ? 'lucideCircleCheck' : t.emAndamento ? 'lucideLoaderCircle' : 'lucideCircleDashed'" size="16" aria-hidden="true" />
                        {{ t.feita ? 'feita' : t.emAndamento ? 'em andamento' : 'pendente' }}
                      </span>
                      <span class="font-mono text-xs text-fg-2">{{ t.codigo }}</span>
                      @if (t.reviewPass) {
                        <span class="rounded-sm border border-line-strong px-1.5 text-2xs text-fg-muted">review PASS</span>
                      }
                      <span class="ml-auto flex items-center gap-3">
                        @if (t.sha || t.linkCommit) {
                          <ng-container *ngTemplateOutlet="externo; context: { href: t.linkCommit, texto: t.sha ?? 'branch', mono: true }" />
                        }
                      </span>
                    </li>
                  }
                </ul>
              }
            }
          </div>
        </div>
      </hlm-sheet-content>
    </hlm-sheet>

    <ng-template #externo let-href="href" let-texto="texto" let-mono="mono">
      @if (seguro(href); as destino) {
        <a [href]="destino" target="_blank" rel="noopener noreferrer" [class]="mono ? link + ' font-mono text-xs' : link">
          {{ texto }}<ng-icon name="lucideExternalLink" size="12" aria-hidden="true" /><span class="sr-only"> (abre em outra aba)</span>
        </a>
      } @else {
        <span [class]="mono ? 'font-mono text-xs text-fg-2' : 'text-fg-2'">{{ texto }}</span>
      }
    </ng-template>
  `,
})
export class FatiaGavetaComponent {
  readonly aberta = input.required<boolean>();
  /** A linha clicada: o cabeçalho aparece antes de o detalhe chegar. */
  readonly fatia = input<FatiaDoPainel | null>(null);
  readonly gaveta = input<Gaveta | null>(null);
  readonly carregando = input(false);
  readonly falhou = input(false);
  readonly fechar = output<void>();
  readonly tentarDeNovo = output<void>();

  protected readonly link = LINK;
  protected readonly seguro = linkSeguro;
  protected readonly pipeline = rotuloDoPipeline;
  protected readonly rotuloProjeto = rotuloDoProjeto;

  protected projetos(f: FatiaDoPainel): string {
    return f.repositorios.map(rotuloDoProjeto).join(' e ') || '—';
  }

  protected estadoDe(estado: string): string {
    return ESTADO_DE_ISSUE_OU_MR[estado] ?? estado;
  }

  /** Esc e clique no véu fecham pelo diálogo; o estado volta para o pai. */
  protected aoMudarEstado(estado: BrnDialogState): void {
    if (estado === 'closed' && this.aberta()) this.fechar.emit();
  }
}
