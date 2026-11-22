import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { AplicacaoGavetaComponent } from '../components/aplicacao-gaveta.component';
import { AplicacoesService, type Situacao } from '../aplicacoes.service';
import type { ColunaOrdenavel } from '../aplicacoes.tipos';

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'ativas', rotulo: 'Ativas' },
  { valor: 'inativas', rotulo: 'Inativas' },
  { valor: 'todas', rotulo: 'Todas' },
];

@Component({
  selector: 'est-aplicacoes-lista-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmTableImports, AplicacaoGavetaComponent],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-semibold tracking-tight text-fg">Aplicações</h1>
      @if (dominio.podeCriar()) {
        <button hlmBtn type="button" (click)="abrirNova()">Nova aplicação</button>
      }
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Situação" class="flex gap-1">
        @for (s of situacoes; track s.valor) {
          <button
            hlmBtn
            type="button"
            size="sm"
            [variant]="dominio.situacaoAtual() === s.valor ? 'default' : 'outline'"
            [attr.aria-pressed]="dominio.situacaoAtual() === s.valor"
            (click)="dominio.filtrarPorSituacao(s.valor)"
          >{{ s.rotulo }}</button>
        }
      </div>
      <input
        hlmInput
        type="search"
        class="max-w-xs"
        aria-label="Buscar aplicação"
        placeholder="Buscar por nome, sigla ou grupo"
        [value]="dominio.busca()"
        (change)="dominio.buscar($any($event.target).value)"
      />
    </div>

    @if (dominio.indisponivel()) {
      <p class="mt-6 text-fg-muted" role="status">Esta área ainda não está disponível neste ambiente.</p>
    } @else if (dominio.falhouAoCarregar()) {
      <p class="mt-6 text-destructive" role="alert">Não foi possível carregar as aplicações.</p>
    } @else {
      <div hlmTableContainer class="mt-4">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh [attr.aria-sort]="ariaSort('nome')"><button type="button" (click)="dominio.ordenarPor('nome')">Nome</button></th>
              <th hlmTh [attr.aria-sort]="ariaSort('sigla')"><button type="button" (click)="dominio.ordenarPor('sigla')">Sigla</button></th>
              <th hlmTh [attr.aria-sort]="ariaSort('grupo')"><button type="button" (click)="dominio.ordenarPor('grupo')">Grupo</button></th>
              <th hlmTh [attr.aria-sort]="ariaSort('quantidadeProjetos')"><button type="button" (click)="dominio.ordenarPor('quantidadeProjetos')">Projetos</button></th>
              <th hlmTh>Situação</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (a of dominio.pagina()?.itens ?? []; track a.id) {
              <tr hlmTr>
                <td hlmTd><a class="font-medium underline-offset-4 hover:underline" [routerLink]="['/aplicacoes', a.id]">{{ a.nome }}</a></td>
                <td hlmTd>{{ a.sigla }}</td>
                <td hlmTd>{{ a.grupo }}</td>
                <td hlmTd>{{ a.quantidadeProjetos }}</td>
                <td hlmTd>{{ a.ativa ? 'Ativa' : 'Inativa' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (!dominio.carregando() && (dominio.pagina()?.itens?.length ?? 0) === 0) {
        @if (dominio.comFiltro()) {
          <p class="mt-6 text-fg-muted">Nenhuma aplicação com esses filtros.</p>
        } @else {
          <p class="mt-6 text-fg-muted">
            Nenhuma aplicação cadastrada ainda.@if (dominio.podeCriar()) { Crie a primeira em "Nova aplicação". }
          </p>
        }
      }

      @if ((dominio.pagina()?.totalPaginas ?? 1) > 1) {
        <nav class="mt-4 flex items-center gap-3" aria-label="Paginação">
          <button hlmBtn variant="outline" size="sm" type="button" [disabled]="(dominio.pagina()?.pagina ?? 1) <= 1" (click)="mudar(-1)">Anterior</button>
          <span class="text-sm text-fg-muted">Página {{ dominio.pagina()?.pagina }} de {{ dominio.pagina()?.totalPaginas }} · {{ dominio.pagina()?.total }} aplicações</span>
          <button hlmBtn variant="outline" size="sm" type="button" [disabled]="(dominio.pagina()?.pagina ?? 1) >= (dominio.pagina()?.totalPaginas ?? 1)" (click)="mudar(1)">Próxima</button>
        </nav>
      }
    }

    <est-aplicacao-gaveta modo="nova" [salvar]="criar" [(aberta)]="gavetaAberta" />
  `,
})
export class AplicacoesListaPage implements OnInit {
  protected readonly dominio = inject(AplicacoesService);
  protected readonly situacoes = SITUACOES;
  protected readonly gavetaAberta = signal(false);
  private readonly gaveta = viewChild.required(AplicacaoGavetaComponent);

  protected readonly criar = (v: { nome: string; sigla: string; grupoGitLab: string }) => this.dominio.criar(v);

  ngOnInit(): void {
    void this.dominio.carregarLista();
  }

  protected abrirNova(): void {
    this.gaveta().preparar();
    this.gavetaAberta.set(true);
  }

  protected mudar(passo: number): void {
    void this.dominio.irParaPagina((this.dominio.pagina()?.pagina ?? 1) + passo);
  }

  protected ariaSort(coluna: ColunaOrdenavel): 'ascending' | 'descending' | null {
    const o = this.dominio.ordenacao();
    return o?.sort === coluna ? (o.order === 'asc' ? 'ascending' : 'descending') : null;
  }
}
