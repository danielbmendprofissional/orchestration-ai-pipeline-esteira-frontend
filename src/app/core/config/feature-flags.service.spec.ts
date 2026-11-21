import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FeatureFlagsService } from './feature-flags.service';

describe('[A1] FeatureFlagsService', () => {
  let servico: FeatureFlagsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(FeatureFlagsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fica desligado antes de carregar o /features.json', () => {
    expect(servico.isEnabled('A1')).toBe(false);
  });

  it('liga o flag que o /features.json declara true', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').flush({ A1: true });
    await carregamento;

    expect(servico.isEnabled('A1')).toBe(true);
  });

  it('flag ausente do arquivo fica desligado', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').flush({ A1: true });
    await carregamento;

    expect(servico.isEnabled('B2')).toBe(false);
  });

  it('{} desliga tudo', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').flush({});
    await carregamento;

    expect(servico.isEnabled('A1')).toBe(false);
  });

  it('false e valor que não é true literal contam como desligado', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').flush({ A1: false, B2: 'true', C3: 1, D4: null });
    await carregamento;

    expect(['A1', 'B2', 'C3', 'D4'].map((c) => servico.isEnabled(c))).toEqual([false, false, false, false]);
  });

  it('arquivo ausente (404) deixa tudo desligado e não derruba o boot', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').flush('', { status: 404, statusText: 'Not Found' });

    await expect(carregamento).resolves.toBeUndefined();
    expect(servico.isEnabled('A1')).toBe(false);
  });

  it('corpo que não é objeto (HTML do fallback do nginx) deixa tudo desligado', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').flush('<html></html>');
    await carregamento;

    expect(servico.isEnabled('A1')).toBe(false);
  });

  it('falha de rede deixa tudo desligado', async () => {
    const carregamento = servico.carregar();
    http.expectOne('/features.json').error(new ProgressEvent('error'));

    await expect(carregamento).resolves.toBeUndefined();
    expect(servico.isEnabled('A1')).toBe(false);
  });
});
