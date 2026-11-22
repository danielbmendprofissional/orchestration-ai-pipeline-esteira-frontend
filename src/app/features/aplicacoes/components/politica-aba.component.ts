import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { ResultadoComando } from '../aplicacoes.service';
import type { AlterarPoliticaRequest, Politica } from '../aplicacoes.tipos';

type Severidade = 'critica' | 'alta' | 'media' | 'baixa';

const AMBIENTES = ['review', 'qa', 'hml', 'producao'] as const;
const SEVERIDADES: { id: Severidade; rotulo: string }[] = [
  { id: 'critica', rotulo: 'Crítica' },
  { id: 'alta', rotulo: 'Alta' },
  { id: 'media', rotulo: 'Média' },
  { id: 'baixa', rotulo: 'Baixa' },
];

interface Linha {
  critica: string;
  alta: string;
  media: string;
  baixa: string;
  modo: string;
}

/**
 * Aba Política de segurança: limites de achados por severidade e o modo (avisa/bloqueia) de cada Ambiente.
 * Em `qa`, `hml` e `producao` o piso fixo aparece travado (modo `bloqueia`, Crítica e Alta em 0): só `review`
 * é livre e os demais só endurecem em Média e Baixa. Quem recusa o que abaixa o piso é a API.
 */
@Component({
  selector: 'est-politica-aba',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmInputImports, HlmTableImports],
  template: `
    <p class="mt-4 max-w-2xl text-fg-muted">
      Quantos achados de cada severidade a Esteira tolera. Deixe em branco para não ter limite. O que está travado é o
      mínimo fixo de qa, hml e produção.
    </p>

    @if (erro(); as mensagem) {
      <p class="mt-3 text-destructive" role="alert">{{ mensagem }}</p>
    }

    <div hlmTableContainer class="mt-4">
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Ambiente</th>
            @for (s of severidades; track s.id) {
              <th hlmTh>{{ s.rotulo }}</th>
            }
            <th hlmTh>Modo</th>
            <th hlmTh><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (amb of ambientes; track amb) {
            <tr hlmTr>
              <td hlmTd class="font-medium">{{ amb === 'producao' ? 'produção' : amb }}</td>
              @for (s of severidades; track s.id) {
                <td hlmTd>
                  <input
                    hlmInput
                    type="number"
                    min="0"
                    class="w-24"
                    placeholder="sem limite"
                    [attr.aria-label]="s.rotulo + ' em ' + amb"
                    [value]="valor(amb, s.id)"
                    [disabled]="!podeEditar() || travado(amb, s.id)"
                    (input)="digitar(amb, s.id, $any($event.target).value)"
                  />
                </td>
              }
              <td hlmTd>
                <select
                  hlmInput
                  class="w-32"
                  [attr.aria-label]="'Modo em ' + amb"
                  [disabled]="!podeEditar() || amb !== 'review'"
                  (change)="digitar(amb, 'modo', $any($event.target).value)"
                >
                  <option value="avisa" [selected]="valor(amb, 'modo') === 'avisa'">avisa</option>
                  <option value="bloqueia" [selected]="valor(amb, 'modo') === 'bloqueia'">bloqueia</option>
                </select>
              </td>
              <td hlmTd>
                @if (podeEditar()) {
                  <button hlmBtn size="sm" type="button" [disabled]="salvando() === amb" (click)="gravar(amb)">Salvar {{ amb }}</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PoliticaAbaComponent {
  readonly politicas = input.required<Politica[]>();
  readonly podeEditar = input(false);
  readonly erro = input<string | null>(null);
  readonly salvar = input.required<(ambiente: string, pedido: AlterarPoliticaRequest) => Promise<ResultadoComando>>();

  protected readonly ambientes = AMBIENTES;
  protected readonly severidades = SEVERIDADES;
  protected readonly salvando = signal<string | null>(null);
  private readonly edicoes = signal<Record<string, Partial<Linha>>>({});

  /** Piso fixo: fora de `review`, Crítica e Alta ficam em 0 (e o modo em bloqueia). */
  protected travado(ambiente: string, severidade: Severidade): boolean {
    return ambiente !== 'review' && (severidade === 'critica' || severidade === 'alta');
  }

  protected valor(ambiente: string, campo: keyof Linha): string {
    const editado = this.edicoes()[ambiente]?.[campo];
    if (editado !== undefined) return editado;
    const politica = this.politicas().find((p) => p.ambiente === ambiente);
    const bruto = politica?.[campo];
    return bruto === null || bruto === undefined ? '' : String(bruto);
  }

  protected digitar(ambiente: string, campo: keyof Linha, texto: string): void {
    this.edicoes.update((e) => ({ ...e, [ambiente]: { ...e[ambiente], [campo]: texto } }));
  }

  private limite(ambiente: string, severidade: Severidade): number | null {
    const texto = this.valor(ambiente, severidade).trim();
    return texto === '' ? null : Number(texto);
  }

  protected async gravar(ambiente: string): Promise<void> {
    this.salvando.set(ambiente);
    try {
      const resultado = await this.salvar()(ambiente, {
        critica: this.limite(ambiente, 'critica'),
        alta: this.limite(ambiente, 'alta'),
        media: this.limite(ambiente, 'media'),
        baixa: this.limite(ambiente, 'baixa'),
        modo: this.valor(ambiente, 'modo'),
      });
      if (resultado.ok) {
        this.edicoes.update((e) => Object.fromEntries(Object.entries(e).filter(([chave]) => chave !== ambiente)));
      }
    } finally {
      this.salvando.set(null);
    }
  }
}
