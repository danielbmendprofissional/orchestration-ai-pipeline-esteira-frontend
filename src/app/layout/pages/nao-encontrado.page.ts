import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'est-nao-encontrado-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-fg">Página não encontrada</h1>
    <p class="mt-2 text-fg-muted">O endereço não existe ou mudou de lugar.</p>
    <a routerLink="/" class="mt-4 inline-block text-brand-fg underline underline-offset-4 hover:text-fg">Voltar ao início</a>
  `,
})
export class NaoEncontradoPage {}
