import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import type { UsuarioLogado } from '../core/auth/auth-api.service';
import { ICONES_DO_SHELL } from './icones';

/** Cabeçalho: selo do ambiente e menu do usuário (nome, e-mail, perfis, Sair). Sem sino: avisos são da E3b. */
@Component({
  selector: 'est-cabecalho',
  imports: [HlmBadge, HlmButtonImports, HlmDropdownMenuImports, NgIcon],
  providers: [provideIcons(ICONES_DO_SHELL)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header class="border-line flex h-12 items-center justify-end gap-3 border-b px-4 md:px-6">
      <span hlmBadge variant="secondary">{{ ambiente() }}</span>
      <button
        type="button"
        hlmBtn
        variant="ghost"
        class="gap-2 px-2"
        [hlmDropdownMenuTrigger]="menu"
      >
        <ng-icon name="lucideCircleUser" size="18" aria-hidden="true" />
        <span class="sr-only max-w-48 truncate md:not-sr-only">{{ usuario().nome }}</span>
        <ng-icon name="lucideChevronDown" size="14" aria-hidden="true" />
      </button>
    </header>

    <ng-template #menu>
      <div hlmDropdownMenu class="w-64">
        <div hlmDropdownMenuLabel class="flex flex-col gap-0.5">
          <span class="text-fg font-semibold">{{ usuario().nome }}</span>
          <span class="text-fg-muted font-normal">{{ usuario().email }}</span>
          <span class="text-fg-dim font-mono text-2xs font-normal">{{ perfis() }}</span>
        </div>
        <div hlmDropdownMenuSeparator></div>
        <button type="button" hlmDropdownMenuItem (triggered)="sair.emit()">
          <ng-icon name="lucideLogOut" aria-hidden="true" />
          Sair
        </button>
      </div>
    </ng-template>
  `,
})
export class CabecalhoComponent {
  readonly ambiente = input.required<string>();
  readonly usuario = input.required<UsuarioLogado>();
  readonly sair = output<void>();

  protected readonly perfis = computed(() => this.usuario().perfis.join(', ') || 'sem perfil');
}
