import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';
import { AplicacoesService } from './aplicacoes.service';
import type { AplicacaoDetalhe } from './aplicacoes.tipos';

const erroDaApi = (code: string, status = 422) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg da API', type: 'Validation' }] } });
const detalhe = (extra: Partial<AplicacaoDetalhe> = {}): AplicacaoDetalhe => ({ id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true, ...extra });
const projeto = { projetoGitLabId: 9, caminho: 'valuto/workspace', nome: 'workspace', cadastrado: false, stackSugerida: null };

describe('[P1] AplicacoesService — workspace', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let servico: AplicacoesService;

  beforeEach(async () => {
    api = {
      obter: vi.fn(async () => detalhe()),
      permissoes: vi.fn(async () => ({ podeEditar: true, podeEditarCadastro: true, podeEditarPolitica: true, podeGerenciarPapeis: true })),
      definirWorkspace: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AplicacoesApiService, useValue: api }] });
    servico = TestBed.inject(AplicacoesService);
    await servico.carregarDetalhe('a1');
  });

  it('guarda o projeto escolhido (id e caminho) no detalhe depois do 204', async () => {
    const r = await servico.definirWorkspace('a1', projeto);

    expect(api['definirWorkspace']).toHaveBeenCalledWith('a1', 9);
    expect(r).toEqual({ ok: true });
    expect(servico.detalhe()?.workspace).toEqual({ projetoGitLabId: 9, caminho: 'valuto/workspace' });
  });

  it('limpar manda null e tira o workspace do detalhe', async () => {
    api['obter'].mockResolvedValue(detalhe({ workspace: { projetoGitLabId: 9, caminho: 'valuto/workspace' } }));
    await servico.carregarDetalhe('a1');

    const r = await servico.definirWorkspace('a1', null);

    expect(api['definirWorkspace']).toHaveBeenCalledWith('a1', null);
    expect(r).toEqual({ ok: true });
    expect(servico.detalhe()?.workspace).toBeFalsy();
  });

  it.each([
    ['aplicacao.workspace-fora-do-grupo', 422, /grupo/i],
    ['aplicacao.workspace-e-projeto', 409, /projeto/i],
    ['aplicacao.workspace-nao-encontrado', 400, /encontrad/i],
    ['gitlab.grupo-nao-encontrado', 422, /gitlab|bot/i],
    ['gitlab.indisponivel', 422, /gitlab/i],
  ])('recusa %s ligada ao campo workspace, em pt-BR, sem mexer no detalhe', async (codigo, status, texto) => {
    api['definirWorkspace'].mockRejectedValue(erroDaApi(codigo, status));

    const r = await servico.definirWorkspace('a1', projeto);

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.campo).toBe('workspace');
      expect(r.mensagem).toMatch(texto);
      expect(r.mensagem).not.toBe('msg da API');
    }
    expect(servico.detalhe()?.workspace).toBeFalsy();
  });
});
