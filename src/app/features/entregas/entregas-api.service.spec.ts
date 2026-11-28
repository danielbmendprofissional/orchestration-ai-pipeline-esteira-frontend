import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EntregasApiService } from './entregas-api.service';

describe('[E1b] EntregasApiService', () => {
  let api: EntregasApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(EntregasApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lê a Entrega por id com GET e trata campo nulo omitido como null', async () => {
    const resultado = api.obter('e1');

    const req = http.expectOne('/api/v1/entregas/e1');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'e1', aplicacao: { id: 'a1', nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: '2026-11-27T10:00:00Z',
      estado: 'em-andamento',
      fluxos: [{
        id: 'f1', projeto: { id: 'p1', nome: 'api' }, tipoMudanca: 'feature', sha: 'abc1234', fatias: [{ codigo: 'E1b', comFlag: true }],
        etapas: [
          { etapa: 'abertura', estado: 'concluido', atualizadaEm: '2026-11-27T10:00:00Z' },
          { etapa: 'qa', estado: 'pulada', pulada: { por: 'Bia', motivo: 'urgente' }, pipelineUrl: 'https://gl/p/1', atualizadaEm: '2026-11-27T10:01:00Z' },
        ],
      }],
    });

    const entrega = await resultado;
    expect(entrega.vezDe).toBeNull();
    const [abertura, qa] = entrega.fluxos[0].etapas;
    expect(abertura.codigoFalha).toBeNull();
    expect(abertura.pulada).toBeNull();
    expect(abertura.pipelineUrl).toBeNull();
    expect(qa.pulada).toEqual({ por: 'Bia', motivo: 'urgente' });
    expect(qa.pipelineUrl).toBe('https://gl/p/1');
  });

  it('codifica o id na URL', async () => {
    const resultado = api.obter('a/b');

    http.expectOne('/api/v1/entregas/a%2Fb').flush({ fluxos: [], aplicacao: {}, abertaPor: {} });
    await resultado;
  });
});
