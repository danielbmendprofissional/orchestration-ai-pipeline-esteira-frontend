import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import type { ResultadoComando } from '../aplicacoes.service';
import type { TetoCusto } from '../aplicacoes.tipos';

/**
 * Campo "Teto de custo dos agentes" do cadastro (X3): mostra o valor efetivo (US$ por execução) e, quando a pessoa
 * pode editar, abre uma gaveta com o campo numérico e "Usar padrão da Esteira". A faixa (0,10 a 50,00, 2 casas) é
 * regra da API; aqui só se recusa o que nem número é. Recusa da API chega por `erro`, junto do campo.
 */
@Component({
  selector: 'est-teto-custo-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetImports, HlmButtonImports, HlmInputImports, HlmLabelImports],
  template: `
    <div class="mt-6 max-w-md" data-testid="teto-custo-campo">
      <h2 class="text-sm font-medium text-fg">Teto de custo dos agentes (US$ por execução)</h2>
      <p class="mt-1 text-sm text-fg-muted">
        <span data-testid="teto-valor">US$ {{ valorFormatado() }}</span>
        @if (!definido()) { <span> · padrão da Esteira</span> }
      </p>
      @if (podeEditar()) {
        <button hlmBtn variant="outline" class="mt-3" type="button" data-testid="teto-alterar" (click)="abrir()">Alterar teto</button>
      }
    </div>

    <hlm-sheet side="right" [state]="aberta() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal>
        <hlm-sheet-header>
          <h2 hlmSheetTitle>Teto de custo dos agentes</h2>
          <p hlmSheetDescription>
            Vale só para os agentes do CI (code-review, security e qa), em dólares por execução. O teto não limita o uso pessoal
            (/fatia, /implement-task, plano do Claude Code).
          </p>
        </hlm-sheet-header>

        <form class="flex flex-col gap-1.5 px-4" novalidate (submit)="salvar($event)">
          <label hlmLabel for="teto-input">Teto (US$ por execução)</label>
          <input
            hlmInput
            id="teto-input"
            data-testid="teto-input"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            [value]="texto()"
            [attr.aria-invalid]="mensagem() ? 'true' : null"
            [attr.aria-describedby]="mensagem() ? 'teto-erro' : 'teto-dica'"
            (input)="texto.set($any($event.target).value); local.set(null)"
          />
          <p id="teto-dica" class="text-sm text-fg-muted">Entre 0,10 e 50,00, com até duas casas.</p>
          @if (mensagem(); as m) {
            <p id="teto-erro" data-testid="teto-erro" class="text-sm text-destructive" role="alert">{{ m }}</p>
          }
        </form>

        <hlm-sheet-footer>
          <button hlmBtn type="button" data-testid="teto-salvar" [disabled]="enviando()" (click)="salvar($event)">Salvar</button>
          <button hlmBtn variant="outline" type="button" data-testid="teto-padrao" [disabled]="enviando()" (click)="usarPadrao()">
            Usar padrão da Esteira
          </button>
          <button hlmBtn variant="outline" type="button" (click)="aberta.set(false)">Cancelar</button>
        </hlm-sheet-footer>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class TetoCustoCampoComponent {
  readonly teto = input<TetoCusto | undefined>(undefined);
  readonly podeEditar = input(false);
  /** Recusa vinda de fora; a recusa do próprio `definir` (`mensagem` do ResultadoComando) já vira erro local. */
  readonly erro = input<string | null>(null);
  readonly definir = input.required<(valor: number | null) => Promise<ResultadoComando>>();

  protected readonly aberta = signal(false);
  protected readonly enviando = signal(false);
  protected readonly texto = signal('');
  protected readonly local = signal<string | null>(null);
  protected readonly efetivo = computed(() => this.teto()?.efetivoUsd ?? this.teto()?.padraoUsd ?? 0);
  protected readonly valorFormatado = computed(() => this.efetivo().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  protected readonly definido = computed(() => this.teto()?.tetoCustoUsd != null);
  protected readonly mensagem = computed(() => this.local() ?? this.erro());

  protected abrir(): void {
    const t = this.teto()?.tetoCustoUsd;
    this.texto.set(t == null ? '' : String(t).replace('.', ','));
    this.local.set(null);
    this.aberta.set(true);
  }

  protected aoMudarEstado(estado: BrnDialogState): void {
    const abrir = estado === 'open';
    if (abrir !== this.aberta()) this.aberta.set(abrir);
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const bruto = this.texto().trim().replace(',', '.');
    const valor = Number(bruto);
    if (bruto === '' || !Number.isFinite(valor)) {
      this.local.set('Informe um número, por exemplo 2,50.');
      return;
    }
    await this.enviar(valor);
  }

  protected usarPadrao(): Promise<void> {
    return this.enviar(null);
  }

  private async enviar(valor: number | null): Promise<void> {
    this.enviando.set(true);
    try {
      const r = await this.definir()(valor);
      if (r.ok) this.aberta.set(false);
      else if (r.mensagem) this.local.set(r.mensagem);
    } finally {
      this.enviando.set(false);
    }
  }
}
