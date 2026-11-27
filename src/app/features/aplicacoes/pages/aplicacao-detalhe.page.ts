import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { AplicacaoGavetaComponent } from '../components/aplicacao-gaveta.component';
import { AmbientesAbaComponent } from '../components/ambientes-aba.component';
import { PessoasAbaComponent } from '../components/pessoas-aba.component';
import { PoliticaAbaComponent } from '../components/politica-aba.component';
import { ProjetosAbaComponent, type NovoProjeto } from '../components/projetos-aba.component';
import { AplicacoesService, type FormDestino } from '../aplicacoes.service';
import type { AlterarPoliticaRequest, ProjetoGitLabItem } from '../aplicacoes.tipos';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { WorkspaceCampoComponent } from '../components/workspace-campo.component';

const ABAS = [
  { id: 'cadastro', rotulo: 'Cadastro' },
  { id: 'projetos', rotulo: 'Projetos' },
  { id: 'ambientes', rotulo: 'Ambientes e destinos' },
  { id: 'politica', rotulo: 'Política de segurança' },
  { id: 'pessoas', rotulo: 'Pessoas e papéis' },
] as const;

@Component({
  selector: 'est-aplicacao-detalhe-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButtonImports, HlmTabsImports, AplicacaoGavetaComponent, ProjetosAbaComponent, AmbientesAbaComponent, PoliticaAbaComponent, PessoasAbaComponent, WorkspaceCampoComponent],
  template: `
    @if (dominio.naoEncontrada()) {
      <h1 class="text-3xl font-semibold tracking-tight text-fg">Aplicação não encontrada</h1>
      <p class="mt-2 text-fg-muted">Ela não existe ou você não tem acesso a ela.</p>
      <a hlmBtn variant="outline" class="mt-4" routerLink="/aplicacoes">Voltar para Aplicações</a>
    } @else if (dominio.detalhe(); as a) {
      <a class="text-sm text-fg-muted underline-offset-4 hover:underline" routerLink="/aplicacoes">← Aplicações</a>
      <h1 class="mt-1 text-3xl font-semibold tracking-tight text-fg">{{ a.nome }}</h1>
      <p class="mt-1 text-fg-muted">{{ a.sigla }} · {{ a.grupo }} · {{ a.ativa ? 'Ativa' : 'Inativa' }}</p>

      <hlm-tabs class="mt-6" [tab]="aba()" (tabActivated)="aba.set($event)">
        <hlm-tabs-list variant="line" aria-label="Seções da aplicação">
          @for (t of abas; track t.id) {
            <button [hlmTabsTrigger]="t.id">{{ t.rotulo }}</button>
          }
        </hlm-tabs-list>

        <div hlmTabsContent="cadastro">
          <dl class="mt-4 grid max-w-md grid-cols-[8rem_1fr] gap-2">
            <dt class="text-fg-muted">Nome</dt><dd>{{ a.nome }}</dd>
            <dt class="text-fg-muted">Sigla</dt><dd>{{ a.sigla }}</dd>
            <dt class="text-fg-muted">Situação</dt><dd>{{ a.ativa ? 'Ativa' : 'Inativa' }}</dd>
            <dt class="text-fg-muted">Grupo do GitLab</dt><dd>{{ a.grupo }}</dd>
          </dl>
          @if (dominio.permissoes()?.podeEditarCadastro) {
            <button hlmBtn class="mt-4" type="button" (click)="editar()">Editar aplicação</button>
          } @else {
            <p class="mt-4 text-sm text-fg-muted">Somente leitura.</p>
          }
          @if (flags.isEnabled('P1')) {
            <est-workspace-campo
              [workspace]="a.workspace"
              [podeEditar]="dominio.permissoes()?.podeEditarCadastro ?? false"
              [grupo]="dominio.projetosDoGrupo()"
              [erro]="dominio.erroDoWorkspace()"
              [definir]="definirWorkspace"
              (carregar)="carregarGrupo()"
            />
          }
        </div>

        <div hlmTabsContent="projetos">
          <est-projetos-aba
            [projetos]="a.projetos ?? []"
            [podeEditar]="dominio.permissoes()?.podeEditar ?? false"
            [grupo]="dominio.projetosDoGrupo()"
            [erro]="dominio.erroDeProjetos()"
            [cadastrar]="cadastrarProjetos"
            [webhookVisivel]="flags.isEnabled('T1')"
            [podeReexecutar]="dominio.permissoes()?.podeEditar ?? false"
            (reexecutarWebhook)="dominio.reexecutarWebhook($event)"
            (adicionar)="carregarGrupo()"
            (alterarDependencias)="dominio.substituirDependencias($event.projetoId, $event.dependeDe)"
          />
        </div>

        <div hlmTabsContent="ambientes">
          <est-ambientes-aba
            [projetos]="a.projetos ?? []"
            [podeEditar]="dominio.permissoes()?.podeEditar ?? false"
            [erro]="dominio.erroDeProjetos()"
            [salvar]="salvarDestino"
            (alterarAmbiente)="dominio.alterarAmbiente($event.projetoId, $event.ambiente, $event.habilitado)"
            (remover)="dominio.removerDestino($event.projetoId, $event.ambiente, $event.destinoId)"
          />
        </div>

        <div hlmTabsContent="politica">
          <est-politica-aba
            [politicas]="a.politicas ?? []"
            [podeEditar]="dominio.permissoes()?.podeEditarPolitica ?? false"
            [erro]="dominio.erroDePolitica()"
            [salvar]="salvarPolitica"
          />
        </div>

        <div hlmTabsContent="pessoas">
          <est-pessoas-aba
            [papeis]="a.papeis ?? []"
            [podeGerenciar]="dominio.permissoes()?.podeGerenciarPapeis ?? false"
            [erro]="dominio.erroDePapeis()"
            [buscarPessoas]="buscarPessoas"
            [vincular]="vincularPapel"
            (marcar)="vincularPapel($event.usuario, $event.papel)"
            (desvincular)="dominio.desvincularPapel(idDaAplicacao(), $event)"
          />
        </div>
      </hlm-tabs>

      <est-aplicacao-gaveta modo="editar" [aplicacao]="a" [salvar]="alterarCadastro" [(aberta)]="gavetaAberta" />
    } @else {
      <p class="text-fg-muted" role="status">Carregando…</p>
    }
  `,
})
export class AplicacaoDetalhePage {
  protected readonly dominio = inject(AplicacoesService);
  protected readonly flags = inject(FeatureFlagsService);
  protected readonly definirWorkspace = (projeto: ProjetoGitLabItem | null) =>
    this.dominio.definirWorkspace(this.dominio.detalhe()?.id ?? '', projeto);
  protected readonly abas = ABAS;
  protected readonly aba = signal<string>('cadastro');
  protected readonly gavetaAberta = signal(false);
  private readonly gaveta = viewChild(AplicacaoGavetaComponent);

  constructor() {
    const rota = inject(ActivatedRoute).paramMap.subscribe((p) => void this.dominio.carregarDetalhe(p.get('id') ?? ''));
    inject(DestroyRef).onDestroy(() => rota.unsubscribe());
  }

  /** Funções (e não métodos) porque os componentes das abas, sem serviço, recebem a ação por `input`. */
  protected readonly cadastrarProjetos = (itens: NovoProjeto[]) => this.dominio.cadastrarProjetos(this.dominio.detalhe()?.id ?? '', itens);
  protected readonly salvarDestino = (projetoId: string, ambiente: string, destinoId: string | null, form: FormDestino) =>
    this.dominio.salvarDestino(projetoId, ambiente, destinoId, form);

  protected readonly alterarCadastro = (v: { nome: string; sigla: string; ativa: boolean }) =>
    this.dominio.alterar(this.idDaAplicacao(), { nome: v.nome, sigla: v.sigla, ativa: v.ativa });
  protected readonly salvarPolitica = (ambiente: string, pedido: AlterarPoliticaRequest) =>
    this.dominio.alterarPolitica(this.idDaAplicacao(), ambiente, pedido);
  protected readonly buscarPessoas = (texto: string) => this.dominio.buscarPessoas(texto);
  protected readonly vincularPapel = (usuario: string, papel: string) => this.dominio.vincularPapel(this.idDaAplicacao(), usuario, papel);

  protected idDaAplicacao(): string {
    return this.dominio.detalhe()?.id ?? '';
  }

  protected carregarGrupo(): void {
    void this.dominio.carregarProjetosDoGrupo(this.dominio.detalhe()?.id ?? '');
  }

  protected editar(): void {
    this.gaveta()?.preparar();
    this.gavetaAberta.set(true);
  }
}
