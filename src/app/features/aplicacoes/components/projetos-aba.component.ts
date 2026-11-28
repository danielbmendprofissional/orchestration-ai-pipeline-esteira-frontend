import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { ResultadoComando } from '../aplicacoes.service';
import type { ProjetoGitLabItem, ProjetoResumo, WebhookProjeto } from '../aplicacoes.tipos';

export interface NovoProjeto {
  projetoGitLabId: number | string;
  stack: string;
}

const ROTULO_WEBHOOK: Record<string, string> = { pendente: 'Pendente', registrado: 'Registrado', falhou: 'Falhou' };
const ERRO_WEBHOOK: Record<string, string> = {
  'webhook.bot-nao-configurado': 'O bot da Esteira não está configurado para esse grupo.',
  'webhook.sem-permissao': 'O bot não tem permissão para criar o webhook nesse projeto.',
  'webhook.gitlab-indisponivel': 'O GitLab está indisponível no momento.',
};

/**
 * Aba Projetos: cadastrados (stack e dependências) e a gaveta "Adicionar projetos", que lista os do grupo do
 * GitLab ainda não cadastrados com a stack sugerida editável. Sem permissão, nenhuma ação aparece.
 */
@Component({
  selector: 'est-projetos-aba',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetImports, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTableImports],
  template: `
    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-fg-muted">{{ projetos().length }} projeto(s) cadastrado(s).</p>
      @if (podeEditar()) {
        <button hlmBtn type="button" (click)="abrir()">Adicionar projetos</button>
      }
    </div>

    @if (erro(); as mensagem) {
      <p class="mt-3 text-destructive" role="alert">{{ mensagem }}</p>
    }

    <div hlmTableContainer class="mt-4">
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Projeto</th>
            <th hlmTh>Stack</th>
            <th hlmTh>Depende de</th>
            @if (webhookVisivel()) {
              <th hlmTh>Webhook</th>
            }
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (p of projetos(); track p.id) {
            <tr hlmTr>
              <td hlmTd>{{ p.caminho }}</td>
              <td hlmTd>{{ p.stack }}</td>
              <td hlmTd>
                @for (outro of projetos(); track outro.id) {
                  @if (outro.id !== p.id) {
                    @if (podeEditar()) {
                      <label class="mr-3 inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          [attr.aria-label]="p.caminho + ' depende de ' + outro.caminho"
                          [checked]="dependeDe(p, outro)"
                          (change)="alternar(p, outro, $any($event.target).checked)"
                        />
                        {{ outro.nome }}
                      </label>
                    } @else if (dependeDe(p, outro)) {
                      <span class="mr-3">{{ outro.nome }}</span>
                    }
                  }
                } @empty {
                  <span class="text-fg-muted">—</span>
                }
              </td>
              @if (webhookVisivel()) {
                <td hlmTd>
                  @if (p.webhook; as w) {
                    <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span [class]="w.estado === 'falhou' ? 'font-medium text-bad-fg' : 'text-fg'">{{ rotuloWebhook(w) }}</span>
                      @if (w.estado === 'falhou' && w.codigoErro) {
                        <span class="text-fg-muted">{{ erroWebhook(w.codigoErro) }}</span>
                      }
                      @if (w.estado === 'falhou' && podeReexecutar()) {
                        <button
                          hlmBtn
                          variant="outline"
                          size="sm"
                          type="button"
                          [attr.aria-label]="'Reexecutar o registro do webhook de ' + p.caminho"
                          (click)="reexecutarWebhook.emit(p.id ?? '')"
                        >Reexecutar</button>
                      }
                    </span>
                  } @else {
                    <span class="text-fg-muted">Sem registro</span>
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr hlmTr><td hlmTd [attr.colspan]="webhookVisivel() ? 4 : 3" class="text-fg-muted">Nenhum projeto cadastrado.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <hlm-sheet side="right" [state]="gavetaAberta() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal>
        <hlm-sheet-header>
          <h2 hlmSheetTitle>Adicionar projetos</h2>
          <p hlmSheetDescription>Projetos do grupo do GitLab que ainda não estão cadastrados.</p>
        </hlm-sheet-header>

        <div class="flex flex-col gap-3 px-4">
          @for (g of disponiveis(); track g.projetoGitLabId) {
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                [attr.aria-label]="'Selecionar ' + g.caminho"
                [checked]="marcado(g)"
                (change)="marcar(g, $any($event.target).checked)"
              />
              <span class="flex-1">{{ g.caminho }}</span>
              <label hlmLabel class="sr-only" [for]="'stack-' + g.projetoGitLabId">Stack de {{ g.caminho }}</label>
              <input
                hlmInput
                class="w-32"
                [id]="'stack-' + g.projetoGitLabId"
                [value]="stack(g)"
                (input)="definirStack(g, $any($event.target).value)"
              />
            </div>
          } @empty {
            <p class="text-fg-muted">Todos os projetos do grupo já estão cadastrados.</p>
          }
          @if (mensagem(); as aviso) {
            <p class="text-sm text-destructive" role="alert">{{ aviso }}</p>
          }
        </div>

        <hlm-sheet-footer>
          <button hlmBtn type="button" [disabled]="enviando() || marcados().size === 0" (click)="cadastrarMarcados()">Cadastrar selecionados</button>
          <button hlmBtn variant="outline" type="button" (click)="gavetaAberta.set(false)">Cancelar</button>
        </hlm-sheet-footer>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class ProjetosAbaComponent {
  readonly projetos = input.required<ProjetoResumo[]>();
  readonly podeEditar = input(false);
  /** Projetos do grupo do GitLab (a página os carrega quando a gaveta abre). */
  readonly grupo = input<ProjetoGitLabItem[]>([]);
  readonly erro = input<string | null>(null);
  readonly cadastrar = input.required<(itens: NovoProjeto[]) => Promise<ResultadoComando>>();

  /** T1: a coluna Webhook só existe com `Features:T1` ligado; Reexecutar, só para MOR (a page decide). */
  readonly webhookVisivel = input(false);
  readonly podeReexecutar = input(false);
  readonly reexecutarWebhook = output<string>();

  readonly adicionar = output<void>();
  readonly alterarDependencias = output<{ projetoId: string; dependeDe: string[] }>();

  protected readonly gavetaAberta = signal(false);
  protected readonly enviando = signal(false);
  protected readonly mensagem = signal<string | null>(null);
  protected readonly marcados = signal<ReadonlySet<number | string>>(new Set());
  private readonly stacks = signal<Record<string, string>>({});

  protected rotuloWebhook(w: WebhookProjeto): string {
    const estado = w.estado ?? '';
    return ROTULO_WEBHOOK[estado] ?? estado;
  }

  protected erroWebhook(codigo: string): string {
    return ERRO_WEBHOOK[codigo] ?? 'Não foi possível registrar o webhook no GitLab.';
  }

  protected disponiveis():ProjetoGitLabItem[] {
    return this.grupo().filter((g) => !g.cadastrado);
  }

  protected dependeDe(projeto: ProjetoResumo, outro: ProjetoResumo): boolean {
    return (projeto.dependeDe ?? []).includes(outro.id ?? '');
  }

  protected alternar(projeto: ProjetoResumo, outro: ProjetoResumo, ligado: boolean): void {
    const atual = projeto.dependeDe ?? [];
    const proximo = ligado ? [...atual, outro.id ?? ''] : atual.filter((id) => id !== outro.id);
    this.alterarDependencias.emit({ projetoId: projeto.id ?? '', dependeDe: proximo });
  }

  protected abrir(): void {
    this.marcados.set(new Set());
    this.stacks.set({});
    this.mensagem.set(null);
    this.adicionar.emit();
    this.gavetaAberta.set(true);
  }

  protected aoMudarEstado(estado: BrnDialogState): void {
    this.gavetaAberta.set(estado === 'open');
  }

  protected marcado(g: ProjetoGitLabItem): boolean {
    return this.marcados().has(g.projetoGitLabId ?? '');
  }

  protected marcar(g: ProjetoGitLabItem, ligado: boolean): void {
    this.marcados.update((atual) => {
      const novo = new Set(atual);
      if (ligado) novo.add(g.projetoGitLabId ?? '');
      else novo.delete(g.projetoGitLabId ?? '');
      return novo;
    });
  }

  protected stack(g: ProjetoGitLabItem): string {
    return this.stacks()[String(g.projetoGitLabId)] ?? g.stackSugerida ?? '';
  }

  protected definirStack(g: ProjetoGitLabItem, texto: string): void {
    this.stacks.update((atual) => ({ ...atual, [String(g.projetoGitLabId)]: texto }));
  }

  protected async cadastrarMarcados(): Promise<void> {
    const itens = this.disponiveis()
      .filter((g) => this.marcado(g))
      .map((g) => ({ projetoGitLabId: g.projetoGitLabId ?? '', stack: this.stack(g) }));
    this.enviando.set(true);
    this.mensagem.set(null);
    try {
      const resultado = await this.cadastrar()(itens);
      if (resultado.ok) this.gavetaAberta.set(false);
      else this.mensagem.set(resultado.mensagem ?? 'Não foi possível cadastrar os projetos selecionados.');
    } finally {
      this.enviando.set(false);
    }
  }
}
