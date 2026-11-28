import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLock } from '@ng-icons/lucide';
import { AuthService } from '../../../core/auth/auth.service';
import { AuditoriaFiltrosComponent } from '../components/auditoria-filtros.component';
import { AuditoriaGavetaComponent } from '../components/auditoria-gaveta.component';
import { AuditoriaListaComponent } from '../components/auditoria-lista.component';
import { AuditoriaPaginacaoComponent } from '../components/auditoria-paginacao.component';
import { AuditoriaService, TAMANHO_DA_PAGINA, type MudancaDeFiltro, type ParamsDaUrl } from '../auditoria.service';

const igual = (a: ParamsDaUrl, b: ParamsDaUrl) => {
  const ca = Object.keys(a);
  return ca.length === Object.keys(b).length && ca.every((k) => a[k] === b[k]);
};

/**
 * Tela da Auditoria (X1): a URL é a fonte dos filtros (`app`, `quem`, `cat`, `periodo`, `objeto`, `q`) e do registro aberto
 * (`/auditoria/:id`). Só leitura; a lista, os filtros e a gaveta são componentes burros ligados ao serviço de domínio.
 */
@Component({
  selector: 'est-auditoria-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, AuditoriaFiltrosComponent, AuditoriaListaComponent, AuditoriaPaginacaoComponent, AuditoriaGavetaComponent],
  providers: [provideIcons({ lucideLock })],
  template: `
    <section data-testid="auditoria-page" class="flex flex-col gap-4">
      <h1 class="text-3xl font-semibold tracking-tight text-fg">Auditoria</h1>

      <div>
        <est-auditoria-filtros
          [filtro]="auditoria.filtro()"
          [aplicacoes]="auditoria.aplicacoes()"
          [pessoas]="auditoria.pessoas()"
          [categorias]="auditoria.categorias()"
          (filtrar)="filtrar($event)"
          (limparObjeto)="limparObjeto()"
        />
      </div>

      <est-auditoria-lista
        [grupos]="auditoria.grupos()"
        [carregando]="auditoria.carregando()"
        [falhou]="auditoria.falhouAoCarregar()"
        [vazio]="auditoria.vazio()"
        [comFiltro]="auditoria.comFiltro()"
        [avisoDeEscopo]="!ehMor()"
        (abrir)="abrirRegistro($event)"
        (tentarDeNovo)="auditoria.carregar()"
      />

      <est-auditoria-paginacao
        [pagina]="auditoria.pagina()"
        [totalPaginas]="auditoria.totalPaginas()"
        [total]="auditoria.total()"
        [tamanho]="tamanho"
        (irPara)="irParaPagina($event)"
      />

      <p class="flex items-center gap-2 text-2xs text-fg-muted">
        <ng-icon name="lucideLock" size="14" aria-hidden="true" />Registros não podem ser alterados nem apagados.
      </p>

      <est-auditoria-gaveta
        [aberta]="registroAberto() !== null"
        [detalhe]="auditoria.detalhe()"
        [carregando]="auditoria.carregandoDetalhe()"
        [naoEncontrado]="auditoria.detalheNaoEncontrado()"
        [falhou]="auditoria.falhouDetalhe()"
        (fechar)="fecharRegistro()"
        (tentarDeNovo)="tentarDetalheDeNovo()"
      />
    </section>
  `,
})
export class AuditoriaPage {
  protected readonly auditoria = inject(AuditoriaService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly sessao = inject(AuthService);
  private primeira = true;

  protected readonly tamanho = TAMANHO_DA_PAGINA;
  protected readonly registroAberto = signal<string | null>(null);
  /** O MOR vê tudo; os demais, só as Aplicações com papel (o vazio avisa). */
  protected readonly ehMor = computed(() => this.sessao.usuario()?.perfis.includes('mor') ?? false);

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
      this.registroAberto.set(id);
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

  /** O `x` do chip "Só <código>". */
  async limparObjeto(): Promise<void> {
    const carga = this.auditoria.limparObjeto();
    await this.router.navigate([], { relativeTo: this.rota, queryParams: this.auditoria.query() });
    await carga;
  }

  protected irParaPagina(pagina: number): Promise<void> {
    return this.auditoria.irParaPagina(pagina);
  }

  protected tentarDetalheDeNovo(): void {
    const id = this.registroAberto();
    if (id) void this.auditoria.abrir(id);
  }

  /** Abre o registro na gaveta, mantendo os filtros na URL. */
  abrirRegistro(id: string): Promise<boolean> {
    return this.router.navigate(['/auditoria', id], { queryParams: this.auditoria.query() });
  }

  fecharRegistro(): Promise<boolean> {
    return this.router.navigate(['/auditoria'], { queryParams: this.auditoria.query() });
  }
}
