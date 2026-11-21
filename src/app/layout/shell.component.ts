import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { AppConfigService } from '../core/config/app-config.service';
import { CabecalhoComponent } from './cabecalho.component';
import { MenuLateralComponent } from './menu-lateral.component';
import { itensDeMenu } from './menu';

/**
 * Casca do app (DESIGN.md, Layout): menu lateral + cabeçalho + conteúdo até 1680 px, sem rolagem lateral de
 * 2560 a 320 px. Sem regra de negócio: o menu sai dos metadados das rotas e o usuário vem da sessão.
 */
@Component({
  selector: 'est-shell',
  imports: [RouterOutlet, MenuLateralComponent, CabecalhoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#conteudo"
      class="focus:bg-brand sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-white"
      (click)="irParaConteudo($event, conteudo)"
      >Pular para o conteúdo</a
    >
    <div class="grid min-h-dvh grid-cols-1 md:grid-cols-[4rem_minmax(0,1fr)] rail:grid-cols-[15rem_minmax(0,1fr)]">
      <est-menu-lateral [itens]="itens()" />
      <div class="flex min-w-0 flex-col">
        @if (auth.usuario(); as usuario) {
          <est-cabecalho [ambiente]="ambiente" [usuario]="usuario" (sair)="auth.sair()" />
        }
        <main
          #conteudo
          id="conteudo"
          tabindex="-1"
          class="mx-auto w-full max-w-content min-w-0 flex-1 px-4 py-6 outline-none md:px-6"
        >
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly ambiente = inject(AppConfigService).config().ambiente;

  protected readonly itens = computed(() => itensDeMenu(this.router.config, this.auth.usuario()?.perfis ?? []));

  /** Âncora `#conteudo` sozinha mexeria na URL do roteador; aqui só o foco vai para o `main`. */
  protected irParaConteudo(evento: Event, conteudo: HTMLElement): void {
    evento.preventDefault();
    conteudo.focus();
  }
}
