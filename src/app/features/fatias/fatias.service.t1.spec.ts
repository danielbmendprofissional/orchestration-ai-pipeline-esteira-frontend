import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { EventoTempoReal } from '../../core/tempo-real/tempo-real.tipos';
import { TempoRealService } from '../../core/tempo-real/tempo-real.service';
import { FatiasApiService } from './fatias-api.service';
import { FatiasService } from './fatias.service';
import type { FatiaDoPainel, Gaveta, PainelLista } from './fatias.tipos';

const fatia: FatiaDoPainel = {
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'T1', titulo: 'Tempo real', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
};
const lista: PainelLista = {
  itens: [fatia], pagina: 1, tamanhoPagina: 20, total: 1, totalPaginas: 1, avisos: [],
  aplicacoes: [{ id: 'a1', nome: 'Valuto', sigla: 'VLT', geradoEm: null, desatualizado: false }],
  geradoEm: null, desatualizado: false,
};
const gaveta = { aplicacaoId: 'a1', codigo: 'T1' } as Gaveta;

describe('[T1] FatiasService: tempo real', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let eventos: Subject<EventoTempoReal>;
  let tempoReal: { eventos: Subject<EventoTempoReal>; iniciar: ReturnType<typeof vi.fn>; parar: ReturnType<typeof vi.fn> };
  let servico: FatiasService;

  beforeEach(async () => {
    vi.useFakeTimers();
    eventos = new Subject<EventoTempoReal>();
    tempoReal = { eventos, iniciar: vi.fn(), parar: vi.fn() };
    api = { listar: vi.fn(async () => lista), atualizar: vi.fn(), gaveta: vi.fn(async () => gaveta) };
    TestBed.configureTestingModule({
      providers: [
        { provide: FatiasApiService, useValue: api },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });
    servico = TestBed.inject(FatiasService);
    await servico.carregar();
    api['listar'].mockClear();
  });
  afterEach(() => {
    servico.pararTempoReal();
    vi.useRealTimers();
  });

  it('acompanharTempoReal liga o serviço de tempo real e pararTempoReal desliga', () => {
    servico.acompanharTempoReal();
    expect(tempoReal.iniciar).toHaveBeenCalledOnce();

    servico.pararTempoReal();
    expect(tempoReal.parar).toHaveBeenCalledOnce();
  });

  it('rajada de eventos em 1 s vira uma única recarga, depois do debounce', async () => {
    servico.acompanharTempoReal();

    eventos.next({ tipo: 'acao.atualizada', aplicacaoId: 'a1', fatiaCodigo: 'T1', acaoId: 'x', estado: 'confirmada' });
    await vi.advanceTimersByTimeAsync(400);
    eventos.next({ tipo: 'fatias.mudaram', aplicacaoId: 'a1' });
    eventos.next({ tipo: 'pipeline.atualizada', aplicacaoId: 'a1', projetoId: 'p', pipelineId: 1, status: 'success', ref: 'main', sha: 's' });
    await vi.advanceTimersByTimeAsync(999);
    expect(api['listar']).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(api['listar']).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(api['listar']).toHaveBeenCalledTimes(1);
  });

  it('evento de Aplicação que não está em tela não recarrega', async () => {
    servico.acompanharTempoReal();

    eventos.next({ tipo: 'fatias.mudaram', aplicacaoId: 'outra' });
    await vi.advanceTimersByTimeAsync(5000);

    expect(api['listar']).not.toHaveBeenCalled();
  });

  it('recarga (reconexão ou consulta de 30 s) recarrega mesmo sem Aplicação', async () => {
    servico.acompanharTempoReal();

    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(api['listar']).toHaveBeenCalledTimes(1);
  });

  it('a recarga não conta no Atualizar: não chama a API de atualização', async () => {
    servico.acompanharTempoReal();

    eventos.next({ tipo: 'fatias.mudaram', aplicacaoId: 'a1' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(api['atualizar']).not.toHaveBeenCalled();
    expect(servico.atualizacaoRecente()).toBe(false);
  });

  it('gaveta aberta é recarregada junto, sem fechar nem piscar', async () => {
    await servico.abrirGaveta('a1', 'T1');
    api['gaveta'].mockClear();
    servico.acompanharTempoReal();
    const nova = { aplicacaoId: 'a1', codigo: 'T1', titulo: 'novo' } as Gaveta;
    api['gaveta'].mockResolvedValue(nova);

    eventos.next({ tipo: 'acao.atualizada', aplicacaoId: 'a1', fatiaCodigo: 'T1', acaoId: 'x', estado: 'falhou' });
    await vi.advanceTimersByTimeAsync(999);
    expect(servico.gaveta()).toBe(gaveta);
    expect(servico.carregandoGaveta()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(api['gaveta']).toHaveBeenCalledWith('a1', 'T1');
    expect(servico.gaveta()).toBe(nova);
  });

  it('sem gaveta aberta, não consulta a gaveta', async () => {
    servico.acompanharTempoReal();

    eventos.next({ tipo: 'fatias.mudaram', aplicacaoId: 'a1' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(api['gaveta']).not.toHaveBeenCalled();
  });

  it('depois de pararTempoReal, eventos não recarregam', async () => {
    servico.acompanharTempoReal();
    servico.pararTempoReal();

    eventos.next({ tipo: 'fatias.mudaram', aplicacaoId: 'a1' });
    await vi.advanceTimersByTimeAsync(5000);

    expect(api['listar']).not.toHaveBeenCalled();
  });
});
