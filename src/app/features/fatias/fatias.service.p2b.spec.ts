import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { FatiasApiService } from './fatias-api.service';
import { FatiasService } from './fatias.service';
import type { AcaoDaFatia, FatiaDoPainel, PainelLista } from './fatias.tipos';

const livre = { pode: true, motivo: null };
const fatia = (parcial: Partial<FatiaDoPainel> = {}): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2b', titulo: 'Fatia', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
  acoes: { podeAbrirReview: livre, podeAprovar: livre, podeReprovar: livre }, review: { estado: 'nenhum', link: null }, decisao: 'nenhuma', ...parcial,
});
const acao = (extra: Partial<AcaoDaFatia> = {}): AcaoDaFatia => ({
  id: 'x1', tipo: 'aprovar', estado: 'falhou', repositorio: 'api', mrIid: 7, pedidaPor: 'Ana', pedidaEm: '2026-11-23T10:00:00Z',
  atualizadaEm: '2026-11-23T10:00:00Z', codigoErro: 'gitlab.merge-recusado', comentario: null, podeReexecutar: livre, ...extra,
});
const lista = (itens: FatiaDoPainel[]): PainelLista => ({
  itens, pagina: 1, tamanhoPagina: 20, total: itens.length, totalPaginas: 1, avisos: [], aplicacoes: [], geradoEm: null, desatualizado: false,
});
const aceito = { acoes: [{ id: 'x2', tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] };

describe('[P2b] FatiasService: reexecutar', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let flagP2: boolean;
  let servico: FatiasService;

  beforeEach(() => {
    flagP2 = true;
    api = { listar: vi.fn(async () => lista([fatia()])), reexecutar: vi.fn(async () => aceito) };
    TestBed.configureTestingModule({
      providers: [
        { provide: FatiasApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => c === 'P2' && flagP2 } },
      ],
    });
    servico = TestBed.inject(FatiasService);
  });

  it('202: devolve as ações pedidas e recarrega a lista uma vez', async () => {
    const r = await servico.reexecutar(fatia(), acao());

    expect(api['reexecutar']).toHaveBeenCalledWith('a1', 'P2b', 'x1');
    expect(r).toEqual({ ok: true, acoes: aceito.acoes });
    expect(api['listar']).toHaveBeenCalledTimes(1);
  });

  it('erro de negócio (409): devolve código e texto da API e também recarrega a lista', async () => {
    api['reexecutar'].mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { errors: [{ code: 'acao.nao-reexecutavel', message: 'A Ação não pode ser reexecutada.', type: 'Conflict' }] } }),
    );

    const r = await servico.reexecutar(fatia(), acao());

    expect(r).toEqual({ ok: false, codigo: 'acao.nao-reexecutavel', mensagem: 'A Ação não pode ser reexecutada.' });
    expect(api['listar']).toHaveBeenCalledTimes(1);
  });

  it('podeReexecutar falso: recusa localmente com o texto do motivo, sem chamar a API', async () => {
    const r = await servico.reexecutar(fatia(), acao({ podeReexecutar: { pode: false, motivo: 'papel' } }));

    expect(r).toEqual({ ok: false, codigo: null, mensagem: 'Seu papel não permite esta ação.' });
    expect(api['reexecutar']).not.toHaveBeenCalled();
  });

  it('flag desligada: não chama a API', async () => {
    flagP2 = false;

    const r = await servico.reexecutar(fatia(), acao());

    expect(r.ok).toBe(false);
    expect(api['reexecutar']).not.toHaveBeenCalled();
  });

  it('depois do 202 a lista recarregada com decisão em andamento não oferece nova decisão', async () => {
    api['listar'].mockResolvedValue(lista([fatia({ decisao: 'aprovando' })]));

    await servico.reexecutar(fatia(), acao());

    const a = servico.acoesDaLinha(servico.itens()[0])!;
    expect(a.aprovar).toEqual({ pode: false, motivo: 'decisao-em-andamento' });
    expect(a.reprovar).toEqual({ pode: false, motivo: 'decisao-em-andamento' });
  });
});
