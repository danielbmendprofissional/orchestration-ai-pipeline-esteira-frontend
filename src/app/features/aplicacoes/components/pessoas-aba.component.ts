import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { ResultadoComando } from '../aplicacoes.service';
import type { PapelResumo, PessoaLista } from '../aplicacoes.tipos';

export const PAPEIS = [
  { id: 'analista', rotulo: 'analista' },
  { id: 'membro', rotulo: 'membro' },
  { id: 'aprovador-tecnico', rotulo: 'aprovador técnico' },
  { id: 'aprovador-negocio', rotulo: 'aprovador negócio' },
  { id: 'publicador', rotulo: 'publicador' },
] as const;

interface PessoaDaMatriz {
  usuario: string;
  nome: string;
  papeis: Map<string, string>;
}

/**
 * Aba Pessoas e papéis: matriz pessoa × papel (marcar vincula, desmarcar desvincula) e a gaveta "Adicionar
 * pessoa", que busca em `Pessoa` (quem já entrou na Esteira). Só `podeGerenciarPapeis` vê as ações.
 */
@Component({
  selector: 'est-pessoas-aba',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetImports, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTableImports],
  template: `
    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-fg-muted">{{ pessoas().length }} pessoa(s) com papel nesta aplicação.</p>
      @if (podeGerenciar()) {
        <button hlmBtn type="button" (click)="abrir()">Adicionar pessoa</button>
      }
    </div>

    @if (erro(); as mensagem) {
      <p class="mt-3 text-destructive" role="alert">{{ mensagem }}</p>
    }

    <div hlmTableContainer class="mt-4">
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Pessoa</th>
            @for (p of papeisDisponiveis; track p.id) {
              <th hlmTh>{{ p.rotulo }}</th>
            }
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (pessoa of pessoas(); track pessoa.usuario) {
            <tr hlmTr>
              <td hlmTd class="font-medium">{{ pessoa.nome }}</td>
              @for (p of papeisDisponiveis; track p.id) {
                <td hlmTd>
                  <input
                    type="checkbox"
                    [attr.aria-label]="pessoa.nome + ': ' + p.rotulo"
                    [checked]="pessoa.papeis.has(p.id)"
                    [disabled]="!podeGerenciar()"
                    (change)="alternar(pessoa, p.id, $any($event.target).checked)"
                  />
                </td>
              }
            </tr>
          } @empty {
            <tr hlmTr><td hlmTd [attr.colspan]="6" class="text-fg-muted">Ninguém tem papel nesta aplicação ainda.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <hlm-sheet side="right" [state]="gavetaAberta() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal>
        <hlm-sheet-header>
          <h2 hlmSheetTitle>Adicionar pessoa</h2>
          <p hlmSheetDescription>Só aparece quem já entrou na Esteira ao menos uma vez.</p>
        </hlm-sheet-header>

        <div class="flex flex-col gap-4 px-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="pessoa-busca">Buscar pessoa</label>
            <input hlmInput id="pessoa-busca" type="search" placeholder="Nome ou e-mail" (change)="buscar($any($event.target).value)" />
          </div>

          <ul class="flex flex-col gap-1">
            @for (r of resultados(); track r.sub) {
              <li>
                <button hlmBtn variant="outline" size="sm" type="button" [attr.aria-pressed]="escolhida()?.sub === r.sub" (click)="escolhida.set(r)">
                  {{ r.nome }} ({{ r.email }})
                </button>
              </li>
            }
          </ul>

          @if (escolhida(); as e) {
            <p>Pessoa escolhida: <strong>{{ e.nome }}</strong></p>
          }

          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="pessoa-papel">Papel</label>
            <select hlmInput id="pessoa-papel" (change)="papel.set($any($event.target).value)">
              @for (p of papeisDisponiveis; track p.id) {
                <option [value]="p.id" [selected]="p.id === papel()">{{ p.rotulo }}</option>
              }
            </select>
          </div>

          @if (mensagem(); as aviso) {
            <p class="text-sm text-destructive" role="alert">{{ aviso }}</p>
          }
        </div>

        <hlm-sheet-footer>
          <button hlmBtn type="button" [disabled]="!escolhida() || enviando()" (click)="vincularEscolhida()">Vincular</button>
          <button hlmBtn variant="outline" type="button" (click)="gavetaAberta.set(false)">Cancelar</button>
        </hlm-sheet-footer>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class PessoasAbaComponent {
  readonly papeis = input.required<PapelResumo[]>();
  readonly podeGerenciar = input(false);
  readonly erro = input<string | null>(null);
  readonly buscarPessoas = input.required<(texto: string) => Promise<PessoaLista[]>>();
  readonly vincular = input.required<(usuario: string, papel: string) => Promise<ResultadoComando>>();

  readonly desvincular = output<string>();
  readonly marcar = output<{ usuario: string; papel: string }>();

  protected readonly papeisDisponiveis = PAPEIS;
  protected readonly gavetaAberta = signal(false);
  protected readonly resultados = signal<PessoaLista[]>([]);
  protected readonly escolhida = signal<PessoaLista | null>(null);
  protected readonly papel = signal<string>('analista');
  protected readonly mensagem = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly pessoas = computed<PessoaDaMatriz[]>(() => {
    const porUsuario = new Map<string, PessoaDaMatriz>();
    for (const p of this.papeis()) {
      const usuario = p.usuario ?? '';
      const existente = porUsuario.get(usuario) ?? { usuario, nome: p.nome || usuario, papeis: new Map<string, string>() };
      existente.papeis.set(p.papel ?? '', p.id ?? '');
      porUsuario.set(usuario, existente);
    }
    return [...porUsuario.values()];
  });

  protected alternar(pessoa: PessoaDaMatriz, papel: string, ligado: boolean): void {
    if (ligado) this.marcar.emit({ usuario: pessoa.usuario, papel });
    else this.desvincular.emit(pessoa.papeis.get(papel) ?? '');
  }

  protected abrir(): void {
    this.resultados.set([]);
    this.escolhida.set(null);
    this.papel.set('analista');
    this.mensagem.set(null);
    this.gavetaAberta.set(true);
  }

  protected aoMudarEstado(estado: BrnDialogState): void {
    this.gavetaAberta.set(estado === 'open');
  }

  protected async buscar(texto: string): Promise<void> {
    this.escolhida.set(null);
    try {
      this.resultados.set(await this.buscarPessoas()(texto));
    } catch {
      this.resultados.set([]);
    }
  }

  protected async vincularEscolhida(): Promise<void> {
    const pessoa = this.escolhida();
    if (!pessoa) return;
    this.enviando.set(true);
    this.mensagem.set(null);
    try {
      const resultado = await this.vincular()(pessoa.sub ?? '', this.papel());
      if (resultado.ok) this.gavetaAberta.set(false);
      else this.mensagem.set(resultado.mensagem ?? 'Não foi possível vincular o papel.');
    } finally {
      this.enviando.set(false);
    }
  }
}
