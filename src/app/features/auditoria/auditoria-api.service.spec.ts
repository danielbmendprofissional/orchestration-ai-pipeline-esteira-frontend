import { TestBed } from '@angular/core/testing';
import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditoriaApiService } from './auditoria-api.service';

const cabecalhos = (pagina: number, total: number, paginas: number) =>
  new HttpHeaders({ 'X-Page': String(pagina), 'X-Page-Size': '12', 'X-Total-Count': String(total), 'X-Total-Pages': String(paginas) });

describe('[X1] AuditoriaApiService', () => {
  let api: AuditoriaApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuditoriaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista com os filtros na query e a página nos headers, e lê a paginação dos headers de resposta', async () => {
    const resultado = api.listar(
      { aplicacaoId: 'a1', quem: '@bot', categoria: 'entrega', periodoDias: 7, objeto: 'ENT-1', busca: 'teto', sort: 'quando', order: 'desc' },
      { pagina: 2, tamanho: 12 },
    );

    const req = http.expectOne((r) => r.url === '/api/v1/auditoria');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Page')).toBe('2');
    expect(req.request.headers.get('X-Page-Size')).toBe('12');
    expect(req.request.params.get('aplicacaoId')).toBe('a1');
    expect(req.request.params.get('quem')).toBe('@bot');
    expect(req.request.params.get('categoria')).toBe('entrega');
    expect(req.request.params.get('periodoDias')).toBe('7');
    expect(req.request.params.get('objeto')).toBe('ENT-1');
    expect(req.request.params.get('busca')).toBe('teto');
    expect(req.request.params.get('sort')).toBe('quando');
    expect(req.request.params.get('order')).toBe('desc');
    req.flush([], { headers: cabecalhos(2, 13, 2) });

    expect(await resultado).toEqual({ itens: [], total: 13, totalPaginas: 2, pagina: 2, tamanho: 12 });
  });

  it('período "tudo" (null) e filtros vazios não vão na query', async () => {
    const resultado = api.listar({ periodoDias: null, busca: '' }, { pagina: 1, tamanho: 12 });

    const req = http.expectOne((r) => r.url === '/api/v1/auditoria');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([], { headers: cabecalhos(1, 0, 0) });
    await resultado;
  });

  it('header de paginação ausente é erro, não lista vazia', async () => {
    const resultado = api.listar({}, { pagina: 1, tamanho: 12 });

    http.expectOne((r) => r.url === '/api/v1/auditoria').flush([]);

    await expect(resultado).rejects.toThrow(/paginação/);
  });

  it('as categorias usam os mesmos filtros, sem a categoria', async () => {
    const resultado = api.categorias({ aplicacaoId: 'a1', categoria: 'entrega', periodoDias: 30 });

    const req = http.expectOne((r) => r.url === '/api/v1/auditoria/categorias');
    expect(req.request.params.get('aplicacaoId')).toBe('a1');
    expect(req.request.params.get('periodoDias')).toBe('30');
    expect(req.request.params.has('categoria')).toBe(false);
    req.flush([{ categoria: 'entrega', total: 3 }]);

    expect(await resultado).toEqual([{ categoria: 'entrega', total: 3 }]);
  });

  it('filtros e detalhe vão cada um à sua rota', async () => {
    const filtros = api.filtros();
    http.expectOne('/api/v1/auditoria/filtros').flush({ aplicacoes: [], pessoas: [] });
    expect(await filtros).toEqual({ aplicacoes: [], pessoas: [] });

    const detalhe = api.detalhe('id/1');
    const req = http.expectOne('/api/v1/auditoria/id%2F1');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'id/1', mudancas: [] });
    expect((await detalhe).id).toBe('id/1');
  });
});
