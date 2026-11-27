import { TestBed } from '@angular/core/testing';
import { FeatureFlagsService } from '../config/feature-flags.service';
import { FONTE_DE_EVENTOS, TempoRealService } from './tempo-real.service';
import type { EventoTempoReal } from './tempo-real.tipos';

class FonteFalsa {
  static todas: FonteFalsa[] = [];
  readyState = 0;
  fechada = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private ouvintes = new Map<string, (e: { data: string }) => void>();
  constructor(readonly url: string) {
    FonteFalsa.todas.push(this);
  }
  addEventListener(tipo: string, fn: (e: { data: string }) => void): void {
    this.ouvintes.set(tipo, fn);
  }
  close(): void {
    this.fechada = true;
    this.readyState = 2;
  }
  abrir(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  /** Rede caiu: o navegador fica em CONNECTING (0) e tentaria sozinho. */
  cair(): void {
    this.readyState = 0;
    this.onerror?.();
  }
  /** Resposta HTTP recusada (ex.: 429): o navegador desiste (CLOSED = 2). */
  recusar(): void {
    this.readyState = 2;
    this.onerror?.();
  }
  enviar(tipo: string, corpo: object): void {
    this.ouvintes.get(tipo)?.({ data: JSON.stringify({ tipo, ...corpo }) });
  }
  enviarBruto(tipo: string, data: string): void {
    this.ouvintes.get(tipo)?.({ data });
  }
}
const ultima = () => FonteFalsa.todas[FonteFalsa.todas.length - 1];

describe('[T1] TempoRealService', () => {
  let flagT1: boolean;
  let servico: TempoRealService;
  let recebidos: EventoTempoReal[];

  beforeEach(() => {
    vi.useFakeTimers();
    FonteFalsa.todas = [];
    flagT1 = true;
    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => c === 'T1' && flagT1 } },
        { provide: FONTE_DE_EVENTOS, useValue: (url: string) => new FonteFalsa(url) },
      ],
    });
    servico = TestBed.inject(TempoRealService);
    recebidos = [];
    servico.eventos.subscribe((e) => recebidos.push(e));
  });
  afterEach(() => {
    servico.parar();
    vi.useRealTimers();
  });

  it('flag desligado (ou ausente): não abre o SSE, nada de consulta, estado inativo', () => {
    flagT1 = false;

    servico.iniciar();
    vi.advanceTimersByTime(120_000);

    expect(FonteFalsa.todas).toHaveLength(0);
    expect(servico.ativo()).toBe(false);
    expect(recebidos).toEqual([]);
  });

  it('flag ligado: abre /api/v1/eventos uma vez só e passa a ao-vivo ao abrir', () => {
    servico.iniciar();
    servico.iniciar();

    expect(FonteFalsa.todas).toHaveLength(1);
    expect(ultima().url).toBe('/api/v1/eventos');
    expect(servico.ativo()).toBe(true);
    expect(servico.estado()).toBe('reconectando');

    ultima().abrir();

    expect(servico.estado()).toBe('ao-vivo');
  });

  it('a primeira abertura não pede recarga (a página acabou de carregar)', () => {
    servico.iniciar();
    ultima().abrir();

    expect(recebidos).toEqual([]);
  });

  it('expõe os três tipos de evento do contrato e ignora JSON inválido', () => {
    servico.iniciar();
    ultima().abrir();

    ultima().enviar('acao.atualizada', { aplicacaoId: 'a1', fatiaCodigo: 'P2b', acaoId: 'x1', estado: 'confirmada' });
    ultima().enviar('pipeline.atualizada', { aplicacaoId: 'a1', projetoId: 'p1', pipelineId: 9, status: 'success', ref: 'main', sha: 'abc' });
    ultima().enviar('fatias.mudaram', { aplicacaoId: 'a2' });
    ultima().enviarBruto('fatias.mudaram', '{quebrado');

    expect(recebidos.map((e) => e.tipo)).toEqual(['acao.atualizada', 'pipeline.atualizada', 'fatias.mudaram']);
    expect(recebidos[0]).toMatchObject({ aplicacaoId: 'a1', fatiaCodigo: 'P2b' });
  });

  it('queda: reconectando com recuo 1, 2, 5, 10, 30, 30 s', () => {
    servico.iniciar();
    ultima().abrir();
    const esperas = [1000, 2000, 5000, 10_000, 30_000, 30_000];

    ultima().cair();
    expect(servico.estado()).toBe('reconectando');
    for (const espera of esperas) {
      const antes = FonteFalsa.todas.length;
      vi.advanceTimersByTime(espera - 1);
      expect(FonteFalsa.todas).toHaveLength(antes);
      vi.advanceTimersByTime(1);
      expect(FonteFalsa.todas).toHaveLength(antes + 1);
      ultima().cair();
    }
  });

  it('passados 10 s sem reconexão: consulta, e emite recarga a cada 30 s', () => {
    servico.iniciar();
    ultima().abrir();
    ultima().cair();

    vi.advanceTimersByTime(9_999);
    expect(servico.estado()).toBe('reconectando');
    vi.advanceTimersByTime(1);
    expect(servico.estado()).toBe('consulta');
    expect(recebidos).toEqual([]);

    vi.advanceTimersByTime(30_000);
    expect(recebidos).toEqual([{ tipo: 'recarga' }]);
    vi.advanceTimersByTime(30_000);
    expect(recebidos).toHaveLength(2);
  });

  it('reconectou: volta a ao-vivo, para a consulta e emite exatamente uma recarga', () => {
    servico.iniciar();
    ultima().abrir();
    ultima().cair();
    vi.advanceTimersByTime(10_000);
    expect(servico.estado()).toBe('consulta');

    ultima().abrir();

    expect(servico.estado()).toBe('ao-vivo');
    expect(recebidos).toEqual([{ tipo: 'recarga' }]);
    vi.advanceTimersByTime(120_000);
    expect(recebidos).toEqual([{ tipo: 'recarga' }]);
  });

  it('queda curta (reconecta antes de 10 s): sem consulta, uma recarga', () => {
    servico.iniciar();
    ultima().abrir();
    ultima().cair();
    vi.advanceTimersByTime(1000);
    ultima().abrir();
    vi.advanceTimersByTime(60_000);

    expect(servico.estado()).toBe('ao-vivo');
    expect(recebidos).toEqual([{ tipo: 'recarga' }]);
  });

  it('429 (recusa na conexão): não insiste, vai a consulta e recarrega a cada 30 s', () => {
    servico.iniciar();
    ultima().recusar();

    expect(servico.estado()).toBe('consulta');
    vi.advanceTimersByTime(120_000);
    expect(FonteFalsa.todas).toHaveLength(1);
    expect(recebidos).toHaveLength(4);
  });

  it('parar: fecha a conexão e cancela recuo e consulta', () => {
    servico.iniciar();
    const primeira = ultima();
    primeira.abrir();
    primeira.cair();

    servico.parar();
    vi.advanceTimersByTime(120_000);

    expect(primeira.fechada).toBe(true);
    expect(FonteFalsa.todas).toHaveLength(1);
    expect(recebidos).toEqual([]);
    expect(servico.ativo()).toBe(false);
  });
});
