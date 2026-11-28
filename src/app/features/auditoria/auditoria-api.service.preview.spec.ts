import { AuditoriaApiService as Real } from './auditoria-api.service';
import { AuditoriaApiService as Preview } from './auditoria-api.service.preview';

// O angular.json troca o arquivo no build `preview`; o TypeScript não vê a troca, então este teste segura a superfície.
describe('[X1] AuditoriaApiService do preview', () => {
  const publicos = (tipo: { prototype: object }) =>
    Object.getOwnPropertyNames(tipo.prototype).filter((nome) => nome !== 'constructor').sort();

  it('expõe a mesma superfície pública do serviço real', () => {
    expect(publicos(Preview)).toEqual(publicos(Real));
  });

  it('tem registros das oito categorias nas três origens', async () => {
    const lista = await new Preview().listar({ periodoDias: null }, { pagina: 1, tamanho: 500 });

    expect(new Set(lista.itens.map((r) => r.categoria))).toEqual(
      new Set(['aprovacao', 'fatias', 'entrega', 'publicacao', 'excecao', 'politica', 'cadastro', 'papeis']),
    );
    expect(new Set(lista.itens.map((r) => r.quem.origem))).toEqual(new Set(['tela', 'bot', 'pipeline']));
  });

  it('pagina, filtra por objeto e por categoria e devolve a contagem por categoria', async () => {
    const preview = new Preview();
    const tudo = await preview.listar({ periodoDias: null }, { pagina: 1, tamanho: 500 });

    const pagina = await preview.listar({ periodoDias: null }, { pagina: 2, tamanho: 12 });
    expect(pagina.itens).toHaveLength(12);
    expect(pagina.total).toBe(tudo.total);

    const objeto = tudo.itens[0].objeto.codigo;
    const doObjeto = await preview.listar({ periodoDias: null, objeto }, { pagina: 1, tamanho: 500 });
    expect(doObjeto.itens.length).toBeGreaterThan(0);
    expect(doObjeto.itens.every((r) => r.objeto.codigo === objeto)).toBe(true);

    const contagens = await preview.categorias({ periodoDias: null, categoria: 'entrega' });
    expect(contagens.reduce((soma, c) => soma + Number(c.total), 0)).toBe(tudo.total);
  });

  it('detalhe traz antes e depois; id desconhecido é 404 auditoria.nao-encontrado', async () => {
    const preview = new Preview();
    const { itens } = await preview.listar({ periodoDias: null }, { pagina: 1, tamanho: 1 });

    const detalhe = await preview.detalhe(itens[0].id);
    expect(detalhe.mudancas.length).toBeGreaterThan(0);
    await expect(preview.detalhe('nao-existe')).rejects.toMatchObject({ status: 404 });
  });

  it('filtros devolve Aplicações e pessoas, com o bot e as pipelines', async () => {
    const { aplicacoes, pessoas } = await new Preview().filtros();

    expect(aplicacoes.length).toBeGreaterThan(0);
    expect(pessoas.map((p) => p.id)).toEqual(expect.arrayContaining(['@bot', '@pipeline']));
  });
});
