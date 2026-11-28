import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { AuditoriaService } from '../auditoria.service';
import { AuditoriaPage } from './auditoria.page';

describe('[X1] AuditoriaPage (URL ↔ filtros, lista, filtros e gaveta)', () => {
  const filtro = signal<Record<string, unknown>>({ periodoDias: 30 });
  const perfis = signal<string[]>(['mor']);
  const servico = {
    aplicarUrl: vi.fn(async () => undefined),
    abrir: vi.fn(async () => undefined),
    fechar: vi.fn(),
    filtrar: vi.fn(async () => undefined),
    limparObjeto: vi.fn(async () => undefined),
    irParaPagina: vi.fn(async () => undefined),
    carregar: vi.fn(async () => undefined),
    query: vi.fn(() => ({ objeto: 'ENT-7' })),
    filtro, grupos: signal([]), aplicacoes: signal([]), pessoas: signal([]), categorias: signal([]), carregando: signal(false), falhouAoCarregar: signal(false),
    vazio: signal(true), comFiltro: signal(false), pagina: signal(1), total: signal(0), totalPaginas: signal(0), detalhe: signal(null), carregandoDetalhe: signal(false),
    detalheNaoEncontrado: signal(false), falhouDetalhe: signal(false),
  };
  const mocks = [servico.aplicarUrl, servico.abrir, servico.fechar, servico.filtrar, servico.limparObjeto, servico.irParaPagina, servico.carregar];

  beforeEach(() => {
    mocks.forEach((f) => f.mockClear());
    filtro.set({ periodoDias: 30 });
    servico.query.mockReturnValue({ objeto: 'ENT-7' });
    perfis.set(['mor']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auditoria', component: AuditoriaPage },
          { path: 'auditoria/:id', component: AuditoriaPage },
        ]),
        { provide: AuditoriaService, useValue: servico },
        { provide: AuthService, useValue: { usuario: () => ({ perfis: perfis() }) } },
      ],
    });
  });

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('entra pela URL com ?objeto=<código>: repassa os parâmetros ao serviço (critério 15)', async () => {
    await RouterTestingHarness.create('/auditoria?objeto=ENT-7&cat=entrega');

    expect(servico.aplicarUrl).toHaveBeenCalledWith({ objeto: 'ENT-7', cat: 'entrega' });
    expect(servico.abrir).not.toHaveBeenCalled();
  });

  it('/auditoria/:id abre a gaveta; sair do :id a fecha', async () => {
    const harness = await RouterTestingHarness.create('/auditoria/r1');
    expect(servico.abrir).toHaveBeenCalledWith('r1');

    await harness.navigateByUrl('/auditoria');
    expect(servico.fechar).toHaveBeenCalled();
  });

  it('mudar o filtro põe o resultado na URL (voltar funciona) sem carregar duas vezes', async () => {
    const harness = await RouterTestingHarness.create('/auditoria');
    const page = harness.routeDebugElement!.componentInstance as AuditoriaPage;
    servico.aplicarUrl.mockClear();

    await page.filtrar({ objeto: 'ENT-7' });

    expect(servico.filtrar).toHaveBeenCalledWith({ objeto: 'ENT-7' });
    expect(TestBed.inject(Router).url).toBe('/auditoria?objeto=ENT-7');
    expect(servico.aplicarUrl).not.toHaveBeenCalled();
  });

  it('liga lista, filtros e paginação; sem registros mostra o vazio (não erro) e, para o MOR, sem aviso de escopo (critério 16)', async () => {
    const harness = await RouterTestingHarness.create('/auditoria');
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('est-auditoria-filtros')).not.toBeNull();
    expect(el.querySelector('[data-testid="vazio"]')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).not.toContain('em que tem papel');
  });

  it('quem não é MOR vê o aviso de escopo no vazio', async () => {
    perfis.set([]);
    const harness = await RouterTestingHarness.create('/auditoria');
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Você só vê as aplicações em que tem papel');
  });

  it('o x do chip "Só <código>" tira o objeto do filtro e da URL (critério 15)', async () => {
    filtro.set({ periodoDias: 30, objeto: 'ENT-7' });
    servico.query.mockReturnValue({ objeto: 'ENT-7' });
    const harness = await RouterTestingHarness.create('/auditoria?objeto=ENT-7');
    const el = harness.routeNativeElement as HTMLElement;
    servico.query.mockReturnValue({} as never);

    el.querySelector<HTMLButtonElement>('[data-testid="chip-objeto-limpar"]')!.click();
    await harness.fixture.whenStable();

    expect(servico.limparObjeto).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/auditoria');
  });

  it('abrirRegistro leva a /auditoria/:id mantendo os filtros; fecharRegistro volta à lista', async () => {
    const harness = await RouterTestingHarness.create('/auditoria?objeto=ENT-7');
    const page = harness.routeDebugElement!.componentInstance as AuditoriaPage;

    await page.abrirRegistro('r9');
    expect(TestBed.inject(Router).url).toBe('/auditoria/r9?objeto=ENT-7');
    await page.fecharRegistro();
    expect(TestBed.inject(Router).url).toBe('/auditoria?objeto=ENT-7');
  });
});
