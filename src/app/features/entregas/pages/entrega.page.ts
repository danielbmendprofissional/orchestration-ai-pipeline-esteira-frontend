import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntregasService } from '../entregas.service';

/**
 * Página mínima (E1b.5): só liga o serviço de estado à rota. A faixa por Fluxo, o painel da Etapa e o indicador
 * "Ao vivo" são da E1b.6 e leem `entregas.entrega()`, `etapaAberta()` e `estadoTempoReal()`.
 */
@Component({
  selector: 'est-entrega-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section data-testid="entrega-page"></section>`,
})
export class EntregaPage implements OnDestroy {
  protected readonly entregas = inject(EntregasService);
  private readonly rota = inject(ActivatedRoute);

  constructor() {
    this.rota.paramMap.subscribe((p) => {
      const id = p.get('id');
      if (id) void this.entregas.acompanhar(id);
    });
  }

  ngOnDestroy(): void {
    this.entregas.parar();
  }
}
