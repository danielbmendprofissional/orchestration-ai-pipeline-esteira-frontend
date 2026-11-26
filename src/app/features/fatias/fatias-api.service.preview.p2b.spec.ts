import { FatiasApiService as Real } from './fatias-api.service';
import { FatiasApiService as Preview } from './fatias-api.service.preview';
import type { FatiaDoPainel } from './fatias.tipos';

const emRevisao = async (preview: Preview): Promise<FatiaDoPainel[]> =>
  (await preview.listar({ aba: 'todas' }, { pagina: 1, tamanho: 500 })).itens.filter((f) => f.estado === 'em-revisao');

describe('[P2b] FatiasApiService do preview: reexecutar', () => {
  it('mantém a superfície pública do serviço real, agora com reexecutar', () => {
    const publicos = (t: { prototype: object }) => Object.getOwnPropertyNames(t.prototype).filter((n) => n !== 'constructor').sort();

    expect(publicos(Preview)).toEqual(publicos(Real));
    expect(publicos(Preview)).toContain('reexecutar');
  });

  it('tem uma Fatia com Ação falhou reexecutável e outra com a Ação já reexecutada em andamento', async () => {
    const preview = new Preview();
    const itens = await emRevisao(preview);
    const gavetas = await Promise.all(itens.map((f) => preview.gaveta(f.aplicacaoId, f.codigo)));

    const comFalha = gavetas.find((g) => g.acoesPedidas?.some((a) => a.estado === 'falhou' && a.podeReexecutar.pode));
    expect(comFalha).toBeTruthy();
    const reexecutada = gavetas.find((g) => g.acoesPedidas?.some((a) => a.estado === 'falhou' && !a.podeReexecutar.pode) && g.acoesPedidas.some((a) => a.estado === 'pedida'));
    expect(reexecutada).toBeTruthy();
  });

  it('reexecutar cria a Ação nova em andamento, tira a permissão da falhada e põe a decisão em andamento', async () => {
    const preview = new Preview();
    const itens = await emRevisao(preview);
    const g = (await Promise.all(itens.map((f) => preview.gaveta(f.aplicacaoId, f.codigo)))).find((x) =>
      x.acoesPedidas?.some((a) => a.estado === 'falhou' && a.podeReexecutar.pode),
    )!;
    const falhada = g.acoesPedidas!.find((a) => a.estado === 'falhou' && a.podeReexecutar.pode)!;

    const r = await preview.reexecutar(g.aplicacaoId, g.codigo, falhada.id);

    expect(r.acoes).toHaveLength(1);
    expect(r.acoes[0].estado).toBe('pedida');
    const depois = await preview.gaveta(g.aplicacaoId, g.codigo);
    expect(depois.acoesPedidas!.find((a) => a.id === falhada.id)!.podeReexecutar.pode).toBe(false);
    expect(depois.acoesPedidas!.some((a) => a.id === r.acoes[0].id && a.estado === 'pedida')).toBe(true);
    expect(depois.decisao).not.toBe('nenhuma');
  });
});
