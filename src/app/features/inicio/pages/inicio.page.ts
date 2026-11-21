import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'est-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-fg">Início</h1>
    <p class="mt-2 text-fg-muted">Olá, {{ auth.usuario()?.nome }}. As telas da Esteira chegam nas próximas fatias.</p>
  `,
})
export class InicioPage {
  protected readonly auth = inject(AuthService);
}
