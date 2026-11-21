import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { FormDestino, ResultadoComando } from '../aplicacoes.service';
import type { AmbienteProjeto, Destino, ProjetoResumo } from '../aplicacoes.tipos';

export const AMBIENTES = [
  { id: 'qa', rotulo: 'qa' },
  { id: 'hml', rotulo: 'hml' },
  { id: 'producao', rotulo: 'produção' },
] as const;

interface EmEdicao {
  projeto: ProjetoResumo;
  ambiente: string;
  rotuloAmbiente: string;
  destino: Destino | null;
}

interface Par {
  chave: string;
  valor: string;
}

/**
 * Aba Ambientes e destinos: matriz Projeto × Ambiente (`producao` sempre habilitado) e, em cada célula
 * habilitada, os Destinos com editor chave→valor numa gaveta. A Esteira não guarda segredo: a API recusa chave
 * com nome de segredo e a gaveta mostra a mensagem.
 */
@Component({
  selector: 'est-ambientes-aba',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetImports, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTableImports],
  template: `
    @if (erro(); as mensagem) {
      <p class="mt-3 text-destructive" role="alert">{{ mensagem }}</p>
    }
    <div hlmTableContainer class="mt-4">
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Projeto</th>
            @for (a of ambientes; track a.id) {
              <th hlmTh>{{ a.rotulo }}</th>
            }
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (p of projetos(); track p.id) {
            <tr hlmTr>
              <td hlmTd class="font-medium">{{ p.caminho }}</td>
              @for (a of ambientes; track a.id) {
                <td hlmTd class="align-top">
                  @if (celula(p, a.id); as c) {
                    <label class="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        [attr.aria-label]="p.caminho + ' em ' + a.rotulo"
                        [checked]="c.habilitado"
                        [disabled]="!podeEditar() || a.id === 'producao'"
                        (change)="alterarAmbiente.emit({ projetoId: p.id ?? '', ambiente: a.id, habilitado: $any($event.target).checked })"
                      />
                      Habilitado
                    </label>
                    @if (c.habilitado) {
                      <ul class="mt-2 flex flex-col gap-1">
                        @for (d of c.destinos ?? []; track d.id) {
                          <li class="flex items-center gap-2">
                            <span>{{ d.nome }}</span>
                            @if (podeEditar()) {
                              <button hlmBtn variant="ghost" size="sm" type="button" (click)="abrir(p, a, d)">Editar<span class="sr-only"> destino {{ d.nome }}</span></button>
                              <button hlmBtn variant="ghost" size="sm" type="button" (click)="remover.emit({ projetoId: p.id ?? '', ambiente: a.id, destinoId: d.id ?? '' })">Remover<span class="sr-only"> destino {{ d.nome }}</span></button>
                            }
                          </li>
                        } @empty {
                          <li class="text-sm text-fg-muted">Sem destino: ambiente sem deploy.</li>
                        }
                      </ul>
                      @if (podeEditar()) {
                        <button hlmBtn variant="outline" size="sm" class="mt-2" type="button" (click)="abrir(p, a, null)">Adicionar destino<span class="sr-only"> de {{ p.caminho }} em {{ a.rotulo }}</span></button>
                      }
                    }
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr hlmTr><td hlmTd [attr.colspan]="4" class="text-fg-muted">Cadastre projetos na aba Projetos primeiro.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <hlm-sheet side="right" [state]="edicao() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal>
        <hlm-sheet-header>
          <h2 hlmSheetTitle>{{ edicao()?.destino ? 'Editar destino' : 'Novo destino' }}</h2>
          <p hlmSheetDescription>{{ edicao()?.projeto?.caminho }} em {{ edicao()?.rotuloAmbiente }}. Sem segredos: eles ficam como variável do GitLab.</p>
        </hlm-sheet-header>

        <form class="flex flex-col gap-4 px-4" novalidate (submit)="salvarDestino($event)">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="destino-nome">Nome do destino</label>
            <input
              hlmInput
              id="destino-nome"
              [value]="nome()"
              [attr.aria-invalid]="erroNome() ? 'true' : null"
              [attr.aria-describedby]="erroNome() ? 'destino-nome-erro' : null"
              (input)="nome.set($any($event.target).value)"
            />
            @if (erroNome(); as aviso) {
              <p class="text-sm text-destructive" id="destino-nome-erro">{{ aviso }}</p>
            }
          </div>

          @for (par of pares(); track $index) {
            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col gap-1.5">
                <label hlmLabel [for]="'destino-chave-' + $index">Chave {{ $index + 1 }}</label>
                <input hlmInput [id]="'destino-chave-' + $index" [value]="par.chave" (input)="editarPar($index, 'chave', $any($event.target).value)" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel [for]="'destino-valor-' + $index">Valor {{ $index + 1 }}</label>
                <input hlmInput [id]="'destino-valor-' + $index" [value]="par.valor" (input)="editarPar($index, 'valor', $any($event.target).value)" />
              </div>
            </div>
          }
          <button hlmBtn variant="outline" size="sm" type="button" class="self-start" (click)="adicionarPar()">Adicionar chave</button>

          @if (mensagem(); as aviso) {
            <p class="text-sm text-destructive" role="alert">{{ aviso }}</p>
          }
        </form>

        <hlm-sheet-footer>
          <button hlmBtn type="button" [disabled]="enviando()" (click)="salvarDestino($event)">Salvar destino</button>
          <button hlmBtn variant="outline" type="button" (click)="edicao.set(null)">Cancelar</button>
        </hlm-sheet-footer>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class AmbientesAbaComponent {
  readonly projetos = input.required<ProjetoResumo[]>();
  readonly podeEditar = input(false);
  readonly erro = input<string | null>(null);
  readonly salvar = input.required<(projetoId: string, ambiente: string, destinoId: string | null, form: FormDestino) => Promise<ResultadoComando>>();

  readonly alterarAmbiente = output<{ projetoId: string; ambiente: string; habilitado: boolean }>();
  readonly remover = output<{ projetoId: string; ambiente: string; destinoId: string }>();

  protected readonly ambientes = AMBIENTES;
  protected readonly edicao = signal<EmEdicao | null>(null);
  protected readonly nome = signal('');
  protected readonly pares = signal<Par[]>([{ chave: '', valor: '' }]);
  protected readonly erroNome = signal<string | null>(null);
  protected readonly mensagem = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected celula(projeto: ProjetoResumo, ambiente: string): AmbienteProjeto | undefined {
    return projeto.ambientes?.find((a) => a.ambiente === ambiente);
  }

  protected abrir(projeto: ProjetoResumo, a: (typeof AMBIENTES)[number], destino: Destino | null): void {
    this.nome.set(destino?.nome ?? '');
    const existentes = Object.entries(destino?.configuracao ?? {}).map(([chave, valor]) => ({ chave, valor }));
    this.pares.set(existentes.length ? existentes : [{ chave: '', valor: '' }]);
    this.erroNome.set(null);
    this.mensagem.set(null);
    this.edicao.set({ projeto, ambiente: a.id, rotuloAmbiente: a.rotulo, destino });
  }

  protected aoMudarEstado(estado: BrnDialogState): void {
    if (estado !== 'open') this.edicao.set(null);
  }

  protected editarPar(indice: number, campo: keyof Par, texto: string): void {
    this.pares.update((lista) => lista.map((p, i) => (i === indice ? { ...p, [campo]: texto } : p)));
  }

  protected adicionarPar(): void {
    this.pares.update((lista) => [...lista, { chave: '', valor: '' }]);
  }

  protected async salvarDestino(evento: Event): Promise<void> {
    evento.preventDefault();
    const atual = this.edicao();
    if (!atual) return;
    this.mensagem.set(null);
    if (!this.nome().trim()) {
      this.erroNome.set('Informe o nome do destino.');
      return;
    }
    this.erroNome.set(null);
    const configuracao = Object.fromEntries(this.pares().filter((p) => p.chave.trim()).map((p) => [p.chave.trim(), p.valor]));

    this.enviando.set(true);
    try {
      const resultado = await this.salvar()(atual.projeto.id ?? '', atual.ambiente, atual.destino?.id ?? null, { nome: this.nome(), configuracao });
      if (resultado.ok) this.edicao.set(null);
      else this.mensagem.set(resultado.mensagem ?? 'Não foi possível salvar o destino.');
    } finally {
      this.enviando.set(false);
    }
  }
}
