import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';

const destino = { id: 'd1', nome: 'cluster-a', configuracao: { KUBE_CONTEXT: 'a' }, ordem: 1 };

describe('[A1] AplicacoesApiService — projetos, ambientes e destinos', () => {
  let api: AplicacoesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AplicacoesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista os projetos do grupo do GitLab da Aplicação', async () => {
    const resultado = api.projetosDoGrupo('a1');

    const req = http.expectOne('/api/v1/aplicacoes/a1/gitlab/projetos');
    expect(req.request.method).toBe('GET');
    req.flush([{ projetoGitLabId: 7, caminho: 'valuto/api', nome: 'api', cadastrado: false, stackSugerida: 'dotnet' }]);

    expect((await resultado)[0].caminho).toBe('valuto/api');
  });

  it('cadastra um projeto do grupo com a stack escolhida', async () => {
    const resultado = api.cadastrarProjeto('a1', { projetoGitLabId: 7, stack: 'dotnet' });

    const req = http.expectOne('/api/v1/aplicacoes/a1/projetos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ projetoGitLabId: 7, stack: 'dotnet' });
    req.flush({ id: 'p1', nome: 'api' });

    expect((await resultado).id).toBe('p1');
  });

  it('substitui as dependências do projeto', async () => {
    const resultado = api.substituirDependencias('p1', ['p2']);

    const req = http.expectOne('/api/v1/projetos/p1/dependencias');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ dependeDe: ['p2'] });
    req.flush({ id: 'p1', dependeDe: ['p2'] });

    expect((await resultado).dependeDe).toEqual(['p2']);
  });

  it('habilita ou desabilita o ambiente do projeto', async () => {
    const resultado = api.alterarAmbiente('p1', 'hml', false);

    const req = http.expectOne('/api/v1/projetos/p1/ambientes/hml');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ habilitado: false });
    req.flush({ id: 'p1' });

    expect((await resultado).id).toBe('p1');
  });

  it('cria, altera e remove destino no ambiente do projeto', async () => {
    const pedido = { nome: 'cluster-a', configuracao: { KUBE_CONTEXT: 'a' }, ordem: 1 };

    const criado = api.criarDestino('p1', 'hml', pedido);
    const post = http.expectOne('/api/v1/projetos/p1/ambientes/hml/destinos');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(pedido);
    post.flush(destino);
    expect((await criado).id).toBe('d1');

    const alterado = api.alterarDestino('p1', 'hml', 'd1', pedido);
    const put = http.expectOne('/api/v1/projetos/p1/ambientes/hml/destinos/d1');
    expect(put.request.method).toBe('PUT');
    put.flush(destino);
    await alterado;

    const removido = api.removerDestino('p1', 'hml', 'd1');
    const del = http.expectOne('/api/v1/projetos/p1/ambientes/hml/destinos/d1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await removido;
  });
});
