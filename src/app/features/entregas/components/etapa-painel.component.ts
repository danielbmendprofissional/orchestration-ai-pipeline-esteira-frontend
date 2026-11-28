import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideFlag, lucideX } from '@ng-icons/lucide';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { SEVERIDADES, textoDoGate } from '../analises.apresentacao';
import type { DecisaoDaEtapa, EstadoDasAnalises, SeveridadeDoAchado } from '../analises.tipos';
import { falhaTraduzida, nomeDaEtapa, rotuloDaEtapa, urlSegura, type TomDoEstado } from '../entregas.apresentacao';
import type { EntregaEtapa, EntregaFluxo } from '../entregas.tipos';
import { AnalisesAbaComponent } from './analises-aba.component';
import { EstadoPillComponent } from './estado-pill.component';

const TEXTO_DO_TOM: Record<TomDoEstado, string> = { neutro: 'text-fg-2', azul: 'text-brand-fg', ambar: 'text-run-fg', verde: 'text-ok-fg', vermelho: 'text-bad-fg' };

/**
 * Painel da Etapa aberta: estado, link da pipeline, falha traduzida, quem pulou e por quê, Fatias do Fluxo e, com
 * `Features:E2` (input `analises` preenchido), as abas Visão geral (contadores e gate) e Análises.
 * Leitura apenas: Aprovar, Reprovar, Atalho e Exceção são de outras fatias. Todo texto entra por interpolação (escapado), nunca innerHTML.
 */
@Component({
  selector: 'est-etapa-painel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, NgTemplateOutlet, HlmTabsImports, EstadoPillComponent, AnalisesAbaComponent],
  providers: [provideIcons({ lucideExternalLink, lucideFlag, lucideX })],
  template: `
    <section class="mt-3 rounded-xl border border-line bg-surface-1 p-5 shadow-edge" [attr.aria-label]="'Etapa ' + nome()" data-testid="etapa-painel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h3 class="text-base font-semibold text-fg">{{ nome() }} · {{ fluxo().projeto.nome }}</h3>
          <est-estado-pill [rotulo]="rotulo()" />
        </div>
        <button
          type="button"
          aria-label="Fechar painel da Etapa"
          class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none"
          (click)="fechar.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </div>

      @if (analises(); as a) {
        <hlm-tabs class="mt-3" [tab]="aba()" (tabActivated)="aba.set($event)">
          <hlm-tabs-list variant="line" aria-label="Seções da Etapa">
            <button hlmTabsTrigger="geral">Visão geral</button>
            <button hlmTabsTrigger="analises">Análises</button>
          </hlm-tabs-list>
          <div hlmTabsContent="geral">
            @if (a.gate; as g) {
              <div class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                @for (s of severidades; track s.id) {
                  <div data-testid="contador" class="rounded-lg border border-line bg-surface-2 px-3 py-2 shadow-edge">
                    <span class="block text-2xs font-semibold uppercase tracking-wide" [class]="s.classe">{{ s.rotulo }}</span>
                    <span class="font-mono text-xl font-semibold text-fg">{{ g.contagem[s.id] }}</span>
                  </div>
                }
              </div>
            }
            <p data-testid="gate" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span class="text-fg-muted">Gate de segurança</span>
              @if (a.gate; as g) {
                <span class="font-semibold [overflow-wrap:anywhere]" [class]="classeDoGate(g)">{{ textoDoGate(g).texto }}</span>
                <time class="text-2xs text-fg-muted" [attr.datetime]="g.decididaEm">{{ g.decididaEm | date: 'dd/MM/yyyy HH:mm' }}</time>
              } @else {
                <span class="text-fg-muted">Sem decisão do gate ainda.</span>
              }
            </p>
            <ng-container [ngTemplateOutlet]="detalhes" />
          </div>
          <div hlmTabsContent="analises">
            <est-analises-aba
              [estado]="a"
              (abrirAchados)="abrirAchados.emit($event)"
              (fecharAchados)="fecharAchados.emit()"
              (filtrar)="filtrar.emit($event)"
              (irParaPagina)="irParaPagina.emit($event)"
              (tentarDeNovo)="tentarDeNovo.emit()"
              (tentarAchadosDeNovo)="tentarAchadosDeNovo.emit()"
            />
          </div>
        </hlm-tabs>
      } @else {
        <ng-container [ngTemplateOutlet]="detalhes" />
      }
    </section>

    <ng-template #detalhes>
      <dl class="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        @if (etapa().codigoFalha; as codigo) {
          <dt class="text-fg-muted">Falha</dt>
          <dd data-testid="falha" class="text-bad-fg">{{ falha(codigo) }}</dd>
        }
        @if (etapa().pulada; as pulada) {
          <dt class="text-fg-muted">Atalho</dt>
          <dd data-testid="pulada" class="text-fg-2">Pulada por {{ pulada.por ?? 'não informado' }} — {{ pulada.motivo ?? 'sem motivo informado' }}</dd>
        }
        @if (link(); as url) {
          <dt class="text-fg-muted">Pipeline</dt>
          <dd>
            <a
              data-testid="pipeline-link"
              [href]="url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-brand-fg underline underline-offset-4 hover:text-fg focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
            >
              Abrir no GitLab<ng-icon name="lucideExternalLink" size="14" aria-hidden="true" /><span class="sr-only"> (abre em nova aba)</span>
            </a>
          </dd>
        }
      </dl>

      <h4 class="mt-4 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Fatias do Fluxo</h4>
      @if (fluxo().fatias.length) {
        <ul class="mt-2 flex flex-wrap gap-2">
          @for (f of fluxo().fatias; track f.codigo) {
            <li data-testid="fatia" class="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-2xs text-fg-2">
              {{ f.codigo }}
              @if (f.comFlag) {
                <span class="inline-flex items-center gap-1 font-sans text-fg-muted"><ng-icon name="lucideFlag" size="12" aria-hidden="true" />com flag</span>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="mt-2 text-sm text-fg-muted">Sem Fatias neste Fluxo.</p>
      }
    </ng-template>
  `,
})
export class EtapaPainelComponent {
  readonly etapa = input.required<EntregaEtapa>();
  readonly fluxo = input.required<EntregaFluxo>();
  /** Estado das Análises; `null` com `Features:E2` desligada ou na Etapa sem Análise (sem abas). */
  readonly analises = input<EstadoDasAnalises | null>(null);
  readonly fechar = output<void>();
  readonly abrirAchados = output<string>();
  readonly fecharAchados = output<void>();
  readonly filtrar = output<SeveridadeDoAchado | undefined>();
  readonly irParaPagina = output<number>();
  readonly tentarDeNovo = output<void>();
  readonly tentarAchadosDeNovo = output<void>();

  protected readonly aba = signal('geral');
  protected readonly severidades = SEVERIDADES;
  protected readonly textoDoGate = textoDoGate;
  protected readonly nome = computed(() => nomeDaEtapa(this.etapa().etapa));
  protected readonly rotulo = computed(() => rotuloDaEtapa(this.etapa().estado));
  protected readonly link = computed(() => (urlSegura(this.etapa().pipelineUrl) ? this.etapa().pipelineUrl : null));
  protected falha = falhaTraduzida;
  protected classeDoGate = (g: DecisaoDaEtapa): string => TEXTO_DO_TOM[textoDoGate(g).tom];
}
