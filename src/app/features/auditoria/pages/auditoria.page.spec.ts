import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuditoriaService } from '../auditoria.service';
import { AuditoriaPage } from './auditoria.page';

describe('[X1] AuditoriaPage (URL ↔ filtros)', () => {
  const servico = {
    aplicarUrl: vi.fn(async () => undefined),
    abrir: vi.fn(async () => undefined),
    fechar: vi.fn(),
    filtrar: vi.fn(async () => undefined),
    query: vi.fn(() => ({ objeto: 'ENT-7' })),
  };

  beforeEach(() => {
    Object.values(servico).forEach((f) => f.mockClear());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auditoria', component: AuditoriaPage },
          { path: 'auditoria/:id', component: AuditoriaPage },
        ]),
        { provide: AuditoriaService, useValue: servico },
      ],
    });
  });

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
});
