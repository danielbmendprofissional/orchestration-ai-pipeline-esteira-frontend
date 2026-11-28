import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHistory, lucideTriangleAlert } from '@ng-icons/lucide';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { EntregaTempoRealDevComponent } from '../components/tempo-real-dev.component';
import { EstadoPillComponent } from '../components/estado-pill.component';
import { EtapaPainelComponent } from '../components/etapa-painel.component';
import { FluxoFaixaComponent } from '../components/fluxo-faixa.component';
import { rotuloDaEntrega, rotuloDoTempoReal } from '../entregas.apresentacao';
import { AnalisesService } from '../analises.service';
import type { EstadoDasAnalises } from '../analises.tipos';
import { EntregasService } from '../entregas.service';

/** Tela da Entrega (E1b): estado no topo, uma faixa por Fluxo, painel da Etapa. Só leitura: as ações são da E3. */
@Component({
  selector: 'est-entrega-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, RouterLink, EstadoPillComponent, FluxoFaixaComponent, EtapaPainelComponent, EntregaTempoRealDevComponent],
  providers: [provideIcons({ lucideHistory, lucideTriangleAlert })],
  template: `
    <section data-testid="entrega-page">
      @if (entregas.erro() === 'nao-encontrada') {
        <div data-testid="nao-encontrada">
          <h1 class="text-3xl font-semibold tracking-tight text-fg">Entrega não encontrada ou sem acesso</h1>
          <p class="mt-2 text-fg-muted">O endereço não existe, mudou de lugar ou você não tem acesso a esta Aplicação.</p>
          <a routerLink="/" class="mt-4 inline-block text-brand-fg underline underline-offset-4 hover:text-fg">Voltar ao início</a>
        </div>
      } @else if (entregas.erro() === 'falha') {
        <div data-testid="erro" role="alert" class="rounded-xl border border-bad-line bg-bad-soft p-5">
          <h1 class="flex items-center gap-2 text-lg font-semibold text-bad-fg">
            <ng-icon name="lucideTriangleAlert" size="18" aria-hidden="true" />Não foi possível carregar a Entrega
          </h1>
          <p class="mt-1 text-sm text-fg-2">Tente de novo em instantes.</p>
          <button
            type="button"
            data-testid="tentar-de-novo"
            class="mt-3 inline-flex h-8 items-center rounded-md border border-line-strong bg-surface-2 px-3 text-2xs font-semibold text-fg shadow-edge hover:bg-surface-3 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none"
            (click)="entregas.tentarDeNovo()"
          >Tentar de novo</button>
        </div>
      } @else if (entregas.entrega(); as e) {
        <header data-testid="cabecalho" class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-fg">Entrega de {{ e.aplicacao.nome }}</h1>
            <p class="mt-1 text-sm text-fg-muted">
              Aberta por {{ e.abertaPor.nome }} em <time [attr.datetime]="e.abertaEm">{{ e.abertaEm | date: 'dd/MM/yyyy HH:mm' }}</time>
            </p>
          </div>
          <div class="flex flex-col items-start gap-2 md:items-end">
            <div class="flex flex-wrap items-center gap-2" data-testid="estado-da-entrega">
              <span class="sr-only">Estado da Entrega:</span>
              <est-estado-pill [rotulo]="rotulo()" />
              @if (e.vezDe; as vez) {
                <span data-testid="vez-de" class="text-2xs text-fg-muted">na vez de {{ vez }}</span>
              }
            </div>
            @if (rotuloTempoReal(); as rotulo) {
              <span data-testid="tempo-real" aria-live="polite" class="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
                <span aria-hidden="true" class="size-1.5 rounded-full" [class]="entregas.estadoTempoReal() === 'ao-vivo' ? 'bg-ok-fg' : 'bg-fg-dim'"></span>{{ rotulo }}
              </span>
            }
            @if (comAuditoria) {
              <a
                data-testid="ver-na-auditoria"
                [routerLink]="['/auditoria']"
                [queryParams]="{ objeto: e.id }"
                class="inline-flex items-center gap-1.5 text-2xs text-brand-fg underline underline-offset-4 hover:text-fg"
              >
                <ng-icon name="lucideHistory" size="14" aria-hidden="true" />ver na auditoria
              </a>
            }
          </div>
        </header>

        <div class="mt-6 flex flex-col gap-4">
          @for (f of e.fluxos; track f.id) {
            <article [attr.data-testid]="'fluxo-' + f.id" class="rounded-xl border border-line bg-surface-1 p-5 shadow-edge">
              <est-fluxo-faixa [fluxo]="f" [aberta]="abertaDe(f.id)" (abrir)="entregas.abrirEtapa(f.id, $event)" />
              @if (entregas.etapaAberta(); as aberta) {
                @if (abertaDe(f.id)) {
                  <est-etapa-painel
                    [etapa]="aberta"
                    [fluxo]="f"
                    [analises]="estadoDasAnalises()"
                    (fechar)="entregas.fecharEtapa()"
                    (abrirAchados)="analises.abrirAchados($event)"
                    (fecharAchados)="analises.fecharAchados()"
                    (filtrar)="analises.filtrarPorSeveridade($event)"
                    (irParaPagina)="analises.irParaPagina($event)"
                    (tentarDeNovo)="analises.tentarDeNovo()"
                    (tentarAchadosDeNovo)="analises.tentarAchadosDeNovo()"
                  />
                }
              }
            </article>
          }
        </div>
        <est-entrega-tempo-real-dev [entregaId]="e.id" />
      } @else if (entregas.carregando()) {
        <p data-testid="carregando" role="status" class="text-fg-muted">Carregando a Entrega…</p>
      }
    </section>
  `,
})
export class EntregaPage implements OnDestroy {
  protected readonly entregas = inject(EntregasService);
  private readonly rota = inject(ActivatedRoute);
  /** Só com `Features:X1` ligado a Auditoria existe: senão nada aparece. */
  protected readonly comAuditoria = inject(FeatureFlagsService).isEnabled('X1');

  protected readonly rotulo = computed(() => rotuloDaEntrega(this.entregas.entrega()?.estado ?? ''));
  protected readonly rotuloTempoReal = computed(() => rotuloDoTempoReal(this.entregas.estadoTempoReal()));

  protected readonly analises = inject(AnalisesService);

  /** Chave da Etapa que tem Análises em tela (Abertura não tem); string, então a recarga da Entrega não a reabre. */
  private readonly alvoDasAnalises = computed(() => {
    const e = this.entregas.entrega();
    const aberta = this.entregas.etapaAberta();
    const fluxo = e?.fluxos.find((f) => aberta && f.etapas.includes(aberta));
    return e && aberta && fluxo && aberta.etapa !== 'abertura' ? `${e.id}|${fluxo.id}|${aberta.etapa}` : null;
  });

  /** `null` com `Features:E2` desligada ou numa Etapa sem Análise: o painel não mostra abas. */
  protected readonly estadoDasAnalises = computed<EstadoDasAnalises | null>(() => {
    if (!this.analises.habilitado() || !this.alvoDasAnalises()) return null;
    return {
      gate: this.analises.gate(), doArtefato: this.analises.doArtefato(), doDeploy: this.analises.doDeploy(),
      carregando: this.analises.carregando(), erro: this.analises.erro(), vazio: this.analises.vazio(),
      analiseAberta: this.analises.analiseAberta(), severidade: this.analises.severidade(), achados: this.analises.achados(),
      achadosCarregando: this.analises.achadosCarregando(), achadosErro: this.analises.achadosErro(),
    };
  });

  constructor() {
    this.rota.paramMap.subscribe((p) => {
      const id = p.get('id');
      if (id) void this.entregas.acompanhar(id);
    });
    effect(() => {
      const alvo = this.alvoDasAnalises();
      untracked(() => {
        if (!alvo) return this.analises.fechar();
        const [entregaId, fluxoId, etapa] = alvo.split('|');
        void this.analises.abrir(entregaId, fluxoId, etapa);
      });
    });
  }

  ngOnDestroy(): void {
    this.entregas.parar();
    this.analises.fechar();
  }

  /** Etapa aberta deste Fluxo (a Etapa aberta é um objeto da Entrega atual, então a busca por referência acha o Fluxo dono). */
  protected abertaDe(fluxoId: string): string | null {
    const aberta = this.entregas.etapaAberta();
    const fluxo = this.entregas.entrega()?.fluxos.find((f) => f.id === fluxoId);
    return aberta && fluxo?.etapas.includes(aberta) ? aberta.etapa : null;
  }
}
