import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'est-sem-acesso-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-fg">Sem acesso</h1>
    <p class="mt-2 text-fg-muted">Seu perfil não permite abrir esta página. Se você precisa dela, fale com quem administra a Esteira.</p>
    <a routerLink="/" class="mt-4 inline-block text-brand-fg underline underline-offset-4 hover:text-fg">Voltar ao início</a>
  `,
})
export class SemAcessoPage {}
