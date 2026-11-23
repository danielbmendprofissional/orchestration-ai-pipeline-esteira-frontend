import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { FatiasApiService } from './fatias-api.service';
import { FatiasService } from './fatias.service';
import type { FatiaDoPainel, PainelLista } from './fatias.tipos';

const livre = { pode: true, motivo: null };
const fatia = (parcial: Partial<FatiaDoPainel> = {}): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2', titulo: 'Fatia P2', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
  acoes: { podeAbrirReview: livre, podeAprovar: livre, podeReprovar: livre }, review: { estado: 'nenhum', link: null }, decisao: 'nenhuma', ...parcial,
});
const lista = (itens: FatiaDoPainel[]): PainelLista => ({
  itens, pagina: 1, tamanhoPagina: 20, total: itens.length, totalPaginas: 1, avisos: [], aplicacoes: [], geradoEm: null, desatualizado: false,
});
const pedidas = { acoes: [{ id: 'x1', tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] };
const erroDaApi = (code: string, message: string, status = 409) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message, type: 'Conflict' }] } });

describe('[P2] FatiasService: decisões', () => {
  let api: Record<'listar' | 'atualizar' | 'gaveta' | 'hotfixes' | 'abrirReview' | 'aprovar' | 'reprovar', ReturnType<typeof vi.fn>>;
  let flagP2: boolean;
  let servico: FatiasService;

  beforeEach(() => {
    flagP2 = true;
    api = {
      listar: vi.fn(async () => lista([fatia()])),
      atualizar: vi.fn(async () => undefined),
      gaveta: vi.fn(),
      hotfixes: vi.fn(),
      abrirReview: vi.fn(async () => pedidas),
      aprovar: vi.fn(async () => pedidas),
      reprovar: vi.fn(async () => pedidas),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: FatiasApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => c === 'P2' && flagP2 } },
      ],
    });
    servico = TestBed.inject(FatiasService);
  });

  describe('permissões por linha', () => {
    it('com Features:P2 desligado não há ações na linha, mesmo que a API as mande', () => {
      flagP2 = false;

      expect(servico.acoesLigadas()).toBe(false);
      expect(servico.acoesDaLinha(fatia())).toBeNull();
    });

    it('com a flag ligada mas sem os campos novos (API sem P2) também não há ações', () => {
      expect(servico.acoesDaLinha(fatia({ acoes: undefined, review: undefined, decisao: undefined }))).toBeNull();
    });

    it('repassa pode e motivo da API, sem reimplementar regra de papel', () => {
      const f = fatia({
        acoes: { podeAbrirReview: livre, podeAprovar: { pode: false, motivo: 'ci-nao-verde' }, podeReprovar: { pode: false, motivo: 'papel' } },
      });

      const a = servico.acoesDaLinha(f)!;

      expect(a.abrirReview).toEqual({ pode: true, motivo: null });
      expect(a.aprovar).toEqual({ pode: false, motivo: 'ci-nao-verde' });
      expect(a.reprovar).toEqual({ pode: false, motivo: 'papel' });
    });

    it.each(['aprovando', 'reprovando', 'falhou'] as const)('decisao "%s" desativa Aprovar e Reprovar, mesmo com a API liberando', (decisao) => {
      const a = servico.acoesDaLinha(fatia({ decisao }))!;

      expect(a.decisao).toBe(decisao);
      expect(a.aprovar).toEqual({ pode: false, motivo: 'decisao-em-andamento' });
      expect(a.reprovar).toEqual({ pode: false, motivo: 'decisao-em-andamento' });
    });

    it('review pedido ou aberto desativa Abrir review', () => {
      expect(servico.acoesDaLinha(fatia({ review: { estado: 'pedido', link: null } }))!.abrirReview).toEqual({ pode: false, motivo: 'review-ja-pedido' });
      expect(servico.acoesDaLinha(fatia({ review: { estado: 'aberto', link: 'https://r/p2' } }))!.abrirReview.pode).toBe(false);
    });

    it('expõe review e decisao como a API devolveu', () => {
      const a = servico.acoesDaLinha(fatia({ review: { estado: 'aberto', link: 'https://r/p2' } }))!;

      expect(a.review).toEqual({ estado: 'aberto', link: 'https://r/p2' });
      expect(a.decisao).toBe('nenhuma');
    });
  });

  describe('comandos', () => {
    it('aprovar chama a API, devolve as ações pedidas e recarrega a lista uma vez', async () => {
      await servico.carregar();
      api.listar.mockClear();

      const r = await servico.aprovar(fatia());

      expect(api.aprovar).toHaveBeenCalledWith('a1', 'P2');
      expect(r).toEqual({ ok: true, acoes: pedidas.acoes });
      expect(api.listar).toHaveBeenCalledTimes(1);
    });

    it('abrirReview chama a API e recarrega a lista', async () => {
      await servico.carregar();
      api.listar.mockClear();

      const r = await servico.abrirReview(fatia());

      expect(api.abrirReview).toHaveBeenCalledWith('a1', 'P2');
      expect(r.ok).toBe(true);
      expect(api.listar).toHaveBeenCalledTimes(1);
    });

    it('reprovar manda o comentário e recarrega a lista', async () => {
      await servico.carregar();
      api.listar.mockClear();

      const r = await servico.reprovar(fatia(), 'Falta teste');

      expect(api.reprovar).toHaveBeenCalledWith('a1', 'P2', 'Falta teste');
      expect(r.ok).toBe(true);
      expect(api.listar).toHaveBeenCalledTimes(1);
    });

    it('a lista recarregada depois do 202 mostra a decisão em andamento e a linha deixa de oferecer decidir', async () => {
      await servico.carregar();
      api.listar.mockResolvedValue(lista([fatia({ decisao: 'aprovando' })]));

      await servico.aprovar(fatia());

      const a = servico.acoesDaLinha(servico.itens()[0])!;
      expect(a.decisao).toBe('aprovando');
      expect(a.aprovar.pode).toBe(false);
      expect(a.reprovar.pode).toBe(false);
    });

    it('erro de negócio devolve código e texto da API e ainda atualiza a lista', async () => {
      api.aprovar.mockRejectedValue(erroDaApi('fatia.ci-nao-verde', 'Há MR com CI que não está verde.'));
      await servico.carregar();
      api.listar.mockClear();

      const r = await servico.aprovar(fatia());

      expect(r).toEqual({ ok: false, codigo: 'fatia.ci-nao-verde', mensagem: 'Há MR com CI que não está verde.' });
      expect(api.listar).toHaveBeenCalledTimes(1);
    });

    it('papel insuficiente (403) também volta como resultado, sem lançar', async () => {
      api.reprovar.mockRejectedValue(erroDaApi('acesso.papel-insuficiente', 'Sem permissão.', 403));

      const r = await servico.reprovar(fatia(), 'x');

      expect(r).toEqual(expect.objectContaining({ ok: false, codigo: 'acesso.papel-insuficiente' }));
    });

    it('falha sem corpo de negócio (rede) devolve ok:false sem código e não recarrega', async () => {
      api.aprovar.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
      await servico.carregar();
      api.listar.mockClear();

      const r = await servico.aprovar(fatia());

      expect(r).toEqual({ ok: false, codigo: null, mensagem: null });
      expect(api.listar).not.toHaveBeenCalled();
    });

    it.each(['aprovando', 'reprovando', 'falhou'] as const)('com decisao "%s" não pede nova decisão à API', async (decisao) => {
      const a = await servico.aprovar(fatia({ decisao }));
      const r = await servico.reprovar(fatia({ decisao }), 'x');

      expect(a).toEqual(expect.objectContaining({ ok: false, codigo: 'fatia.decisao-em-andamento' }));
      expect(r).toEqual(expect.objectContaining({ ok: false, codigo: 'fatia.decisao-em-andamento' }));
      expect(api.aprovar).not.toHaveBeenCalled();
      expect(api.reprovar).not.toHaveBeenCalled();
    });

    it('com a flag desligada nenhum comando sai', async () => {
      flagP2 = false;

      const r = await servico.aprovar(fatia());

      expect(r.ok).toBe(false);
      expect(api.aprovar).not.toHaveBeenCalled();
    });

    it('reprovar sem comentário (vazio ou só espaços) ou com mais de 2000 caracteres nem chega à API', async () => {
      for (const c of ['', '   ', 'x'.repeat(2001)]) {
        expect(await servico.reprovar(fatia(), c)).toEqual(expect.objectContaining({ ok: false, codigo: 'fatia.comentario-invalido' }));
      }
      expect(api.reprovar).not.toHaveBeenCalled();
    });

    it('reprovar aceita exatamente 2000 caracteres e manda o comentário aparado', async () => {
      await servico.reprovar(fatia(), `  ${'x'.repeat(2000)}  `);

      expect(api.reprovar).toHaveBeenCalledWith('a1', 'P2', 'x'.repeat(2000));
    });
  });
});
