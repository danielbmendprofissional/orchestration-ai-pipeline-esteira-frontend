import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';

describe('[P1] AplicacoesApiService — workspace', () => {
  let api: AplicacoesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AplicacoesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('define o workspace com PUT {projetoGitLabId} e aceita 204', async () => {
    const resultado = api.definirWorkspace('a1', 7);

    const req = http.expectOne('/api/v1/aplicacoes/a1/workspace');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ projetoGitLabId: 7 });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(resultado).resolves.toBeUndefined();
  });

  it('limpa o workspace mandando projetoGitLabId null', async () => {
    const resultado = api.definirWorkspace('a1', null);

    const req = http.expectOne('/api/v1/aplicacoes/a1/workspace');
    expect(req.request.body).toEqual({ projetoGitLabId: null });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await resultado;
  });
});
