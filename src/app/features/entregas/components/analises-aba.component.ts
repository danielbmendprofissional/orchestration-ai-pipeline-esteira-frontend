import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronRight, lucideTriangleAlert } from '@ng-icons/lucide';
import { SEVERIDADES, classeDaSeveridade, custoEmDolar, resumoDaContagem, rotuloDaSeveridade, rotuloDoVeredito } from '../analises.apresentacao';
import type { AnaliseDaEtapa, EstadoDasAnalises, SeveridadeDoAchado } from '../analises.tipos';
import { CLASSES_DO_TOM } from '../entregas.apresentacao';

const BOTAO = 'inline-flex h-8 items-center rounded-md border border-line-strong bg-surface-2 px-3 text-2xs font-semibold text-fg shadow-edge hover:bg-surface-3 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Aba Análises do painel da Etapa (E2): "Do Artefato" e "Do Deploy" (por Destino), e a lista paginada de Achados de uma
 * Análise. Burro: só `input()`/`output()`. Título, descrição, regra e arquivo de Achado são texto de terceiro e entram
 * só por interpolação (nunca innerHTML), com quebra de cadeia longa.
 */
@Component({
  selector: 'est-analises-aba',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, NgTemplateOutlet],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronRight, lucideTriangleAlert })],
  template: `
    @let e = estado();
    @if (e.erro) {
      <div data-testid="erro" role="alert" class="mt-4 rounded-lg border border-bad-line bg-bad-soft p-4">
        <p class="flex items-center gap-2 text-sm font-semibold text-bad-fg"><ng-icon name="lucideTriangleAlert" size="16" aria-hidden="true" />Não foi possível carregar as Análises</p>
        <button type="button" data-testid="tentar-de-novo" class="mt-3" [class]="botao" (click)="tentarDeNovo.emit()">Tentar de novo</button>
      </div>
    } @else if (e.carregando) {
      <p data-testid="carregando" role="status" class="mt-4 text-sm text-fg-muted">Carregando as Análises…</p>
    } @else if (e.vazio) {
      <p data-testid="vazio" class="mt-4 text-sm text-fg-muted">Nenhuma Análise recebida ainda.</p>
    } @else if (e.analiseAberta) {
      <div class="mt-4">
        <button type="button" data-testid="voltar-analises" class="inline-flex items-center gap-1.5 text-2xs text-brand-fg underline underline-offset-4 hover:text-fg focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg" (click)="fecharAchados.emit()">
          <ng-icon name="lucideArrowLeft" size="14" aria-hidden="true" />Voltar às Análises
        </button>

        <div data-testid="filtro-severidade" role="group" aria-label="Filtrar Achados por severidade" class="mt-3 flex flex-wrap gap-2">
          <button type="button" [attr.aria-pressed]="!e.severidade" [class]="chip(!e.severidade)" (click)="filtrar.emit(undefined)">Todas</button>
          @for (s of severidades; track s.id) {
            <button type="button" [attr.aria-pressed]="e.severidade === s.id" [class]="chip(e.severidade === s.id)" (click)="filtrar.emit(s.id)">{{ s.rotulo }}</button>
          }
        </div>

        @if (e.achadosErro) {
          <div data-testid="achados-erro" role="alert" class="mt-3 rounded-lg border border-bad-line bg-bad-soft p-4">
            <p class="flex items-center gap-2 text-sm font-semibold text-bad-fg"><ng-icon name="lucideTriangleAlert" size="16" aria-hidden="true" />Não foi possível carregar os Achados</p>
            <button type="button" data-testid="achados-tentar-de-novo" class="mt-3" [class]="botao" (click)="tentarAchadosDeNovo.emit()">Tentar de novo</button>
          </div>
        } @else if (e.achadosCarregando && !e.achados) {
          <p data-testid="achados-carregando" role="status" class="mt-3 text-sm text-fg-muted">Carregando os Achados…</p>
        } @else if (e.achados; as p) {
          @if (p.itens.length === 0) {
            <p data-testid="achados-vazio" class="mt-3 text-sm text-fg-muted">Nenhum Achado{{ e.severidade ? ' com essa severidade' : ' nesta Análise' }}.</p>
          } @else {
            <ul class="mt-3 flex flex-col divide-y divide-line rounded-lg border border-line" [attr.aria-busy]="e.achadosCarregando">
              @for (a of p.itens; track $index) {
                <li data-testid="achado" class="min-w-0 p-3">
                  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span class="text-2xs font-semibold uppercase tracking-wide" [class]="cor(a.severidade)">{{ rotulo(a.severidade) }}</span>
                    <span class="min-w-0 break-words text-sm font-medium text-fg [overflow-wrap:anywhere]">{{ a.titulo }}</span>
                  </div>
                  @if (a.regraId || a.arquivo) {
                    <p class="mt-1 flex flex-wrap gap-x-3 font-mono text-2xs text-fg-muted [overflow-wrap:anywhere]">
                      @if (a.regraId) { <span>{{ a.regraId }}</span> }
                      @if (a.arquivo) { <span>{{ a.arquivo }}{{ a.linha ? ':' + a.linha : '' }}</span> }
                    </p>
                  }
                  @if (a.descricao) {
                    <p class="mt-1 line-clamp-4 text-sm text-fg-2 [overflow-wrap:anywhere]">{{ a.descricao }}</p>
                  }
                </li>
              }
            </ul>
            <nav class="mt-3 flex items-center justify-between gap-3" aria-label="Paginação dos Achados">
              <button type="button" data-testid="pagina-anterior" [class]="botao" [disabled]="p.pagina <= 1" (click)="irParaPagina.emit(p.pagina - 1)">Anterior</button>
              <span data-testid="pagina" class="text-2xs text-fg-muted" aria-live="polite">Página {{ p.pagina }} de {{ p.totalPaginas }} · {{ p.total }} Achados</span>
              <button type="button" data-testid="pagina-proxima" [class]="botao" [disabled]="p.pagina >= p.totalPaginas" (click)="irParaPagina.emit(p.pagina + 1)">Próxima</button>
            </nav>
          }
        }
      </div>
    } @else {
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <section data-testid="coluna-artefato" aria-labelledby="col-artefato">
          <h4 id="col-artefato" class="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Do Artefato</h4>
          @if (e.doArtefato.length) {
            <ul class="mt-2 flex flex-col gap-2">
              @for (a of e.doArtefato; track a.id) {
                <ng-container [ngTemplateOutlet]="linha" [ngTemplateOutletContext]="{ $implicit: a }" />
              }
            </ul>
          } @else {
            <p class="mt-2 text-sm text-fg-muted">Sem Análises do Artefato.</p>
          }
        </section>
        <section data-testid="coluna-deploy" aria-labelledby="col-deploy">
          <h4 id="col-deploy" class="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Do Deploy</h4>
          @for (d of e.doDeploy; track d.destino) {
            <h5 class="mt-2 font-mono text-2xs text-fg-2">{{ d.destino || 'Sem Destino' }}</h5>
            <ul class="mt-1 flex flex-col gap-2">
              @for (a of d.analises; track a.id) {
                <ng-container [ngTemplateOutlet]="linha" [ngTemplateOutletContext]="{ $implicit: a }" />
              }
            </ul>
          } @empty {
            <p class="mt-2 text-sm text-fg-muted">Sem Análises do Deploy.</p>
          }
        </section>
      </div>
    }

    <ng-template #linha let-a>
      <li data-testid="analise">
        <button
          type="button"
          class="flex w-full min-w-0 items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-left shadow-edge hover:bg-surface-3 focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none"
          (click)="abrirAchados.emit(a.id)"
        >
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="break-words font-mono text-sm text-fg [overflow-wrap:anywhere]">{{ a.fonte }}</span>
            <span class="text-2xs text-fg-muted">
              {{ resumo(a) }}@if (a.tipo === 'agente' && a.custoUsd !== null) { · custo {{ custo(a.custoUsd) }} }
            </span>
          </span>
          <span class="inline-flex shrink-0 rounded-full border px-2 py-0.5 text-2xs font-semibold" [class]="veredito(a).classe">{{ veredito(a).texto }}</span>
          <ng-icon name="lucideChevronRight" size="14" class="shrink-0 text-fg-muted" aria-hidden="true" />
        </button>
      </li>
    </ng-template>
  `,
})
export class AnalisesAbaComponent {
  readonly estado = input.required<EstadoDasAnalises>();
  readonly abrirAchados = output<string>();
  readonly fecharAchados = output<void>();
  readonly filtrar = output<SeveridadeDoAchado | undefined>();
  readonly irParaPagina = output<number>();
  readonly tentarDeNovo = output<void>();
  readonly tentarAchadosDeNovo = output<void>();

  protected readonly severidades = SEVERIDADES;
  protected readonly botao = BOTAO;
  protected readonly cor = classeDaSeveridade;
  protected readonly rotulo = rotuloDaSeveridade;
  protected readonly custo = custoEmDolar;
  protected resumo = (a: AnaliseDaEtapa): string => resumoDaContagem(a.contagem);
  protected veredito = (a: AnaliseDaEtapa): { texto: string; classe: string } => {
    const v = rotuloDoVeredito(a.veredito);
    return { texto: v.texto, classe: CLASSES_DO_TOM[v.tom] };
  };
  protected chip = (ativo: boolean): string =>
    'inline-flex h-7 items-center rounded-full border px-3 text-2xs font-semibold focus-visible:border-brand-hover focus-visible:shadow-focus focus-visible:outline-none ' +
    (ativo ? 'border-brand/40 bg-brand-soft text-brand-fg' : 'border-line-strong bg-surface-2 text-fg-2 hover:bg-surface-3');
}
