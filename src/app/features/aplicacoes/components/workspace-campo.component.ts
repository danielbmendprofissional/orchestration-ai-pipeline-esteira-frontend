import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import type { ResultadoComando } from '../aplicacoes.service';
import type { ProjetoGitLabItem } from '../aplicacoes.tipos';

type Workspace = { projetoGitLabId?: number | string; caminho?: string } | null | undefined;

/**
 * Campo Workspace do cadastro (P1): projeto do grupo do GitLab onde a Esteira lê as Fatias. Lista só os projetos
 * ainda não cadastrados como Projeto. Sem permissão, só mostra o valor atual.
 */
@Component({
  selector: 'est-workspace-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports],
  template: `
    <div class="mt-6 max-w-md" data-testid="workspace-campo">
      <h2 class="text-sm font-medium text-fg">Workspace</h2>
      <p class="mt-1 text-sm text-fg-muted" data-testid="workspace-atual">
        @if (workspace()?.caminho; as caminho) { {{ caminho }} } @else { Sem workspace }
      </p>

      @if (podeEditar()) {
        <label class="mt-3 block text-sm text-fg-muted" for="workspace-select">Projeto do grupo</label>
        <select
          id="workspace-select"
          data-testid="workspace-select"
          class="mt-1 block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          [attr.aria-describedby]="erro() ? 'workspace-erro' : null"
          [attr.aria-invalid]="erro() ? 'true' : null"
          (change)="escolhido.set($any($event.target).value)"
        >
          <option value="" [selected]="escolhido() === ''">Selecione um projeto</option>
          @for (g of disponiveis(); track g.projetoGitLabId) {
            <option [value]="g.projetoGitLabId" [selected]="escolhido() === '' + g.projetoGitLabId">{{ g.caminho }}</option>
          }
        </select>
        @if (erro(); as mensagem) {
          <p id="workspace-erro" data-testid="workspace-erro" class="mt-2 text-sm text-destructive" role="alert">{{ mensagem }}</p>
        }
        <div class="mt-3 flex gap-2">
          <button hlmBtn type="button" data-testid="workspace-salvar" [disabled]="enviando() || escolhido() === ''" (click)="salvar()">
            Salvar workspace
          </button>
          @if (workspace()) {
            <button hlmBtn variant="outline" type="button" data-testid="workspace-limpar" [disabled]="enviando()" (click)="limpar()">
              Limpar
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class WorkspaceCampoComponent implements OnInit {
  readonly workspace = input<Workspace>(null);
  readonly podeEditar = input(false);
  readonly grupo = input<ProjetoGitLabItem[]>([]);
  readonly erro = input<string | null>(null);
  readonly definir = input.required<(projeto: ProjetoGitLabItem | null) => Promise<ResultadoComando>>();

  /** Pede à página a lista do grupo (a mesma da aba Projetos); só quando há permissão de editar. */
  readonly carregar = output<void>();

  protected readonly escolhido = signal('');
  protected readonly enviando = signal(false);

  ngOnInit(): void {
    if (this.podeEditar()) this.carregar.emit();
  }

  protected disponiveis(): ProjetoGitLabItem[] {
    return this.grupo().filter((g) => !g.cadastrado);
  }

  protected async salvar(): Promise<void> {
    const projeto = this.disponiveis().find((g) => String(g.projetoGitLabId) === this.escolhido());
    if (projeto) await this.enviar(projeto);
  }

  protected limpar(): Promise<void> {
    return this.enviar(null);
  }

  private async enviar(projeto: ProjetoGitLabItem | null): Promise<void> {
    this.enviando.set(true);
    try {
      const r = await this.definir()(projeto);
      if (r.ok) this.escolhido.set('');
    } finally {
      this.enviando.set(false);
    }
  }
}
