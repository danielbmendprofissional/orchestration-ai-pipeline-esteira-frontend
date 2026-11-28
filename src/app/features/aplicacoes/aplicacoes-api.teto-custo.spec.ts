import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';

describe('[X3] AplicacoesApiService — teto de custo', () => {
  let api: AplicacoesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AplicacoesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('define o teto com PUT {tetoCustoUsd} e devolve o teto com padrão e efetivo', async () => {
    const resultado = api.definirTetoCusto('a1', 3.5);

    const req = http.expectOne('/api/v1/aplicacoes/a1/teto-custo');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ tetoCustoUsd: 3.5 });
    req.flush({ tetoCustoUsd: 3.5, padraoUsd: 2, efetivoUsd: 3.5 });

    await expect(resultado).resolves.toEqual({ tetoCustoUsd: 3.5, padraoUsd: 2, efetivoUsd: 3.5 });
  });

  it('volta ao padrão mandando tetoCustoUsd null e lê a resposta sem tetoCustoUsd', async () => {
    const resultado = api.definirTetoCusto('a1', null);

    const req = http.expectOne('/api/v1/aplicacoes/a1/teto-custo');
    expect(req.request.body).toEqual({ tetoCustoUsd: null });
    req.flush({ padraoUsd: 2, efetivoUsd: 2 });

    const teto = await resultado;
    expect(teto.tetoCustoUsd).toBeUndefined();
    expect(teto.efetivoUsd).toBe(2);
  });
});
