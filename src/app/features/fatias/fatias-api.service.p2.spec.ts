import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FatiasApiService } from './fatias-api.service';

const pedidas = { acoes: [{ id: 'x1', tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] };
const aceito = { status: 202, statusText: 'Accepted' };

describe('[P2] FatiasApiService: decisões', () => {
  let api: FatiasApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(FatiasApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('abrirReview é um POST sem corpo em /review e devolve as ações pedidas', async () => {
    const resultado = api.abrirReview('a1', 'P2');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/P2/review');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(pedidas, aceito);
    expect((await resultado).acoes).toHaveLength(1);
  });

  it('aprovar é um POST sem corpo em /aprovar', async () => {
    const resultado = api.aprovar('a1', 'P2');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/P2/aprovar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(pedidas, aceito);
    await resultado;
  });

  it('reprovar manda o comentário no corpo em /reprovar', async () => {
    const resultado = api.reprovar('a1', 'P2', 'Falta teste do <b>erro</b>');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/P2/reprovar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ comentario: 'Falta teste do <b>erro</b>' });
    req.flush(pedidas, aceito);
    await resultado;
  });

  it('codifica o código da Fatia na URL', async () => {
    const resultado = api.aprovar('a1', 'A 1/2');

    http.expectOne('/api/v1/aplicacoes/a1/fatias/A%201%2F2/aprovar').flush(pedidas, aceito);
    await resultado;
  });
});
