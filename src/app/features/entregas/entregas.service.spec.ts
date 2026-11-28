import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { TempoRealService } from '../../core/tempo-real/tempo-real.service';
import type { EstadoTempoReal, EventoTempoReal } from '../../core/tempo-real/tempo-real.tipos';
import { EntregasApiService } from './entregas-api.service';
import { EntregasService } from './entregas.service';
import type { Entrega } from './entregas.tipos';

const entrega = (qa: string): Entrega => ({
  id: 'e1', aplicacao: { id: 'a1', nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: '2026-11-27T10:00:00Z',
  estado: 'em-andamento', vezDe: null,
  fluxos: [{
    id: 'f1', projeto: { id: 'p1', nome: 'api' }, tipoMudanca: 'feature', sha: 'abc1234', fatias: [{ codigo: 'E1b', comFlag: true }],
    etapas: ['abertura', 'qa', 'hml', 'prd'].map((etapa) => ({
      etapa, estado: etapa === 'abertura' ? 'concluido' : etapa === 'qa' ? qa : 'nao-iniciado',
      codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: '2026-11-27T10:00:00Z',
    })),
  }],
});
const erroHttp = (status: number, code?: string) =>
  new HttpErrorResponse({ status, error: code ? { errors: [{ code, message: 'm' }] } : null });

describe('[E1b] EntregasService', () => {
  let api: { obter: ReturnType<typeof vi.fn> };
  let eventos: Subject<EventoTempoReal>;
  let estadoTR: ReturnType<typeof signal<EstadoTempoReal>>;
  let ativoTR: ReturnType<typeof signal<boolean>>;
  let tempoReal: { eventos: Subject<EventoTempoReal>; estado: unknown; ativo: unknown; iniciar: ReturnType<typeof vi.fn>; parar: ReturnType<typeof vi.fn> };
  let servico: EntregasService;

  beforeEach(() => {
    vi.useFakeTimers();
    eventos = new Subject<EventoTempoReal>();
    estadoTR = signal<EstadoTempoReal>('ao-vivo');
    ativoTR = signal(true);
    tempoReal = { eventos, estado: estadoTR, ativo: ativoTR, iniciar: vi.fn(), parar: vi.fn() };
    api = { obter: vi.fn(async () => entrega('executando')) };
    TestBed.configureTestingModule({
      providers: [
        { provide: EntregasApiService, useValue: api },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });
    servico = TestBed.inject(EntregasService);
  });
  afterEach(() => {
    servico.parar();
    vi.useRealTimers();
  });

  it('acompanhar carrega a Entrega, expõe o estado e liga o tempo real', async () => {
    const promessa = servico.acompanhar('e1');
    expect(servico.carregando()).toBe(true);
    await promessa;

    expect(api.obter).toHaveBeenCalledWith('e1');
    expect(servico.entrega()?.estado).toBe('em-andamento');
    expect(servico.carregando()).toBe(false);
    expect(servico.erro()).toBeNull();
    expect(tempoReal.iniciar).toHaveBeenCalledOnce();
  });

  it('404 vira erro nao-encontrada (código da API), sem Entrega', async () => {
    api.obter.mockRejectedValueOnce(erroHttp(404, 'entrega.nao-encontrada'));

    await servico.acompanhar('e1');

    expect(servico.erro()).toBe('nao-encontrada');
    expect(servico.entrega()).toBeNull();
  });

  it('outra falha vira erro de carga e "tentar de novo" recarrega', async () => {
    api.obter.mockRejectedValueOnce(erroHttp(500));
    await servico.acompanhar('e1');
    expect(servico.erro()).toBe('falha');

    await servico.tentarDeNovo();

    expect(servico.erro()).toBeNull();
    expect(servico.entrega()).not.toBeNull();
  });

  it('rajada de entrega.atualizada do entregaId em 1 s vira uma única recarga', async () => {
    await servico.acompanhar('e1');
    api.obter.mockClear();
    const evento = { tipo: 'entrega.atualizada', aplicacaoId: 'a1', entregaId: 'e1', fluxoId: 'f1', etapa: 'qa', estado: 'concluido' } as const;

    eventos.next(evento);
    await vi.advanceTimersByTimeAsync(400);
    eventos.next(evento);
    eventos.next(evento);
    await vi.advanceTimersByTimeAsync(999);
    expect(api.obter).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(api.obter).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.obter).toHaveBeenCalledTimes(1);
  });

  it('evento de outra Entrega ou de outro tipo não recarrega', async () => {
    await servico.acompanhar('e1');
    api.obter.mockClear();

    eventos.next({ tipo: 'entrega.atualizada', aplicacaoId: 'a1', entregaId: 'outra', fluxoId: 'f', etapa: 'qa', estado: 'falhou' });
    eventos.next({ tipo: 'fatias.mudaram', aplicacaoId: 'a1' });
    await vi.advanceTimersByTimeAsync(5000);

    expect(api.obter).not.toHaveBeenCalled();
  });

  it('o painel da Etapa aberta mostra o novo estado depois da recarga, sem fechar', async () => {
    await servico.acompanhar('e1');
    servico.abrirEtapa('f1', 'qa');
    expect(servico.etapaAberta()?.estado).toBe('executando');
    api.obter.mockResolvedValueOnce(entrega('falhou'));

    eventos.next({ tipo: 'entrega.atualizada', aplicacaoId: 'a1', entregaId: 'e1', fluxoId: 'f1', etapa: 'qa', estado: 'falhou' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(servico.etapaAberta()?.estado).toBe('falhou');
    expect(servico.etapaAberta()?.etapa).toBe('qa');
    servico.fecharEtapa();
    expect(servico.etapaAberta()).toBeNull();
  });

  it('recarga em segundo plano não pisca (sem carregando) e erro mantém o que estava em tela', async () => {
    await servico.acompanhar('e1');
    api.obter.mockRejectedValueOnce(erroHttp(500));

    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(servico.carregando()).toBe(false);
    expect(servico.entrega()).not.toBeNull();
    expect(servico.erro()).toBeNull();
  });

  it('em consulta (SSE caído) a recarga de 30 s vem do tempo real e o estado avisa; ao reconectar recarrega uma vez', async () => {
    estadoTR.set('consulta');
    await servico.acompanhar('e1');
    expect(servico.estadoTempoReal()).toBe('consulta');
    api.obter.mockClear();

    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.obter).toHaveBeenCalledTimes(1);

    estadoTR.set('ao-vivo');
    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.obter).toHaveBeenCalledTimes(2);
    expect(servico.estadoTempoReal()).toBe('ao-vivo');
  });

  it('estadoTempoReal é null com o tempo real desligado', async () => {
    ativoTR.set(false);
    await servico.acompanhar('e1');

    expect(servico.estadoTempoReal()).toBeNull();
  });

  it('parar desliga o tempo real e depois disso eventos não recarregam', async () => {
    await servico.acompanhar('e1');
    api.obter.mockClear();

    servico.parar();
    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(5000);

    expect(tempoReal.parar).toHaveBeenCalledOnce();
    expect(api.obter).not.toHaveBeenCalled();
  });

  it('só vale a resposta da última consulta', async () => {
    await servico.acompanhar('e1');
    let soltar!: (e: Entrega) => void;
    api.obter.mockImplementationOnce(() => new Promise<Entrega>((r) => (soltar = r)));
    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(1000);
    api.obter.mockResolvedValueOnce(entrega('concluido'));
    eventos.next({ tipo: 'recarga' });
    await vi.advanceTimersByTimeAsync(1000);

    soltar(entrega('falhou'));
    await vi.advanceTimersByTimeAsync(0);

    expect(servico.entrega()?.fluxos[0].etapas[1].estado).toBe('concluido');
  });
});
