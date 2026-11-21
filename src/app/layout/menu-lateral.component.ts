import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '../shared/ui/logo/logo.component';
import { ICONES_DO_SHELL } from './icones';
import type { ItemMenu } from './menu';

/**
 * Menu lateral (DESIGN.md, Layout): 240 px com texto; abaixo de 1100 px vira coluna de ícones de 64 px;
 * abaixo de 760 px vira barra no topo. Só ícones não é só visual: o rótulo continua no DOM (`sr-only`).
 */
@Component({
  selector: 'est-menu-lateral',
  imports: [RouterLink, RouterLinkActive, NgIcon, LogoComponent],
  providers: [provideIcons(ICONES_DO_SHELL)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav
      aria-label="Principal"
      class="bg-rail border-line sticky top-0 z-10 flex items-center gap-1 border-b px-3 py-2 md:h-dvh md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-2.5 md:py-4 rail:px-3"
    >
      <a
        routerLink="/"
        class="mr-auto flex items-center gap-2.5 rounded-md p-0.5 md:mr-0 md:mb-5 md:justify-center rail:justify-start rail:px-2"
      >
        <est-logo />
        <span class="text-fg sr-only text-lg font-bold tracking-tight rail:not-sr-only">Esteira</span>
      </a>
      <ul class="flex gap-1 md:flex-col">
        @for (item of itens(); track item.caminho) {
          <li>
            <a
              [routerLink]="item.caminho"
              [routerLinkActiveOptions]="{ exact: item.caminho === '/' }"
              routerLinkActive="bg-surface-2 text-white shadow-edge"
              ariaCurrentWhenActive="page"
              [title]="item.rotulo"
              class="text-fg-muted hover:bg-surface-2 hover:text-fg flex h-10 w-11 items-center justify-center gap-2.5 rounded-md rail:w-auto rail:justify-start rail:px-2.5"
            >
              <ng-icon [name]="item.icone" size="16" aria-hidden="true" />
              <span class="sr-only rail:not-sr-only">{{ item.rotulo }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class MenuLateralComponent {
  readonly itens = input.required<ItemMenu[]>();
}
