import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';

/** Só hospeda as rotas (o shell mora na rota raiz) e o toaster dos avisos de erro. */
@Component({
  selector: 'est-root',
  imports: [RouterOutlet, HlmToaster],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
