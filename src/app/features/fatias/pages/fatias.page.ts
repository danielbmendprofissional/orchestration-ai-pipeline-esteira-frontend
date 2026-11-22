import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideListChecks, lucideMonitor, lucideSearch, lucideServer, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AtualizarFatiasComponent } from '../components/atualizar-fatias.component';
import { FatiaGavetaComponent } from '../components/fatia-gaveta.component';
import { FatiasAvisosComponent } from '../components/fatias-avisos.component';
import { FatiasPaginacaoComponent } from '../components/fatias-paginacao.component';
import { FatiasTabelaComponent } from '../components/fatias-tabela.component';
import { FiltroAplicacoesComponent } from '../components/filtro-aplicacoes.component';
import { FatiasService } from '../fatias.service';
import type { Aba, FatiaDoPainel, ProjetoFiltro } from '../fatias.tipos';

const ABAS: { id: Aba; rotulo: string; vazio: string }[] = [
  { id: 'andamento', rotulo: 'Em andamento', vazio: 'Quando uma Fatia ganhar spec, entrar em execução ou em revisão, ela aparece aqui.' },
  { id: 'prontas', rotulo: 'Prontas para Entrega', vazio: 'Quando uma Fatia for mergeada, ela espera aqui pela Entrega.' },
  { id: 'todas', rotulo: 'Todas', vazio: 'Nenhuma Fatia foi lida do GitLab ainda.' },
];
const PROJETOS: { id: ProjetoFiltro; rotulo: string; icone: string }[] = [
  { id: 'api', rotulo: 'API', icone: 'lucideServer' },
  { id: 'frontend', rotulo: 'Front', icone: 'lucideMonitor' },
];
const MAXIMO_RECENTES = 5;

/**
 * Painel de Fatias (smart): só leitura. Fala só com o `FatiasService`; os componentes de `components/` são
 * burros. Nenhuma ação além de Atualizar e abrir/fechar a gaveta (Abrir Entrega, review e decisão são de outras fatias).
 */
@Component({
  selector: 'est-fatias-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    HlmButtonImports,
    AtualizarFatiasComponent,
    FatiaGavetaComponent,
    FatiasAvisosComponent,
    FatiasPaginacaoComponent,
    FatiasTabelaComponent,
    FiltroAplicacoesComponent,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideListChecks, lucideMonitor, lucideSearch, lucideServer, lucideX })],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight text-fg md:text-3xl">Painel de Fatias</h1>

    <div class="mt-4">
      <est-fatias-avisos [avisos]="dominio.avisos()" />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2" role="search" aria-label="Filtros do Painel">
      <est-filtro-aplicacoes
        [aplicacoes]="dominio.aplicacoes()"
        [selecionadas]="dominio.filtro().aplicacoes ?? []"
        [recentes]="recentes()"
        (mudou)="escolherAplicacoes($event)"
      />
      <label class="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-line-strong bg-surface-1 px-3 text-fg-muted focus-within:border-brand-hover focus-within:shadow-focus">
        <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
        <input
          type="search"
          class="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-dim"
          aria-label="Buscar Fatia"
          placeholder="Buscar Fatia"
          [value]="dominio.filtro().fatia ?? ''"
          (change)="dominio.filtrar({ fatia: $any($event.target).value })"
        />
      </label>
      @for (p of projetos; track p.id) {
        <button
          hlmBtn
          type="button"
          size="sm"
          [variant]="dominio.filtro().projeto === p.id ? 'default' : 'outline'"
          [attr.aria-pressed]="dominio.filtro().projeto === p.id"
          (click)="alternarProjeto(p.id)"
        >
          <ng-icon [name]="p.icone" size="14" aria-hidden="true" />{{ p.rotulo }}
        </button>
      }
      @if (dominio.comFiltro()) {
        <button hlmBtn type="button" size="sm" variant="ghost" (click)="limparFiltros()">
          <ng-icon name="lucideX" size="14" aria-hidden="true" />Limpar filtros
        </button>
      }
    </div>

    <section class="mt-4 rounded-xl border border-line bg-surface-1 shadow-edge" aria-label="Fatias">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 pt-2">
        <div role="tablist" aria-label="Estado das Fatias" class="flex flex-wrap gap-5">
          @for (a of abas; track a.id) {
            <button
              type="button"
              role="tab"
              class="-mb-px border-b-2 py-2.5 text-sm font-medium focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
              [class]="dominio.aba() === a.id ? 'border-brand-hover text-fg' : 'border-transparent text-fg-muted hover:text-fg'"
              [id]="'aba-' + a.id"
              [attr.aria-selected]="dominio.aba() === a.id"
              aria-controls="painel-fatias"
              [attr.tabindex]="dominio.aba() === a.id ? 0 : -1"
              (click)="dominio.selecionarAba(a.id)"
              (keydown.arrowright)="moverAba(1, $event)"
              (keydown.arrowleft)="moverAba(-1, $event)"
            >{{ a.rotulo }}</button>
          }
        </div>
        <est-atualizar-fatias
          class="pb-2"
          [geradoEm]="dominio.geradoEm()"
          [desatualizado]="dominio.desatualizado()"
          [atualizando]="dominio.atualizando()"
          [recente]="dominio.atualizacaoRecente()"
          (atualizar)="dominio.atualizar()"
        />
      </div>

      <div id="painel-fatias" role="tabpanel" [attr.aria-labelledby]="'aba-' + dominio.aba()" [attr.aria-busy]="dominio.carregando()">
        @if (dominio.falhouAoCarregar()) {
          <div data-testid="fatias-erro" role="alert" class="m-5 flex flex-wrap items-center gap-3 rounded-lg border border-bad-line bg-bad-soft px-3.5 py-2.5 text-sm text-fg-2">
            <ng-icon name="lucideCircleAlert" size="16" class="text-bad-fg" aria-hidden="true" />
            <span>Não foi possível carregar as Fatias.</span>
            <button hlmBtn type="button" variant="outline" size="sm" (click)="dominio.carregar()">Tentar de novo</button>
          </div>
        }
        @if (dominio.carregando()) {
          <p data-testid="fatias-carregando" role="status" class="px-5 py-3 text-sm text-fg-muted">Carregando as Fatias…</p>
        }

        @if (dominio.itens().length) {
          <div [class.opacity-60]="dominio.carregando()">
            <est-fatias-tabela [itens]="dominio.itens()" [mostrarAplicacao]="mostrarAplicacao()" (abrir)="abrirGaveta($event)" />
          </div>
        } @else if (!dominio.carregando() && !dominio.falhouAoCarregar() && dominio.resposta()) {
          <div data-testid="fatias-vazio" class="flex flex-col items-center gap-2 px-5 py-12 text-center text-fg-muted">
            <span class="grid size-11 place-items-center rounded-xl border border-line-strong bg-surface-2 text-fg-2"><ng-icon name="lucideListChecks" size="22" aria-hidden="true" /></span>
            <strong class="text-fg">Nenhuma Fatia aqui</strong>
            <span>{{ dominio.comFiltro() ? 'Nenhuma Fatia com esses filtros nesta aba.' : textoVazio() }}</span>
          </div>
        }
      </div>
    </section>

    <div class="mt-3">
      <est-fatias-paginacao
        [pagina]="dominio.pagina()"
        [totalPaginas]="dominio.totalPaginas()"
        [total]="dominio.total()"
        [tamanho]="dominio.tamanhoDaPagina()"
        (irPara)="dominio.irParaPagina($event)"
        (mudarTamanho)="dominio.mudarTamanho($event)"
      />
    </div>

    <p class="mt-4 text-2xs text-fg-muted">O estado das Fatias é lido do GitLab (mapa, spec, issues e MRs); ninguém o marca à mão.</p>

    <est-fatia-gaveta
      [aberta]="selecionada() !== null"
      [fatia]="selecionada()"
      [gaveta]="dominio.gaveta()"
      [carregando]="dominio.carregandoGaveta()"
      [falhou]="dominio.falhouGaveta()"
      (fechar)="fecharGaveta()"
      (tentarDeNovo)="abrirGaveta(selecionada()!)"
    />
  `,
})
export class FatiasPage implements OnInit {
  protected readonly dominio = inject(FatiasService);
  protected readonly abas = ABAS;
  protected readonly projetos = PROJETOS;
  /** Aplicações escolhidas há pouco, só nesta sessão da página (nada no navegador). */
  protected readonly recentes = signal<string[]>([]);
  protected readonly selecionada = signal<FatiaDoPainel | null>(null);
  /** Com uma Aplicação só filtrada a coluna Aplicação sobra. */
  protected readonly mostrarAplicacao = computed(() => this.dominio.filtro().aplicacoes?.length !== 1);
  protected readonly textoVazio = computed(() => ABAS.find((a) => a.id === this.dominio.aba())?.vazio ?? '');

  ngOnInit(): void {
    void this.dominio.carregar();
  }

  protected escolherAplicacoes(ids: string[]): void {
    this.recentes.update((atuais) => [...new Set([...ids.filter((id) => !atuais.includes(id)), ...atuais])].slice(0, MAXIMO_RECENTES));
    void this.dominio.filtrar({ aplicacoes: ids });
  }

  protected alternarProjeto(projeto: ProjetoFiltro): void {
    void this.dominio.filtrar({ projeto: this.dominio.filtro().projeto === projeto ? undefined : projeto });
  }

  protected limparFiltros(): void {
    void this.dominio.filtrar({ fatia: undefined, projeto: undefined, aplicacoes: undefined });
  }

  protected moverAba(passo: number, evento: Event): void {
    evento.preventDefault();
    const indice = ABAS.findIndex((a) => a.id === this.dominio.aba());
    const destino = ABAS[(indice + passo + ABAS.length) % ABAS.length];
    void this.dominio.selecionarAba(destino.id);
    document.getElementById('aba-' + destino.id)?.focus();
  }

  protected abrirGaveta(fatia: FatiaDoPainel): void {
    this.selecionada.set(fatia);
    void this.dominio.abrirGaveta(fatia.aplicacaoId, fatia.codigo);
  }

  protected fecharGaveta(): void {
    this.selecionada.set(null);
    this.dominio.fecharGaveta();
  }
}
