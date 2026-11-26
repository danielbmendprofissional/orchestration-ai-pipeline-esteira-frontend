import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FatiasApiService } from './fatias-api.service';

describe('[P2b] FatiasApiService: reexecutar', () => {
  it('é um POST sem corpo em /acoes/{acaoId}/reexecutar e devolve as ações pedidas', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(FatiasApiService);
    const http = TestBed.inject(HttpTestingController);

    const resultado = api.reexecutar('a1', 'P2b', 'x1');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/P2b/acoes/x1/reexecutar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ acoes: [{ id: 'x2', tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] }, { status: 202, statusText: 'Accepted' });
    expect((await resultado).acoes[0].id).toBe('x2');
    http.verify();
  });
});
