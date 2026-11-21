import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { AppConfigService } from './core/config/app-config.service';

// Casca provisória do bootstrap (F0): o layout de verdade nasce na F0.5, depois do design (D0).
@Component({
  selector: 'est-root',
  imports: [RouterOutlet, HlmBadge, HlmToaster],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly ambiente = inject(AppConfigService).config().ambiente;
}
