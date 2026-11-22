import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert } from '@ng-icons/lucide';
import { RouterLink } from '@angular/router';
import type { AvisoDoPainel } from '../fatias.tipos';

/** Avisos por Aplicação (sem workspace, bot não configurado, GitLab fora). A mensagem vem da API e entra só por interpolação. */
@Component({
  selector: 'est-fatias-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, RouterLink],
  providers: [provideIcons({ lucideTriangleAlert })],
  template: `
    @if (avisos().length) {
      <ul class="flex flex-col gap-2" aria-label="Avisos por Aplicação">
        @for (a of avisos(); track a.aplicacaoId + a.codigo) {
          <li
            data-testid="aviso"
            [attr.data-codigo]="a.codigo"
            class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-run-line bg-run-soft px-3.5 py-2.5 text-sm text-fg-2"
          >
            <ng-icon name="lucideTriangleAlert" size="16" class="text-run-fg" aria-hidden="true" />
            <strong class="font-semibold text-fg">{{ a.aplicacao }}</strong>
            <span>{{ a.mensagem }}</span>
            @if (a.codigo === 'painel.sem-workspace') {
              <a class="text-brand-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg" [routerLink]="['/aplicacoes', a.aplicacaoId]">Cadastrar workspace</a>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class FatiasAvisosComponent {
  readonly avisos = input.required<AvisoDoPainel[]>();
}
