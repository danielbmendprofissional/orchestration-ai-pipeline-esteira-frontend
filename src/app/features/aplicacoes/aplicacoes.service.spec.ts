import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AplicacoesApiService } from './aplicacoes-api.service';
import { AplicacoesService } from './aplicacoes.service';
import type { AplicacaoDetalhe, AplicacaoLista } from './aplicacoes.tipos';

const valuto: AplicacaoLista = { id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 3, ativa: true };
const pagina = (itens: AplicacaoLista[]) => ({ itens, total: itens.length, totalPaginas: 1, pagina: 1, tamanho: 20 });
const erroDaApi = (code: string, status = 422) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg da API', type: 'Validation' }] } });
const permissoesTodas = (v: boolean) => ({ podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v });

describe('[A1] AplicacoesService', () => {
  let api: Record<'listar' | 'permissoesGlobais' | 'permissoes' | 'obter' | 'criar' | 'alterar', ReturnType<typeof vi.fn>>;
  let servico: AplicacoesService;

  beforeEach(() => {
    api = {
      listar: vi.fn(async () => pagina([valuto])),
      permissoesGlobais: vi.fn(async () => ({ podeCriar: true })),
      permissoes: vi.fn(async () => permissoesTodas(true)),
      obter: vi.fn(async () => ({ id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true }) satisfies AplicacaoDetalhe),
      criar: vi.fn(async () => valuto),
      alterar: vi.fn(async () => valuto),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AplicacoesApiService, useValue: api }] });
    servico = TestBed.inject(AplicacoesService);
  });

  describe('lista', () => {
    it('carrega a primeira página de ativas e as permissões globais', async () => {
      await servico.carregarLista();

      expect(api.listar).toHaveBeenCalledWith({ busca: undefined, ativa: true, sort: undefined, order: undefined }, { pagina: 1, tamanho: 20 });
      expect(servico.pagina()?.itens).toEqual([valuto]);
      expect(servico.podeCriar()).toBe(true);
    });

    it('podeCriar vem da API: false quando a API nega', async () => {
      api.permissoesGlobais.mockResolvedValue({ podeCriar: false });

      await servico.carregarLista();

      expect(servico.podeCriar()).toBe(false);
    });

    it.each([
      ['inativas', false],
      ['todas', undefined],
      ['ativas', true],
    ] as const)('filtro %s manda ativa=%s e volta à página 1', async (situacao, ativa) => {
      await servico.carregarLista();
      await servico.irParaPagina(3);

      await servico.filtrarPorSituacao(situacao);

      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ ativa }), { pagina: 1, tamanho: 20 });
    });

    it('busca manda o texto aparado e volta à página 1; vazio vira sem filtro', async () => {
      await servico.buscar('  val ');
      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ busca: 'val' }), { pagina: 1, tamanho: 20 });

      await servico.buscar('   ');
      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ busca: undefined }), { pagina: 1, tamanho: 20 });
    });

    it('ordenar alterna asc/desc na mesma coluna e começa asc em coluna nova', async () => {
      await servico.ordenarPor('nome');
      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'nome', order: 'asc' }), expect.anything());

      await servico.ordenarPor('nome');
      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'nome', order: 'desc' }), expect.anything());

      await servico.ordenarPor('sigla');
      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'sigla', order: 'asc' }), expect.anything());
    });

    it('as permissões carregam mesmo quando a lista falha (o botão Nova aplicação não depende da lista)', async () => {
      api.listar.mockRejectedValue(new HttpErrorResponse({ status: 500 }));

      await servico.carregarLista();

      expect(servico.podeCriar()).toBe(true);
    });

    it('404 da lista (área não disponível) não é falha: marca indisponível', async () => {
      api.listar.mockRejectedValue(new HttpErrorResponse({ status: 404 }));

      await servico.carregarLista();

      expect(servico.indisponivel()).toBe(true);
      expect(servico.falhouAoCarregar()).toBe(false);
    });

    it('lista vazia com 200 não é indisponível nem falha', async () => {
      api.listar.mockResolvedValue(pagina([]));

      await servico.carregarLista();

      expect(servico.indisponivel()).toBe(false);
      expect(servico.falhouAoCarregar()).toBe(false);
    });

    it('comFiltro: só com busca ou situação diferente de Ativas', async () => {
      expect(servico.comFiltro()).toBe(false);
      await servico.filtrarPorSituacao('todas');
      expect(servico.comFiltro()).toBe(true);
      await servico.filtrarPorSituacao('ativas');
      expect(servico.comFiltro()).toBe(false);
      await servico.buscar('port');
      expect(servico.comFiltro()).toBe(true);
    });

    it('guarda a falha da carga sem lançar e libera o carregando', async () => {
      api.listar.mockRejectedValue(new HttpErrorResponse({ status: 500 }));

      await servico.carregarLista();

      expect(servico.falhouAoCarregar()).toBe(true);
      expect(servico.carregando()).toBe(false);
    });
  });

  describe('criar', () => {
    const form = { nome: ' Valuto ', sigla: ' vlt ', grupoGitLab: ' valuto ' };

    it('manda os campos aparados, sigla em maiúscula, e recarrega a lista', async () => {
      const resultado = await servico.criar(form);

      expect(api.criar).toHaveBeenCalledWith({ nome: 'Valuto', sigla: 'VLT', grupoGitLab: 'valuto' });
      expect(resultado).toEqual({ ok: true });
      expect(api.listar).toHaveBeenCalled();
    });

    it.each([
      ['aplicacao.sigla-duplicada', 'sigla'],
      ['aplicacao.grupo-ja-vinculado', 'grupoGitLab'],
      ['gitlab.grupo-nao-encontrado', 'grupoGitLab'],
      ['gitlab.bot-nao-configurado', 'grupoGitLab'],
    ] as const)('o erro %s volta como mensagem do campo %s', async (code, campo) => {
      api.criar.mockRejectedValue(erroDaApi(code));

      const resultado = await servico.criar(form);

      expect(resultado).toEqual({ ok: false, campo, mensagem: expect.stringMatching(/\S/) });
    });

    it('erro de outro código não aponta campo (o toast do interceptor já avisou)', async () => {
      api.criar.mockRejectedValue(erroDaApi('qualquer.outro'));

      expect(await servico.criar(form)).toEqual({ ok: false });
    });

    it('não recarrega a lista quando a criação falha', async () => {
      api.criar.mockRejectedValue(erroDaApi('aplicacao.sigla-duplicada'));

      await servico.criar(form);

      expect(api.listar).not.toHaveBeenCalled();
    });
  });

  describe('detalhe', () => {
    it('carrega o detalhe e as permissões da Aplicação', async () => {
      await servico.carregarDetalhe('a1');

      expect(servico.detalhe()?.sigla).toBe('VLT');
      expect(servico.permissoes()?.podeEditar).toBe(true);
    });

    it('guarda exatamente o que a API devolveu nas permissões (nenhuma regra de papel no front)', async () => {
      api.permissoes.mockResolvedValue(permissoesTodas(false));

      await servico.carregarDetalhe('a1');

      expect(servico.permissoes()).toEqual(permissoesTodas(false));
    });

    it('404 marca como não encontrada e limpa o detalhe anterior', async () => {
      await servico.carregarDetalhe('a1');
      api.obter.mockRejectedValue(erroDaApi('aplicacao.nao-encontrada', 404));

      await servico.carregarDetalhe('zz');

      expect(servico.detalhe()).toBeNull();
      expect(servico.naoEncontrada()).toBe(true);
    });

    it('alterar manda nome, sigla e ativa e atualiza o cabeçalho', async () => {
      await servico.carregarDetalhe('a1');
      api.alterar.mockResolvedValue({ ...valuto, nome: 'Valuto 2', ativa: false });

      const resultado = await servico.alterar('a1', { nome: ' Valuto 2 ', sigla: 'vlt', ativa: false });

      expect(api.alterar).toHaveBeenCalledWith('a1', { nome: 'Valuto 2', sigla: 'VLT', ativa: false });
      expect(resultado).toEqual({ ok: true });
      expect(servico.detalhe()?.nome).toBe('Valuto 2');
      expect(servico.detalhe()?.ativa).toBe(false);
    });

    it('alterar com sigla duplicada volta o erro no campo sigla', async () => {
      await servico.carregarDetalhe('a1');
      api.alterar.mockRejectedValue(erroDaApi('aplicacao.sigla-duplicada'));

      expect(await servico.alterar('a1', { nome: 'V', sigla: 'X', ativa: true })).toEqual({
        ok: false,
        campo: 'sigla',
        mensagem: expect.any(String),
      });
    });
  });
});
