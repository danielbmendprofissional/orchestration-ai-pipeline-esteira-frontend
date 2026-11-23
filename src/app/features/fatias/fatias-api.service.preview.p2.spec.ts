import { FatiasApiService as Real } from './fatias-api.service';
import { FatiasApiService as Preview } from './fatias-api.service.preview';
import type { FatiaDoPainel } from './fatias.tipos';

const tudo = { aba: 'todas' } as const;
const emRevisao = async (preview: Preview): Promise<FatiaDoPainel[]> =>
  (await preview.listar(tudo, { pagina: 1, tamanho: 500 })).itens.filter((f) => f.estado === 'em-revisao');

describe('[P2] FatiasApiService do preview: decisões', () => {
  it('mantém a mesma superfície pública do serviço real, com as três decisões', () => {
    const publicos = (t: { prototype: object }) => Object.getOwnPropertyNames(t.prototype).filter((n) => n !== 'constructor').sort();

    expect(publicos(Preview)).toEqual(publicos(Real));
    expect(publicos(Preview)).toEqual(expect.arrayContaining(['abrirReview', 'aprovar', 'reprovar']));
  });

  it('tem Fatias Em revisão com CI verde, com CI vermelho, review pedido, review aberto com link, decisão em andamento e api + frontend', async () => {
    const itens = await emRevisao(new Preview());

    expect(itens.some((f) => f.acoes?.podeAprovar.pode)).toBe(true);
    expect(itens.some((f) => f.acoes?.podeAprovar.motivo === 'ci-nao-verde')).toBe(true);
    expect(itens.some((f) => f.review?.estado === 'pedido')).toBe(true);
    expect(itens.some((f) => f.review?.estado === 'aberto' && !!f.review.link)).toBe(true);
    expect(itens.some((f) => f.decisao === 'aprovando')).toBe(true);
    expect(itens.some((f) => f.decisao === 'reprovando')).toBe(true);
    expect(itens.some((f) => f.repositorios.includes('api') && f.repositorios.includes('frontend') && f.acoes?.podeAprovar.pode)).toBe(true);
  });

  it('só as Fatias Em revisão levam os campos de decisão', async () => {
    const todas = (await new Preview().listar(tudo, { pagina: 1, tamanho: 500 })).itens;

    expect(todas.filter((f) => f.estado !== 'em-revisao').every((f) => f.acoes == null && f.decisao == null)).toBe(true);
  });

  it('aprovar muda a decisão da Fatia em memória e devolve uma ação por MR aberta (API primeiro)', async () => {
    const preview = new Preview();
    const f = (await emRevisao(preview)).find((x) => x.acoes?.podeAprovar.pode && x.repositorios.length === 2)!;

    const r = await preview.aprovar(f.aplicacaoId, f.codigo);

    expect(r.acoes.map((a) => a.repositorio)).toEqual(['api', 'frontend']);
    const depois = (await emRevisao(preview)).find((x) => x.aplicacaoId === f.aplicacaoId && x.codigo === f.codigo)!;
    expect(depois.decisao).toBe('aprovando');
  });

  it('reprovar e abrirReview também mudam o estado em memória', async () => {
    const preview = new Preview();
    const [a, b] = (await emRevisao(preview)).filter((x) => x.acoes?.podeReprovar.pode && x.acoes.podeAbrirReview.pode);

    await preview.reprovar(a.aplicacaoId, a.codigo, 'não');
    await preview.abrirReview(b.aplicacaoId, b.codigo);

    const depois = await emRevisao(preview);
    expect(depois.find((x) => x.codigo === a.codigo && x.aplicacaoId === a.aplicacaoId)!.decisao).toBe('reprovando');
    expect(depois.find((x) => x.codigo === b.codigo && x.aplicacaoId === b.aplicacaoId)!.review?.estado).toBe('pedido');
  });

  it('a gaveta traz ações pedidas, e o comentário com marcação fica como texto', async () => {
    const preview = new Preview();
    const f = (await emRevisao(preview)).find((x) => x.decisao === 'reprovando')!;

    const g = await preview.gaveta(f.aplicacaoId, f.codigo);

    expect(g.decisao).toBe('reprovando');
    expect(g.acoes).toBeTruthy();
    expect(g.acoesPedidas?.length).toBeGreaterThan(0);
    expect(g.acoesPedidas!.some((a) => a.tipo === 'reprovar' && /</.test(a.comentario ?? ''))).toBe(true);
  });
});
