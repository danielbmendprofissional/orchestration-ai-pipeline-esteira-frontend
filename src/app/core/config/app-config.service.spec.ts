import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppConfigService } from './app-config.service';

describe('[F0] AppConfigService', () => {
  let servico: AppConfigService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(AppConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega /config.json no boot e expõe o ambiente', async () => {
    const carregamento = servico.carregar();

    http.expectOne('/config.json').flush({ ambiente: 'HML' });
    await carregamento;

    expect(servico.config().ambiente).toBe('HML');
  });

  it('falha o boot quando o /config.json não responde', async () => {
    const carregamento = servico.carregar();

    http.expectOne('/config.json').flush('', { status: 404, statusText: 'Not Found' });

    await expect(carregamento).rejects.toThrow();
  });

  it('não deixa ler a configuração antes de carregar', () => {
    expect(() => servico.config()).toThrow(/não carregada/);
  });
});
