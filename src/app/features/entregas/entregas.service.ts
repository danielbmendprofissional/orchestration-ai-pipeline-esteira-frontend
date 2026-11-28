import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, debounceTime, filter } from 'rxjs';
import { codigoDoErro } from '../../core/http/erro-api';
import { TempoRealService } from '../../core/tempo-real/tempo-real.service';
import type { EventoTempoReal } from '../../core/tempo-real/tempo-real.tipos';
import { EntregasApiService } from './entregas-api.service';
import type { Entrega, EntregaEtapa, ErroDaEntrega } from './entregas.tipos';

/** Eventos em rajada viram uma recarga só (T1). */
export const DEBOUNCE_ENTREGA_MS = 1000;
const NAO_ENCONTRADA = 'entrega.nao-encontrada';

/** 404 da API: o `code` decide; 404 sem `errors[]` (rota fora do ar) também é "não encontrada". */
function naoEncontrada(erro: unknown): boolean {
  const codigo = codigoDoErro(erro);
  return codigo ? codigo === NAO_ENCONTRADA : erro instanceof HttpErrorResponse && erro.status === 404;
}

/**
 * Estado da tela da Entrega (E1b). Recarrega uma vez por rajada de `entrega.atualizada` do id em tela e em toda
 * `recarga` do tempo real (reconexão ou consulta de 30 s, que o `TempoRealService` já gera em `consulta`).
 */
@Injectable({ providedIn: 'root' })
export class EntregasService {
  private readonly api = inject(EntregasApiService);
  private readonly tempoReal = inject(TempoRealService);

  private readonly entrega$ = signal<Entrega | null>(null);
  private readonly carregando$ = signal(false);
  private readonly erro$ = signal<ErroDaEntrega | null>(null);
  private readonly aberta$ = signal<{ fluxoId: string; etapa: string } | null>(null);
  private id: string | null = null;
  private consulta = 0;
  private assinatura: Subscription | null = null;

  readonly entrega = this.entrega$.asReadonly();
  readonly carregando = this.carregando$.asReadonly();
  readonly erro = this.erro$.asReadonly();
  /** `null` com o tempo real desligado ou parado (o indicador nem aparece). */
  readonly estadoTempoReal = computed(() => (this.tempoReal.ativo() ? this.tempoReal.estado() : null));
  /** Etapa do painel aberto, sempre lida da Entrega atual: a recarga muda o estado sem fechar o painel. */
  readonly etapaAberta = computed<EntregaEtapa | null>(() => {
    const aberta = this.aberta$();
    const fluxo = this.entrega$()?.fluxos.find((f) => f.id === aberta?.fluxoId);
    return fluxo?.etapas.find((e) => e.etapa === aberta?.etapa) ?? null;
  });

  async acompanhar(id: string): Promise<void> {
    this.parar();
    this.id = id;
    this.entrega$.set(null);
    this.aberta$.set(null);
    this.assinatura = this.tempoReal.eventos
      .pipe(
        filter((e) => this.emTela(e)),
        debounceTime(DEBOUNCE_ENTREGA_MS),
      )
      .subscribe(() => void this.carregar(false));
    this.tempoReal.iniciar();
    await this.carregar(true);
  }

  parar(): void {
    if (!this.assinatura) return;
    this.assinatura.unsubscribe();
    this.assinatura = null;
    this.tempoReal.parar();
  }

  tentarDeNovo(): Promise<void> {
    return this.carregar(true);
  }

  abrirEtapa(fluxoId: string, etapa: string): void {
    this.aberta$.set({ fluxoId, etapa });
  }

  fecharEtapa(): void {
    this.aberta$.set(null);
  }

  private emTela(evento: EventoTempoReal): boolean {
    return evento.tipo === 'recarga' || (evento.tipo === 'entrega.atualizada' && evento.entregaId === this.id);
  }

  /** `visivel`: primeira carga ou "tentar de novo" (mostra carregando e erro); recarga ao vivo é silenciosa e mantém o que está em tela. */
  private async carregar(visivel: boolean): Promise<void> {
    if (!this.id) return;
    const minha = ++this.consulta;
    if (visivel) {
      this.carregando$.set(true);
      this.erro$.set(null);
    }
    try {
      const nova = await this.api.obter(this.id);
      if (minha !== this.consulta) return;
      this.entrega$.set(nova);
      this.erro$.set(null);
    } catch (erro) {
      if (minha !== this.consulta) return;
      if (visivel) {
        this.entrega$.set(null);
        this.erro$.set(naoEncontrada(erro) ? 'nao-encontrada' : 'falha');
      }
    } finally {
      if (minha === this.consulta) this.carregando$.set(false);
    }
  }
}
