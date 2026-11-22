import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FatiasApiService } from './fatias-api.service';
import { FatiasService } from './fatias.service';
import type { FatiaDoPainel, Gaveta, Hotfixes, PainelLista } from './fatias.tipos';

const fatia = (codigo: string): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo, titulo: `Fatia ${codigo}`, estado: 'com-spec', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'baixo', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
});
const lista = (parcial: Partial<PainelLista> = {}): PainelLista => ({
  itens: [fatia('P1')], pagina: 1, tamanhoPagina: 20, total: 1, totalPaginas: 1, avisos: [],
  aplicacoes: [
    { id: 'a1', nome: 'Valuto', sigla: 'VLT', geradoEm: '2026-11-22T14:05:00Z', desatualizado: false },
    { id: 'a2', nome: 'Portal', sigla: 'PCL', geradoEm: null, desatualizado: false },
  ],
  geradoEm: '2026-11-22T14:05:00Z', desatualizado: false, ...parcial,
});
const erroDaApi = (code: string, status: number) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg', type: 'Validation' }] } });

describe('P1 · FatiasService', () => {
  let api: Record<'listar' | 'atualizar' | 'gaveta' | 'hotfixes', ReturnType<typeof vi.fn>>;
  let servico: FatiasService;

  beforeEach(() => {
    api = {
      listar: vi.fn(async () => lista()),
      atualizar: vi.fn(async () => undefined),
      gaveta: vi.fn(async () => ({ aplicacaoId: 'a1', codigo: 'P1' }) as Gaveta),
      hotfixes: vi.fn(async () => ({ aplicacaoId: 'a1', itens: [], aviso: null }) as Hotfixes),
    };
    TestBed.configureTestingModule({ providers: [{ provide: FatiasApiService, useValue: api }] });
    servico = TestBed.inject(FatiasService);
  });

  it('carrega a aba Em andamento, página 1 de 20, e expõe a lista, avisos e Aplicações', async () => {
    await servico.carregar();

    expect(api.listar).toHaveBeenCalledWith({ aba: 'andamento' }, { pagina: 1, tamanho: 20 });
    expect(servico.itens().map((f) => f.codigo)).toEqual(['P1']);
    expect(servico.total()).toBe(1);
    expect(servico.aplicacoes()).toHaveLength(2);
    expect(servico.carregando()).toBe(false);
    expect(servico.falhouAoCarregar()).toBe(false);
  });

  it('trocar de aba volta para a página 1 e recarrega', async () => {
    await servico.carregar();
    await servico.irParaPagina(4);

    await servico.selecionarAba('prontas');

    expect(api.listar).toHaveBeenLastCalledWith({ aba: 'prontas' }, { pagina: 1, tamanho: 20 });
    expect(servico.aba()).toBe('prontas');
    expect(servico.pagina()).toBe(1);
  });

  it('filtrar por Fatia, Projeto e Aplicações manda tudo na consulta e volta à página 1', async () => {
    await servico.carregar();
    await servico.irParaPagina(3);

    await servico.filtrar({ fatia: ' P1 ', projeto: 'frontend', aplicacoes: ['a2'] });

    expect(api.listar).toHaveBeenLastCalledWith(
      { aba: 'andamento', fatia: 'P1', projeto: 'frontend', aplicacoes: ['a2'] },
      { pagina: 1, tamanho: 20 },
    );
  });

  it('paginação e "Por página" refazem a consulta', async () => {
    await servico.carregar();

    await servico.irParaPagina(2);
    expect(api.listar).toHaveBeenLastCalledWith({ aba: 'andamento' }, { pagina: 2, tamanho: 20 });

    await servico.mudarTamanho(50);
    expect(api.listar).toHaveBeenLastCalledWith({ aba: 'andamento' }, { pagina: 1, tamanho: 50 });
    expect(servico.tamanhoDaPagina()).toBe(50);
  });

  it('ordenar manda sort e order', async () => {
    await servico.ordenar('risco', 'desc');

    expect(api.listar).toHaveBeenLastCalledWith({ aba: 'andamento', sort: 'risco', order: 'desc' }, { pagina: 1, tamanho: 20 });
  });

  it('avisos por Aplicação e o instante dos dados vêm da resposta', async () => {
    api.listar.mockResolvedValue(
      lista({
        avisos: [{ aplicacaoId: 'a2', aplicacao: 'Portal', codigo: 'painel.sem-workspace', mensagem: 'cadastre o workspace' }],
        desatualizado: true,
      }),
    );

    await servico.carregar();

    expect(servico.avisos()[0].codigo).toBe('painel.sem-workspace');
    expect(servico.geradoEm()).toBe('2026-11-22T14:05:00Z');
    expect(servico.desatualizado()).toBe(true);
  });

  it('falha ao carregar marca falhouAoCarregar e mantém a página anterior; tentar de novo limpa', async () => {
    await servico.carregar();
    api.listar.mockRejectedValueOnce(erroDaApi('x', 500));

    await servico.carregar();
    expect(servico.falhouAoCarregar()).toBe(true);
    expect(servico.itens()).toHaveLength(1);

    await servico.carregar();
    expect(servico.falhouAoCarregar()).toBe(false);
  });

  it('só vale a resposta da última consulta', async () => {
    let soltar!: (l: PainelLista) => void;
    api.listar.mockImplementationOnce(() => new Promise<PainelLista>((r) => (soltar = r)));
    const velha = servico.carregar();
    api.listar.mockResolvedValueOnce(lista({ itens: [fatia('NOVA')] }));
    await servico.selecionarAba('todas');

    soltar(lista({ itens: [fatia('VELHA')] }));
    await velha;

    expect(servico.itens().map((f) => f.codigo)).toEqual(['NOVA']);
  });

  describe('Atualizar', () => {
    it('descarta o guardado de cada Aplicação da consulta (só POST) e recarrega', async () => {
      await servico.carregar();

      await servico.atualizar();

      expect(api.atualizar).toHaveBeenCalledTimes(2);
      expect(api.atualizar).toHaveBeenCalledWith('a1');
      expect(api.atualizar).toHaveBeenCalledWith('a2');
      expect(api.listar).toHaveBeenCalledTimes(2);
      expect(servico.atualizacaoRecente()).toBe(false);
    });

    it('com Aplicações filtradas, atualiza só as filtradas', async () => {
      await servico.filtrar({ aplicacoes: ['a2'] });

      await servico.atualizar();

      expect(api.atualizar).toHaveBeenCalledTimes(1);
      expect(api.atualizar).toHaveBeenCalledWith('a2');
    });

    it('429 painel.atualizacao-recente vira aviso, sem derrubar o painel, e ainda recarrega', async () => {
      await servico.carregar();
      api.atualizar.mockRejectedValueOnce(erroDaApi('painel.atualizacao-recente', 429));

      await servico.atualizar();

      expect(servico.atualizacaoRecente()).toBe(true);
      expect(servico.falhouAoCarregar()).toBe(false);
      expect(api.listar).toHaveBeenCalledTimes(2);
      expect(servico.atualizando()).toBe(false);
    });
  });

  describe('gaveta', () => {
    it('abre a gaveta da linha e a fecha', async () => {
      api.gaveta.mockResolvedValue({ aplicacaoId: 'a1', codigo: 'P1', titulo: 'x' } as Gaveta);

      await servico.abrirGaveta('a1', 'P1');
      expect(api.gaveta).toHaveBeenCalledWith('a1', 'P1');
      expect(servico.gaveta()?.codigo).toBe('P1');

      servico.fecharGaveta();
      expect(servico.gaveta()).toBeNull();
    });

    it('falha da gaveta fica na gaveta, não no painel', async () => {
      api.gaveta.mockRejectedValue(erroDaApi('x', 500));

      await servico.abrirGaveta('a1', 'P1');

      expect(servico.gaveta()).toBeNull();
      expect(servico.falhouGaveta()).toBe(true);
      expect(servico.falhouAoCarregar()).toBe(false);
    });
  });

  describe('hotfixes', () => {
    it('carrega os pedidos de hotfix da Aplicação', async () => {
      api.hotfixes.mockResolvedValue({
        aplicacaoId: 'a1',
        aviso: null,
        itens: [{ issue: 9, motivo: 'm', estado: 'mr-aberta', linkIssue: null, mr: null }],
      });

      await servico.carregarHotfixes('a1');

      expect(servico.hotfixes()?.itens).toHaveLength(1);
      expect(servico.falhouHotfixes()).toBe(false);
    });

    it('falha marca falhouHotfixes', async () => {
      api.hotfixes.mockRejectedValue(erroDaApi('x', 500));

      await servico.carregarHotfixes('a1');

      expect(servico.hotfixes()).toBeNull();
      expect(servico.falhouHotfixes()).toBe(true);
    });
  });
});
