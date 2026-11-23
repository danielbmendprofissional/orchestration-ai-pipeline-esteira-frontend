import { FatiasApiService as Real } from './fatias-api.service';
import { FatiasApiService as Preview } from './fatias-api.service.preview';

// O angular.json troca o arquivo no build `preview`; o TypeScript não vê a troca, então este teste segura a superfície.
describe('[P1] FatiasApiService do preview', () => {
  const publicos = (tipo: { prototype: object }) =>
    Object.getOwnPropertyNames(tipo.prototype)
      .filter((nome) => nome !== 'constructor')
      .sort();

  const tudo = { aba: 'todas' } as const;

  it('expõe a mesma superfície pública do serviço real', () => {
    expect(publicos(Preview)).toEqual(publicos(Real));
  });

  it('tem 2 Aplicações e 300 linhas em todos os estados desta fatia, com em correção', async () => {
    const preview = new Preview();

    const lista = await preview.listar(tudo, { pagina: 1, tamanho: 500 });

    expect(lista.total).toBe(300);
    expect(lista.aplicacoes).toHaveLength(2);
    expect(new Set(lista.itens.map((f) => f.estado))).toEqual(
      new Set(['planejada', 'com-spec', 'em-execucao', 'em-revisao', 'pronta-para-entrega']),
    );
    expect(lista.itens.some((f) => f.estado === 'em-revisao' && f.emCorrecao)).toBe(true);
  });

  it('as abas e a paginação respondem como a API', async () => {
    const preview = new Preview();

    const prontas = await preview.listar({ aba: 'prontas' }, { pagina: 1, tamanho: 20 });
    expect(prontas.itens.every((f) => f.estado === 'pronta-para-entrega')).toBe(true);

    const andamento = await preview.listar({ aba: 'andamento' }, { pagina: 1, tamanho: 20 });
    expect(andamento.itens.some((f) => f.estado === 'pronta-para-entrega')).toBe(false);

    const pagina2 = await preview.listar(tudo, { pagina: 2, tamanho: 20 });
    expect(pagina2.pagina).toBe(2);
    expect(pagina2.itens).toHaveLength(20);
    expect(pagina2.totalPaginas).toBe(15);
  });

  it('filtra por Aplicação, Fatia e Projeto', async () => {
    const preview = new Preview();
    const { aplicacoes } = await preview.listar(tudo, { pagina: 1, tamanho: 1 });

    const daPrimeira = await preview.listar({ aba: 'todas', aplicacoes: [aplicacoes[0].id] }, { pagina: 1, tamanho: 500 });
    expect(daPrimeira.total).toBeGreaterThan(0);
    expect(daPrimeira.total).toBeLessThan(300);
    expect(daPrimeira.itens.every((f) => f.aplicacaoId === aplicacoes[0].id)).toBe(true);

    const porFatia = await preview.listar({ aba: 'todas', fatia: 'P1' }, { pagina: 1, tamanho: 500 });
    expect(porFatia.itens.length).toBeGreaterThan(0);
    expect(porFatia.itens.every((f) => f.codigo.includes('P1') || f.titulo.includes('P1'))).toBe(true);

    const front = await preview.listar({ aba: 'todas', projeto: 'frontend' }, { pagina: 1, tamanho: 500 });
    expect(front.itens.every((f) => f.repositorios.includes('frontend'))).toBe(true);
  });

  it('devolve gaveta, hotfixes e atualiza sem chamar API', async () => {
    const preview = new Preview();
    const { itens } = await preview.listar(tudo, { pagina: 1, tamanho: 1 });

    const gaveta = await preview.gaveta(itens[0].aplicacaoId, itens[0].codigo);
    expect(gaveta.codigo).toBe(itens[0].codigo);
    expect(gaveta.repositorios.length).toBeGreaterThan(0);
    expect((await preview.hotfixes(itens[0].aplicacaoId)).itens.length).toBeGreaterThan(0);
    await expect(preview.atualizar(itens[0].aplicacaoId)).resolves.toBeUndefined();
  });

  it('texto com marcação do GitLab fica como está nos dados (a tela o mostra como texto)', async () => {
    const preview = new Preview();

    const { itens } = await preview.listar(tudo, { pagina: 1, tamanho: 500 });

    expect(itens.some((f) => f.titulo.includes('<'))).toBe(true);
  });
});
