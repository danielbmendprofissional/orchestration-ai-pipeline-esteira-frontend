import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideMonitor, lucideServer } from '@ng-icons/lucide';
import { rotuloDoProjeto } from '../fatias.apresentacao';
import type { FatiaDoPainel } from '../fatias.tipos';
import { EstadoBadgeComponent } from './estado-badge.component';

/**
 * Lista de Fatias do Painel (só leitura): tabela semântica; a linha inteira abre a gaveta e o botão do código é o
 * alvo de teclado. Todo texto vem do GitLab e entra só por interpolação.
 */
@Component({
  selector: 'est-fatias-tabela',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, EstadoBadgeComponent],
  providers: [provideIcons({ lucideChevronRight, lucideMonitor, lucideServer })],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[44rem] border-collapse text-sm">
        <caption class="sr-only">Fatias do Painel</caption>
        <thead>
          <tr class="h-[38px] bg-surface-2 text-left text-2xs font-semibold text-fg-muted">
            <th scope="col" class="px-5">Fatia</th>
            @if (mostrarAplicacao()) {
              <th scope="col" class="px-3">Aplicação</th>
            }
            <th scope="col" class="px-3">Projeto</th>
            <th scope="col" class="px-3">Risco</th>
            <th scope="col" class="px-3">Estado</th>
            <th scope="col" class="px-3">Progresso</th>
            <th scope="col" class="w-8 px-3"><span class="sr-only">Abrir detalhes</span></th>
          </tr>
        </thead>
        <tbody>
          @for (f of itens(); track f.aplicacaoId + f.codigo) {
            <!-- o clique na linha é só conveniência de mouse; o teclado usa o botão do código -->
            <tr
              data-testid="fatia-linha"
              [attr.data-codigo]="f.codigo"
              class="cursor-pointer border-t border-line align-top hover:bg-surface-2"
              (click)="abrir.emit(f)"
            >
              <td class="px-5 py-3">
                <button
                  type="button"
                  data-testid="fatia-abrir"
                  class="flex flex-wrap items-baseline gap-x-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
                >
                  <span class="font-mono text-xs text-fg-2">{{ f.codigo }}</span>
                  <span class="font-semibold text-fg">{{ f.titulo }}</span>
                </button>
                @if (f.formatoAnterior) {
                  <span class="ml-2 inline-flex items-center rounded-sm border border-line-strong px-1.5 text-2xs text-fg-muted whitespace-nowrap">formato anterior ao padrão</span>
                }
              </td>
              @if (mostrarAplicacao()) {
                <td class="px-3 py-3 text-fg-muted">{{ f.aplicacao }}</td>
              }
              <td class="px-3 py-3">
                <span class="inline-flex gap-1.5">
                  @for (r of f.repositorios; track r) {
                    <span class="inline-flex items-center gap-1 rounded-sm border border-line-strong bg-surface-2 px-1.5 py-0.5 text-2xs text-fg-2">
                      <ng-icon [name]="r === 'frontend' ? 'lucideMonitor' : 'lucideServer'" size="12" aria-hidden="true" />{{ rotulo(r) }}
                    </span>
                  }
                </span>
              </td>
              <td class="px-3 py-3" [class]="f.risco === 'alto' ? 'font-semibold text-run-fg' : 'text-fg-muted'">{{ f.risco ?? '—' }}</td>
              <td class="px-3 py-3"><est-estado-badge [estado]="f.estado" [emCorrecao]="f.emCorrecao" /></td>
              <td class="px-3 py-3 text-fg-muted">{{ f.progresso ?? '' }}</td>
              <td class="px-3 py-3 text-fg-dim"><ng-icon name="lucideChevronRight" size="16" aria-hidden="true" /></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class FatiasTabelaComponent {
  readonly itens = input.required<FatiaDoPainel[]>();
  readonly mostrarAplicacao = input(true);
  readonly abrir = output<FatiaDoPainel>();

  protected rotulo(repositorio: string): string {
    return rotuloDoProjeto(repositorio);
  }
}
