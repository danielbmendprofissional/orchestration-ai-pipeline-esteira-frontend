import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';

const item = { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 3, ativa: true };

describe('[A1] AplicacoesApiService', () => {
  let api: AplicacoesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AplicacoesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista com os headers de paginação e os filtros na query, devolvendo a página lida dos headers', async () => {
    const resultado = api.listar({ busca: 'val', ativa: true, sort: 'nome', order: 'desc' }, { pagina: 2, tamanho: 20 });

    const req = http.expectOne((r) => r.url === '/api/v1/aplicacoes');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Page')).toBe('2');
    expect(req.request.headers.get('X-Page-Size')).toBe('20');
    expect(req.request.params.get('busca')).toBe('val');
    expect(req.request.params.get('ativa')).toBe('true');
    expect(req.request.params.get('sort')).toBe('nome');
    expect(req.request.params.get('order')).toBe('desc');
    req.flush([item], { headers: { 'X-Total-Count': '21', 'X-Total-Pages': '2', 'X-Page': '2', 'X-Page-Size': '20' } });

    expect(await resultado).toEqual({ itens: [item], total: 21, totalPaginas: 2, pagina: 2, tamanho: 20 });
  });

  it('não manda na query o filtro que não foi pedido (todas)', async () => {
    const resultado = api.listar({}, { pagina: 1, tamanho: 20 });

    const req = http.expectOne((r) => r.url === '/api/v1/aplicacoes');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([], { headers: { 'X-Total-Count': '0', 'X-Total-Pages': '0', 'X-Page': '1', 'X-Page-Size': '20' } });
    await resultado;
  });

  it('lê as permissões globais e as da Aplicação', async () => {
    const globais = api.permissoesGlobais();
    http.expectOne('/api/v1/aplicacoes/permissoes').flush({ podeCriar: true });
    expect(await globais).toEqual({ podeCriar: true });

    const da = api.permissoes(item.id);
    http.expectOne(`/api/v1/aplicacoes/${item.id}/permissoes`).flush({
      podeEditar: true,
      podeEditarCadastro: true,
      podeEditarPolitica: false,
      podeGerenciarPapeis: false,
    });
    expect((await da).podeEditar).toBe(true);
  });

  it('obtém o detalhe, cria (POST) e altera (PUT)', async () => {
    const detalhe = api.obter(item.id);
    http.expectOne(`/api/v1/aplicacoes/${item.id}`).flush({ id: item.id, nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true });
    expect((await detalhe).sigla).toBe('VLT');

    const criada = api.criar({ nome: 'Valuto', sigla: 'VLT', grupoGitLab: 'valuto' });
    const post = http.expectOne('/api/v1/aplicacoes');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ nome: 'Valuto', sigla: 'VLT', grupoGitLab: 'valuto' });
    post.flush(item, { status: 201, statusText: 'Created' });
    expect((await criada).id).toBe(item.id);

    const alterada = api.alterar(item.id, { nome: 'Valuto 2', sigla: 'VLT', ativa: false });
    const put = http.expectOne(`/api/v1/aplicacoes/${item.id}`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ nome: 'Valuto 2', sigla: 'VLT', ativa: false });
    put.flush({ ...item, nome: 'Valuto 2', ativa: false });
    expect((await alterada).ativa).toBe(false);
  });
});
