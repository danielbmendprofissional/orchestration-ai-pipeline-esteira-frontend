import { AplicacoesApiService as Preview } from './aplicacoes-api.service.preview';

describe('[X3] AplicacoesApiService do preview — teto de custo', () => {
  it('traz duas Aplicações, uma com teto definido e outra no padrão, e MOR pode editar o teto', async () => {
    const preview = new Preview();
    const { itens } = await preview.listar({}, { pagina: 1, tamanho: 20 });

    const [a, b] = await Promise.all(itens.map((i) => preview.obter(i.id!)));

    expect(a.tetoCusto?.tetoCustoUsd).toBeDefined();
    expect(b.tetoCusto?.tetoCustoUsd).toBeUndefined();
    expect(b.tetoCusto?.efetivoUsd).toBe(b.tetoCusto?.padraoUsd);
    expect((await preview.permissoes(a.id!)).podeEditarTetoCusto).toBe(true);
  });

  it('definirTetoCusto guarda o valor e null volta ao padrão, refletido no detalhe', async () => {
    const preview = new Preview();
    const { itens } = await preview.listar({}, { pagina: 1, tamanho: 20 });
    const id = itens[1].id!;

    const definido = await preview.definirTetoCusto(id, 4);
    expect(definido.tetoCustoUsd).toBe(4);
    expect((await preview.obter(id)).tetoCusto?.efetivoUsd).toBe(4);

    const padrao = await preview.definirTetoCusto(id, null);
    expect(padrao.tetoCustoUsd).toBeUndefined();
    expect(padrao.efetivoUsd).toBe(padrao.padraoUsd);
  });
});
