import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';
import { AplicacoesService } from './aplicacoes.service';
import type { AplicacaoDetalhe } from './aplicacoes.tipos';

const erroDaApi = (code: string, status = 422) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg da API', type: 'Validation' }] } });
const detalhe = (extra: Partial<AplicacaoDetalhe> = {}): AplicacaoDetalhe => ({
  id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true,
  tetoCusto: { padraoUsd: 2, efetivoUsd: 2 }, ...extra,
});
const permissoes = (podeEditarTetoCusto: boolean) => ({
  podeEditar: true, podeEditarCadastro: true, podeEditarPolitica: true, podeGerenciarPapeis: true, podeEditarTetoCusto,
});

describe('[X3] AplicacoesService — teto de custo', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let servico: AplicacoesService;

  beforeEach(async () => {
    api = {
      obter: vi.fn(async () => detalhe()),
      permissoes: vi.fn(async () => permissoes(true)),
      definirTetoCusto: vi.fn(async (_id: string, v: number | null) => ({ ...(v === null ? {} : { tetoCustoUsd: v }), padraoUsd: 2, efetivoUsd: v ?? 2 })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AplicacoesApiService, useValue: api }] });
    servico = TestBed.inject(AplicacoesService);
    await servico.carregarDetalhe('a1');
  });

  it('expõe podeEditarTetoCusto como a API devolveu, sem regra de papel no front', async () => {
    expect(servico.podeEditarTetoCusto()).toBe(true);

    api['permissoes'].mockResolvedValue(permissoes(false));
    await servico.carregarDetalhe('a1');

    expect(servico.podeEditarTetoCusto()).toBe(false);
  });

  it('podeEditarTetoCusto é falso antes das permissões chegarem', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: AplicacoesApiService, useValue: api }] });

    expect(TestBed.inject(AplicacoesService).podeEditarTetoCusto()).toBe(false);
  });

  it('guarda o teto devolvido pela API no detalhe depois do 200', async () => {
    const r = await servico.definirTetoCusto('a1', 3.5);

    expect(api['definirTetoCusto']).toHaveBeenCalledWith('a1', 3.5);
    expect(r).toEqual({ ok: true });
    expect(servico.detalhe()?.tetoCusto).toEqual({ tetoCustoUsd: 3.5, padraoUsd: 2, efetivoUsd: 3.5 });
  });

  it('usar o padrão manda null e o detalhe fica sem tetoCustoUsd', async () => {
    api['obter'].mockResolvedValue(detalhe({ tetoCusto: { tetoCustoUsd: 3.5, padraoUsd: 2, efetivoUsd: 3.5 } }));
    await servico.carregarDetalhe('a1');

    const r = await servico.definirTetoCusto('a1', null);

    expect(api['definirTetoCusto']).toHaveBeenCalledWith('a1', null);
    expect(r).toEqual({ ok: true });
    expect(servico.detalhe()?.tetoCusto).toEqual({ padraoUsd: 2, efetivoUsd: 2 });
  });

  it.each([
    ['aplicacao.teto-invalido', 422, /0,10.*50,00|duas casas/i],
    ['aplicacao.conflito-de-gravacao', 409, /outra pessoa|atualize|recarregue/i],
  ])('recusa %s ligada ao campo tetoCusto, em pt-BR, sem mexer no detalhe', async (codigo, status, texto) => {
    api['definirTetoCusto'].mockRejectedValue(erroDaApi(codigo, status));

    const r = await servico.definirTetoCusto('a1', 99);

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.campo).toBe('tetoCusto');
      expect(r.mensagem).toMatch(texto);
      expect(r.mensagem).not.toBe('msg da API');
    }
    expect(servico.detalhe()?.tetoCusto).toEqual({ padraoUsd: 2, efetivoUsd: 2 });
  });
});
