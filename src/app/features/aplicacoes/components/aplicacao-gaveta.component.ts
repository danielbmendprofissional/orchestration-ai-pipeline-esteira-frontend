import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { AplicacoesService, type CampoDoForm } from '../aplicacoes.service';
import type { AplicacaoDetalhe } from '../aplicacoes.tipos';

const CAMPOS: { nome: CampoDoForm; rotulo: string }[] = [
  { nome: 'nome', rotulo: 'Nome' },
  { nome: 'sigla', rotulo: 'Sigla' },
  { nome: 'grupoGitLab', rotulo: 'Grupo do GitLab' },
];

/**
 * Gaveta de Nova/Editar Aplicação (edição sempre em gaveta, como no protótipo). No modo `editar` o grupo do
 * GitLab é só leitura: o vínculo não muda depois de criado. Erro de negócio que cabe num campo aparece junto dele.
 */
@Component({
  selector: 'est-aplicacao-gaveta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetImports, HlmButtonImports, HlmInputImports, HlmLabelImports],
  template: `
    <hlm-sheet side="right" [state]="aberta() ? 'open' : 'closed'" (stateChanged)="aoMudarEstado($event)">
      <hlm-sheet-content *hlmSheetPortal>
        <hlm-sheet-header>
          <h2 hlmSheetTitle>{{ modo() === 'nova' ? 'Nova aplicação' : 'Editar aplicação' }}</h2>
          <p hlmSheetDescription>
            {{ modo() === 'nova' ? 'Cadastre a aplicação e o grupo do GitLab dela.' : 'O grupo do GitLab não muda depois de criada.' }}
          </p>
        </hlm-sheet-header>

        <form class="flex flex-col gap-4 px-4" novalidate (submit)="enviar($event)">
          @for (c of campos; track c.nome) {
            <div class="flex flex-col gap-1.5">
              <label hlmLabel [for]="'ap-' + c.nome">{{ c.rotulo }}</label>
              <input
                hlmInput
                [id]="'ap-' + c.nome"
                [value]="valor(c.nome)"
                [readOnly]="c.nome === 'grupoGitLab' && modo() === 'editar'"
                [attr.aria-invalid]="erro(c.nome) ? 'true' : null"
                [attr.aria-describedby]="erro(c.nome) ? 'ap-' + c.nome + '-erro' : null"
                (input)="digitar(c.nome, $any($event.target).value)"
              />
              @if (erro(c.nome); as mensagem) {
                <p class="text-sm text-destructive" [id]="'ap-' + c.nome + '-erro'">{{ mensagem }}</p>
              }
            </div>
          }

          @if (modo() === 'editar') {
            <div class="flex items-center gap-2">
              <input id="ap-ativa" type="checkbox" [checked]="ativa()" (change)="ativa.set($any($event.target).checked)" />
              <label hlmLabel for="ap-ativa">Ativa</label>
            </div>
          }
        </form>

        <hlm-sheet-footer>
          <button hlmBtn type="button" [disabled]="enviando()" (click)="enviar($event)">
            {{ modo() === 'nova' ? 'Criar aplicação' : 'Salvar' }}
          </button>
          <button hlmBtn variant="outline" type="button" (click)="aberta.set(false)">Cancelar</button>
        </hlm-sheet-footer>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class AplicacaoGavetaComponent {
  private readonly dominio = inject(AplicacoesService);

  readonly modo = input.required<'nova' | 'editar'>();
  /** Aplicação sendo editada (modo `editar`). */
  readonly aplicacao = input<AplicacaoDetalhe | null>(null);
  readonly aberta = model(false);

  protected readonly campos = CAMPOS;
  protected readonly enviando = signal(false);
  protected readonly ativa = signal(true);
  private readonly valores = signal<Record<CampoDoForm, string>>({ nome: '', sigla: '', grupoGitLab: '' });
  private readonly erros = signal<Partial<Record<CampoDoForm, string>>>({});

  protected valor(campo: CampoDoForm): string {
    if (campo === 'grupoGitLab' && this.modo() === 'editar') return this.aplicacao()?.grupo ?? '';
    return this.valores()[campo];
  }

  protected erro(campo: CampoDoForm): string | undefined {
    return this.erros()[campo];
  }

  protected digitar(campo: CampoDoForm, texto: string): void {
    this.valores.update((v) => ({ ...v, [campo]: texto }));
  }

  /** ESC e clique fora fecham pela própria gaveta; o estado volta pro pai. */
  protected aoMudarEstado(estado: BrnDialogState): void {
    const abrir = estado === 'open';
    if (abrir !== this.aberta()) this.aberta.set(abrir);
  }

  /** A página chama antes de abrir: parte sempre do cadastro atual (edição) ou do vazio (criação). */
  preparar(): void {
    const a = this.aplicacao();
    this.erros.set({});
    this.valores.set(
      this.modo() === 'editar' && a
        ? { nome: a.nome ?? '', sigla: a.sigla ?? '', grupoGitLab: a.grupo ?? '' }
        : { nome: '', sigla: '', grupoGitLab: '' },
    );
    this.ativa.set(a?.ativa ?? true);
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    const v = this.valores();
    const obrigatorios: { campo: CampoDoForm; mensagem: string }[] = [
      { campo: 'nome', mensagem: 'Informe o nome.' },
      { campo: 'sigla', mensagem: 'Informe a sigla.' },
      ...(this.modo() === 'nova' ? [{ campo: 'grupoGitLab' as const, mensagem: 'Informe o grupo do GitLab.' }] : []),
    ];
    const faltando = Object.fromEntries(obrigatorios.filter((o) => !v[o.campo].trim()).map((o) => [o.campo, o.mensagem]));
    this.erros.set(faltando);
    if (Object.keys(faltando).length > 0) return;

    this.enviando.set(true);
    try {
      const resultado =
        this.modo() === 'nova'
          ? await this.dominio.criar(v)
          : await this.dominio.alterar(this.aplicacao()?.id ?? '', { nome: v.nome, sigla: v.sigla, ativa: this.ativa() });
      if (resultado.ok) this.aberta.set(false);
      else if (resultado.campo) this.erros.set({ [resultado.campo]: resultado.mensagem });
    } finally {
      this.enviando.set(false);
    }
  }
}
