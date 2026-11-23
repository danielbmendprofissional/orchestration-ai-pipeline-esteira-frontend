import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FatiasApiService } from './fatias-api.service';

const corpoVazio = { itens: [], pagina: 1, tamanhoPagina: 20, total: 0, totalPaginas: 0, avisos: [], aplicacoes: [], desatualizado: false };

describe('[P1] FatiasApiService', () => {
  let api: FatiasApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(FatiasApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista com aba, filtros, ordenação e os headers de paginação', async () => {
    const resultado = api.listar(
      { aba: 'prontas', fatia: 'P1', projeto: 'api', aplicacoes: ['a1', 'a2'], sort: 'codigo', order: 'desc' },
      { pagina: 3, tamanho: 20 },
    );

    const req = http.expectOne((r) => r.url === '/api/v1/fatias');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Page')).toBe('3');
    expect(req.request.headers.get('X-Page-Size')).toBe('20');
    expect(req.request.params.get('aba')).toBe('prontas');
    expect(req.request.params.get('fatia')).toBe('P1');
    expect(req.request.params.get('projeto')).toBe('api');
    expect(req.request.params.get('aplicacoes')).toBe('a1,a2');
    expect(req.request.params.get('sort')).toBe('codigo');
    expect(req.request.params.get('order')).toBe('desc');
    const corpo = { ...corpoVazio, pagina: 3 };
    req.flush(corpo);

    expect(await resultado).toEqual(corpo);
  });

  it('só manda na query o que foi pedido', async () => {
    const resultado = api.listar({ aba: 'andamento' }, { pagina: 1, tamanho: 20 });

    const req = http.expectOne((r) => r.url === '/api/v1/fatias');
    expect(req.request.params.keys()).toEqual(['aba']);
    req.flush(corpoVazio);
    await resultado;
  });

  it('atualizar é um POST sem corpo que descarta o guardado, e nada mais', async () => {
    const resultado = api.atualizar('a1');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/atualizar');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(resultado).resolves.toBeUndefined();
  });

  it('lê a gaveta da Fatia', async () => {
    const resultado = api.gaveta('a1', 'P1');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/P1');
    expect(req.request.method).toBe('GET');
    req.flush({ aplicacaoId: 'a1', codigo: 'P1' });

    expect((await resultado).codigo).toBe('P1');
  });

  it('lê os pedidos de hotfix da Aplicação', async () => {
    const resultado = api.hotfixes('a1');

    const req = http.expectOne('/api/v1/aplicacoes/a1/hotfixes');
    expect(req.request.method).toBe('GET');
    req.flush({ aplicacaoId: 'a1', itens: [] });

    expect((await resultado).itens).toEqual([]);
  });

  it('codifica o código da Fatia na URL', async () => {
    const resultado = api.gaveta('a1', 'a/b');

    const req = http.expectOne('/api/v1/aplicacoes/a1/fatias/a%2Fb');
    req.flush({});
    await resultado;
  });
});
