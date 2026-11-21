import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Logo aprovado na D0 (`docs/design/prototipos/logo-cao.html`). Decorativo: o nome "Esteira" vem do texto ao lado. */
@Component({
  selector: 'est-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block size-[30px] shrink-0' },
  template: `
    <svg viewBox="0 0 24 24" class="size-full" aria-hidden="true" focusable="false">
      <polygon points="7.6,4 3,5.2 2,14.6 5.6,11.4" fill="#0A3CB0" />
      <polygon points="7.6,4 5.6,11.4 4.4,6.2" fill="#082F8A" />
      <polygon points="16.4,4 21,5.2 22,14.6 18.4,11.4" fill="#0A3CB0" />
      <polygon points="16.4,4 18.4,11.4 19.6,6.2" fill="#082F8A" />
      <polygon points="7.4,4.2 12,3.6 12,9.6 5.6,9.6" fill="#2D6BFF" />
      <polygon points="16.6,4.2 12,3.6 12,9.6 18.4,9.6" fill="#1F5CF2" />
      <polygon points="5.6,9.6 12,9.6 12,16.2 6.8,15.2" fill="#4C86FF" />
      <polygon points="18.4,9.6 12,9.6 12,16.2 17.2,15.2" fill="#0A4EE4" />
      <polygon points="6.8,15.2 12,16.2 12,20.2 8.6,19.4" fill="#7AA2FF" />
      <polygon points="17.2,15.2 12,16.2 12,20.2 15.4,19.4" fill="#5B8CFF" />
      <polygon points="10.2,16.2 13.8,16.2 12,18.4" fill="#001647" />
      <polygon points="9,11.2 10.1,12.1 9,13 7.9,12.1" fill="#001647" />
      <polygon points="15,11.2 16.1,12.1 15,13 13.9,12.1" fill="#001647" />
    </svg>
  `,
})
export class LogoComponent {}
