import { AplicacoesApiService as Real } from './aplicacoes-api.service';
import { AplicacoesApiService as Preview } from './aplicacoes-api.service.preview';

// Mesmo contrato do auth-api.service.preview.spec: o angular.json troca o arquivo no build `preview`,
// o TypeScript não vê a troca, então este teste segura a superfície pública.
describe('[A1] AplicacoesApiService do preview', () => {
  const publicos = (tipo: { prototype: object }) =>
    Object.getOwnPropertyNames(tipo.prototype)
      .filter((nome) => nome !== 'constructor')
      .sort();

  it('expõe a mesma superfície pública do serviço real', () => {
    expect(publicos(Preview)).toEqual(publicos(Real));
  });

  it('devolve 2 Aplicações falsas, MOR (pode criar e editar), sem chamar API', async () => {
    const preview = new Preview();

    const pagina = await preview.listar({}, { pagina: 1, tamanho: 20 });
    expect(pagina.itens).toHaveLength(2);
    expect(pagina.total).toBe(2);
    expect((await preview.permissoesGlobais()).podeCriar).toBe(true);
    const detalhe = await preview.obter(pagina.itens[0].id!);
    expect(detalhe.nome).toBe(pagina.itens[0].nome);
    expect((await preview.permissoes(detalhe.id!)).podeEditar).toBe(true);
  });

  it('filtra por situação e busca como a API', async () => {
    const preview = new Preview();

    expect((await preview.listar({ ativa: false }, { pagina: 1, tamanho: 20 })).itens).toHaveLength(0);
    expect((await preview.listar({ busca: 'portal' }, { pagina: 1, tamanho: 20 })).itens).toHaveLength(1);
  });
});
