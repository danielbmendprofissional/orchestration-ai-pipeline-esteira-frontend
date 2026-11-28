import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuditoriaApiService } from './auditoria-api.service';
import { AuditoriaService, TAMANHO_DA_PAGINA, destinoDoObjeto } from './auditoria.service';
import type { RegistroDetalhe, RegistroDaLista } from './auditoria.tipos';

const registro = (id: string, quando: string, extra: Partial<RegistroDaLista> = {}): RegistroDaLista => ({
  id, quando, quem: { nome: 'Ana', origem: 'tela' }, categoria: 'cadastro', verbo: 'alterou',
  objeto: { codigo: 'VLT', nome: 'Valuto', entidade: 'Aplicacao', entidadeId: 'e1' }, autoaprovacao: false, resumoMudancas: '1 campo', ...extra,
});
const pagina = (itens: RegistroDaLista[], extra = {}) => ({ itens, total: itens.length, totalPaginas: itens.length ? 1 : 0, pagina: 1, tamanho: 12, ...extra });

describe('[X1] AuditoriaService', () => {
  let api: Record<'listar' | 'categorias' | 'filtros' | 'detalhe', ReturnType<typeof vi.fn>>;
  let servico: AuditoriaService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 28, 15, 0, 0));
    api = {
      listar: vi.fn(async () => pagina([])),
      categorias: vi.fn(async () => []),
      filtros: vi.fn(async () => ({ aplicacoes: [{ id: 'a1', nome: 'Valuto' }], pessoas: [{ id: '@bot', nome: 'Bot da Esteira' }] })),
      detalhe: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuditoriaApiService, useValue: api }] });
    servico = TestBed.inject(AuditoriaService);
  });

  afterEach(() => vi.useRealTimers());

  it('sem URL, carrega 30 dias, página 1 de 12, e as opções dos seletores', async () => {
    await servico.aplicarUrl({});

    expect(TAMANHO_DA_PAGINA).toBe(12);
    expect(api.listar).toHaveBeenCalledWith({ periodoDias: 30 }, { pagina: 1, tamanho: 12 });
    expect(api.categorias).toHaveBeenCalledWith({ periodoDias: 30 });
    expect(servico.aplicacoes()).toEqual([{ id: 'a1', nome: 'Valuto' }]);
    expect(servico.pessoas().map((p) => p.id)).toEqual(['@bot']);
    expect(servico.query()).toEqual({});
  });

  it('lê os filtros da URL (app, quem, cat, periodo, objeto, q) e os devolve na mesma forma', async () => {
    await servico.aplicarUrl({ app: 'a1', quem: '@bot', cat: 'entrega', periodo: '90', objeto: 'ENT-7', q: 'teto' });

    expect(api.listar).toHaveBeenCalledWith(
      { aplicacaoId: 'a1', quem: '@bot', categoria: 'entrega', periodoDias: 90, objeto: 'ENT-7', busca: 'teto' },
      { pagina: 1, tamanho: 12 },
    );
    expect(servico.query()).toEqual({ app: 'a1', quem: '@bot', cat: 'entrega', periodo: '90', objeto: 'ENT-7', q: 'teto' });
    expect(servico.comFiltro()).toBe(true);
  });

  it('periodo=tudo não manda período; valor inválido volta ao padrão de 30 dias', async () => {
    await servico.aplicarUrl({ periodo: 'tudo' });
    expect(api.listar).toHaveBeenLastCalledWith({ periodoDias: null }, expect.anything());
    expect(servico.query()).toEqual({ periodo: 'tudo' });

    await servico.aplicarUrl({ periodo: '45' });
    expect(api.listar).toHaveBeenLastCalledWith({ periodoDias: 30 }, expect.anything());
  });

  it('só o objeto na URL: o chip "Só <código>" sai ao limpar o objeto, que some da URL e recarrega', async () => {
    await servico.aplicarUrl({ objeto: 'ENT-7', cat: 'entrega' });
    expect(servico.filtro().objeto).toBe('ENT-7');

    await servico.limparObjeto();

    expect(servico.filtro().objeto).toBeUndefined();
    expect(servico.query()).toEqual({ cat: 'entrega' });
    expect(api.listar).toHaveBeenLastCalledWith({ categoria: 'entrega', periodoDias: 30 }, { pagina: 1, tamanho: 12 });
  });

  it('mudar filtro volta à página 1; a página e o filtro vão juntos na consulta', async () => {
    await servico.aplicarUrl({});
    await servico.irParaPagina(3);
    expect(api.listar).toHaveBeenLastCalledWith({ periodoDias: 30 }, { pagina: 3, tamanho: 12 });

    await servico.filtrar({ categoria: 'excecao', busca: '  ' });

    expect(servico.pagina()).toBe(1);
    expect(api.listar).toHaveBeenLastCalledWith({ categoria: 'excecao', periodoDias: 30 }, { pagina: 1, tamanho: 12 });
    expect(api.categorias).toHaveBeenLastCalledWith({ categoria: 'excecao', periodoDias: 30 });
  });

  it('agrupa por dia: Hoje, Ontem e a data, na ordem em que a API devolveu', async () => {
    api.listar.mockResolvedValue(pagina([
      registro('1', new Date(2026, 10, 28, 14, 0).toISOString()),
      registro('2', new Date(2026, 10, 28, 9, 0).toISOString()),
      registro('3', new Date(2026, 10, 27, 22, 0).toISOString()),
      registro('4', new Date(2026, 10, 20, 8, 0).toISOString()),
    ]));

    await servico.aplicarUrl({});

    expect(servico.grupos().map((g) => [g.rotulo, g.registros.map((r) => r.id)])).toEqual([
      ['Hoje', ['1', '2']],
      ['Ontem', ['3']],
      ['20/11/2026', ['4']],
    ]);
  });

  it('sem registros é estado vazio (não erro); com filtro o vazio é "nada com esses filtros"', async () => {
    await servico.aplicarUrl({});

    expect(servico.vazio()).toBe(true);
    expect(servico.falhouAoCarregar()).toBe(false);
    expect(servico.comFiltro()).toBe(false);

    await servico.filtrar({ busca: 'xyz' });
    expect(servico.vazio()).toBe(true);
    expect(servico.comFiltro()).toBe(true);
  });

  it('falha ao carregar vira falhouAoCarregar, nunca vazio', async () => {
    api.listar.mockRejectedValue(new HttpErrorResponse({ status: 500 }));

    await servico.aplicarUrl({});

    expect(servico.falhouAoCarregar()).toBe(true);
    expect(servico.vazio()).toBe(false);
  });

  it('as contagens por categoria vêm de /categorias e total vira número', async () => {
    api.categorias.mockResolvedValue([{ categoria: 'entrega', total: '4' }, { categoria: 'cadastro', total: 2 }]);

    await servico.aplicarUrl({});

    expect(servico.categorias()).toEqual([{ categoria: 'entrega', total: 4 }, { categoria: 'cadastro', total: 2 }]);
  });

  it('gaveta: abrir carrega o detalhe; 404 vira não encontrado; fechar limpa', async () => {
    const detalhe = { ...registro('d1', '2026-11-28T10:00:00Z'), mudancas: [{ campo: 'nome', antes: 'A', depois: 'B' }] } as RegistroDetalhe;
    api.detalhe.mockResolvedValueOnce(detalhe);

    await servico.abrir('d1');
    expect(servico.detalhe()?.mudancas).toHaveLength(1);

    servico.fechar();
    expect(servico.detalhe()).toBeNull();

    api.detalhe.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 404, error: { errors: [{ code: 'auditoria.nao-encontrado', message: 'm', type: 'NotFound' }] } }),
    );
    await servico.abrir('x');
    expect(servico.detalhe()).toBeNull();
    expect(servico.detalheNaoEncontrado()).toBe(true);
  });

  it('o botão "Abrir <código>" leva à tela do objeto; entidade sem tela conhecida não tem destino', () => {
    const objeto = (entidade: string) => ({ codigo: 'C', nome: null, entidade, entidadeId: 'id-1' });

    expect(destinoDoObjeto(objeto('Aplicacao'))).toEqual(['/aplicacoes', 'id-1']);
    expect(destinoDoObjeto(objeto('Entrega'))).toEqual(['/entregas', 'id-1']);
    expect(destinoDoObjeto(objeto('Fatia'))).toEqual(['/fatias']);
    expect(destinoDoObjeto(objeto('Destino'))).toBeNull();
  });
});
