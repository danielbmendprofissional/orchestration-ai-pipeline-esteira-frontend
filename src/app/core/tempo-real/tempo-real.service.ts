import { Injectable, InjectionToken, Injector, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { FeatureFlagsService } from '../config/feature-flags.service';
import { TIPOS_DE_EVENTO, type EstadoTempoReal, type EventoDoServidor, type EventoTempoReal, type FonteDeEventos } from './tempo-real.tipos';

export const FLAG_TEMPO_REAL = 'T1';
export const URL_DOS_EVENTOS = '/api/v1/eventos';
/** Recuo entre tentativas (1, 2, 5, 10, 30 s); depois da última, repete 30 s. */
export const RECUO_MS = [1000, 2000, 5000, 10_000, 30_000];
/** Sem reconexão neste prazo, o Painel passa a consultar por tempo. */
export const PRAZO_ATE_CONSULTA_MS = 10_000;
export const INTERVALO_DE_CONSULTA_MS = 30_000;

const CLOSED = 2;

/** Fábrica do `EventSource` (cookie de sessão, mesma origem); troca-se nos testes. */
export const FONTE_DE_EVENTOS = new InjectionToken<(url: string) => FonteDeEventos>('FONTE_DE_EVENTOS', {
  providedIn: 'root',
  factory: () => (url: string) => new EventSource(url, { withCredentials: true }),
});

/**
 * Tempo real (ADR-0011): SSE em `/api/v1/eventos` atrás de `Features:T1` (ausente = desligado, nada abre).
 * Caiu: `reconectando` com recuo; sem voltar em 10 s, `consulta` (recarga a cada 30 s). Reabriu: uma recarga.
 * Recusa na conexão (429: o `EventSource` vê só o erro com a conexão CLOSED) não é repetida: fica em `consulta`.
 * Os consumidores assinam `eventos` e recarregam o que lhes cabe.
 */
@Injectable({ providedIn: 'root' })
export class TempoRealService {
  private readonly injector = inject(Injector);
  private readonly criarFonte = inject(FONTE_DE_EVENTOS);
  private readonly estado$ = signal<EstadoTempoReal>('reconectando');
  private readonly ativo$ = signal(false);
  private readonly fluxo = new Subject<EventoTempoReal>();

  private fonte: FonteDeEventos | null = null;
  private tentativa = 0;
  private jaConectou = false;
  private caiu = false;
  private recuoTimer: ReturnType<typeof setTimeout> | null = null;
  private prazoTimer: ReturnType<typeof setTimeout> | null = null;
  private consultaTimer: ReturnType<typeof setInterval> | null = null;

  readonly estado = this.estado$.asReadonly();
  /** `false` com o flag desligado ou depois de `parar()`: o indicador nem aparece. */
  readonly ativo = this.ativo$.asReadonly();
  readonly eventos = this.fluxo.asObservable();

  /** Idempotente. Flag desligado ou ausente: não faz nada. */
  iniciar(): void {
    if (this.ativo$() || !this.injector.get(FeatureFlagsService).isEnabled(FLAG_TEMPO_REAL)) return;
    this.ativo$.set(true);
    this.estado$.set('reconectando');
    this.jaConectou = false;
    this.caiu = false;
    this.tentativa = 0;
    this.conectar();
  }

  parar(): void {
    this.limparTimers();
    this.fechar();
    this.ativo$.set(false);
    this.estado$.set('reconectando');
  }

  private conectar(): void {
    const fonte = this.criarFonte(URL_DOS_EVENTOS);
    this.fonte = fonte;
    fonte.onopen = () => this.aoAbrir();
    fonte.onerror = () => this.aoFalhar(fonte);
    for (const tipo of TIPOS_DE_EVENTO) fonte.addEventListener(tipo, (e) => this.aoReceber(e.data));
  }

  private aoAbrir(): void {
    this.limparTimers();
    this.tentativa = 0;
    this.estado$.set('ao-vivo');
    const reconectou = this.caiu;
    this.jaConectou = true;
    this.caiu = false;
    if (reconectou) this.fluxo.next({ tipo: 'recarga' }); // sem replay: o que passou durante a queda só vem recarregando
  }

  private aoReceber(dados: string): void {
    try {
      const evento = JSON.parse(dados) as EventoDoServidor;
      if (evento && typeof evento === 'object' && typeof evento.tipo === 'string') this.fluxo.next(evento);
    } catch {
      // frame que não é JSON: ignora
    }
  }

  private aoFalhar(fonte: FonteDeEventos): void {
    if (fonte !== this.fonte) return;
    const recusada = fonte.readyState === CLOSED && !this.jaConectou && this.tentativa === 0 && !this.caiu;
    this.fechar();
    if (recusada) {
      this.passarParaConsulta(); // 429/recusa: não insiste
      return;
    }
    this.caiu = true;
    if (this.estado$() === 'ao-vivo') this.estado$.set('reconectando');
    if (this.estado$() === 'reconectando' && !this.prazoTimer && !this.consultaTimer) {
      this.prazoTimer = setTimeout(() => {
        this.prazoTimer = null;
        this.passarParaConsulta(false);
      }, PRAZO_ATE_CONSULTA_MS);
    }
    const espera = RECUO_MS[Math.min(this.tentativa, RECUO_MS.length - 1)];
    this.tentativa++;
    this.recuoTimer = setTimeout(() => {
      this.recuoTimer = null;
      this.conectar();
    }, espera);
  }

  /** `definitivo`: não há nova tentativa de conexão (recusa); senão o recuo segue em paralelo. */
  private passarParaConsulta(definitivo = true): void {
    this.estado$.set('consulta');
    if (definitivo) {
      if (this.recuoTimer) clearTimeout(this.recuoTimer);
      this.recuoTimer = null;
    }
    if (this.consultaTimer) return;
    this.consultaTimer = setInterval(() => this.fluxo.next({ tipo: 'recarga' }), INTERVALO_DE_CONSULTA_MS);
  }

  private limparTimers(): void {
    if (this.recuoTimer) clearTimeout(this.recuoTimer);
    if (this.prazoTimer) clearTimeout(this.prazoTimer);
    if (this.consultaTimer) clearInterval(this.consultaTimer);
    this.recuoTimer = this.prazoTimer = this.consultaTimer = null;
  }

  private fechar(): void {
    const fonte = this.fonte;
    this.fonte = null;
    if (fonte) {
      fonte.onopen = null;
      fonte.onerror = null;
      fonte.close();
    }
  }
}
