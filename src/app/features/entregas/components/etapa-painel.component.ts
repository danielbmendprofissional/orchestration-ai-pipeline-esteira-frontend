import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideFlag, lucideX } from '@ng-icons/lucide';
import { falhaTraduzida, nomeDaEtapa, rotuloDaEtapa, urlSegura } from '../entregas.apresentacao';
import type { EntregaEtapa, EntregaFluxo } from '../entregas.tipos';
import { EstadoPillComponent } from './estado-pill.component';

/**
 * Painel da Etapa aberta: estado, link da pipeline, falha traduzida, quem pulou e por quê, Fatias do Fluxo.
 * Leitura apenas: Aprovar, Reprovar e Atalho são da E3. Todo texto entra por interpolação (escapado), nunca innerHTML.
 */
@Component({
  selector: 'est-etapa-painel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, EstadoPillComponent],
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
    </section>
  `,
})
export class EtapaPainelComponent {
  readonly etapa = input.required<EntregaEtapa>();
  readonly fluxo = input.required<EntregaFluxo>();
  readonly fechar = output<void>();

  protected readonly nome = computed(() => nomeDaEtapa(this.etapa().etapa));
  protected readonly rotulo = computed(() => rotuloDaEtapa(this.etapa().estado));
  protected readonly link = computed(() => (urlSegura(this.etapa().pipelineUrl) ? this.etapa().pipelineUrl : null));
  protected falha = falhaTraduzida;
}
