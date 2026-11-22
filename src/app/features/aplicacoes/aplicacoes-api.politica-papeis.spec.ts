import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';

describe('[A1] AplicacoesApiService — política e papéis', () => {
  let api: AplicacoesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AplicacoesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('altera a política do ambiente (null = sem limite)', async () => {
    const pedido = { critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' };
    const resultado = api.alterarPolitica('a1', 'hml', pedido);

    const req = http.expectOne('/api/v1/aplicacoes/a1/politicas/hml');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(pedido);
    req.flush({ id: 'po1', ambiente: 'hml', ...pedido });

    expect((await resultado).ambiente).toBe('hml');
  });

  it('busca pessoas pelo texto digitado', async () => {
    const resultado = api.buscarPessoas('ana');

    const req = http.expectOne((r) => r.url === '/api/v1/pessoas');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('busca')).toBe('ana');
    req.flush([{ sub: 's1', nome: 'Ana', email: 'ana@x' }]);

    expect((await resultado)[0].nome).toBe('Ana');
  });

  it('vincula e desvincula papel', async () => {
    const vinculo = api.vincularPapel('a1', { usuario: 's1', papel: 'analista' });
    const post = http.expectOne('/api/v1/aplicacoes/a1/papeis');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ usuario: 's1', papel: 'analista' });
    post.flush({ id: 'pp1', usuario: 's1', papel: 'analista' });
    expect((await vinculo).id).toBe('pp1');

    const remocao = api.desvincularPapel('a1', 'pp1');
    const del = http.expectOne('/api/v1/aplicacoes/a1/papeis/pp1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await remocao;
  });
});
