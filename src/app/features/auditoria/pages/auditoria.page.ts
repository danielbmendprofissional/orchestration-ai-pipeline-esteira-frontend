import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditoriaService, type MudancaDeFiltro, type ParamsDaUrl } from '../auditoria.service';

const igual = (a: ParamsDaUrl, b: ParamsDaUrl) => {
  const ca = Object.keys(a);
  return ca.length === Object.keys(b).length && ca.every((k) => a[k] === b[k]);
};

/**
 * Tela da Auditoria (X1), parte de integração: a URL é a fonte dos filtros (`app`, `quem`, `cat`, `periodo`, `objeto`, `q`)
 * e do registro aberto (`/auditoria/:id`). A lista, os filtros e a gaveta (visual) entram na X1.6 e usam `auditoria`
 * (o serviço de domínio) e `filtrar`/`abrirRegistro`/`fecharRegistro` daqui.
 */
@Component({
  selector: 'est-auditoria-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section data-testid="auditoria-page"><h1 class="text-3xl font-semibold tracking-tight text-fg">Auditoria</h1></section>`,
})
export class AuditoriaPage {
  protected readonly auditoria = inject(AuditoriaService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private primeira = true;

  constructor() {
    const destruir = inject(DestroyRef);
    this.rota.queryParams.pipe(takeUntilDestroyed(destruir)).subscribe((params) => {
      // Mudança feita por `filtrar` já está carregada: só a URL de fora (link, "voltar") recarrega.
      const mesma = !this.primeira && igual(params, this.auditoria.query());
      this.primeira = false;
      if (!mesma) void this.auditoria.aplicarUrl(params);
    });
    this.rota.paramMap.pipe(takeUntilDestroyed(destruir)).subscribe((params) => {
      const id = params.get('id');
      if (id) void this.auditoria.abrir(id);
      else this.auditoria.fechar();
    });
  }

  /** Muda o filtro e o põe na URL (o "voltar" desfaz). Mantém a gaveta aberta. */
  async filtrar(mudanca: MudancaDeFiltro): Promise<void> {
    const carga = this.auditoria.filtrar(mudanca);
    await this.router.navigate([], { relativeTo: this.rota, queryParams: this.auditoria.query() });
    await carga;
  }

  /** Abre o registro na gaveta, mantendo os filtros na URL. */
  abrirRegistro(id: string): Promise<boolean> {
    return this.router.navigate(['/auditoria', id], { queryParams: this.auditoria.query() });
  }

  fecharRegistro(): Promise<boolean> {
    return this.router.navigate(['/auditoria'], { queryParams: this.auditoria.query() });
  }
}
