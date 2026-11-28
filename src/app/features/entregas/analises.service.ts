import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, debounceTime, filter } from 'rxjs';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import type { Pagina } from '../../core/http/paginacao';
import { TempoRealService } from '../../core/tempo-real/tempo-real.service';
import { AnalisesApiService } from './analises-api.service';
import type { Achado, AnaliseDaEtapa, AnalisesDoDestino, DecisaoDaEtapa, SeveridadeDoAchado } from './analises.tipos';
import { DEBOUNCE_ENTREGA_MS } from './entregas.service';

export const FLAG_ANALISES = 'E2';
export const TAMANHO_DA_PAGINA_DE_ACHADOS = 20;

/**
 * Estado das Análises do painel da Etapa (E2), atrás de `Features:E2` (ausente = desligado). Recarrega por
 * `entrega.atualizada` do id em tela (uma vez por rajada) e em toda `recarga`; quem abre o tempo real é o
 * `EntregasService`, aqui só se escuta.
 */
@Injectable({ providedIn: 'root' })
export class AnalisesService {
  private readonly api = inject(AnalisesApiService);
  private readonly tempoReal = inject(TempoRealService);
  private readonly flags = inject(FeatureFlagsService);

  private readonly gate$ = signal<DecisaoDaEtapa | null>(null);
  private readonly analises$ = signal<AnaliseDaEtapa[]>([]);
  private readonly carregou$ = signal(false);
  private readonly carregando$ = signal(false);
  private readonly erro$ = signal(false);
  private readonly analiseAberta$ = signal<string | null>(null);
  private readonly severidade$ = signal<SeveridadeDoAchado | undefined>(undefined);
  private readonly achados$ = signal<Pagina<Achado> | null>(null);
  private readonly achadosCarregando$ = signal(false);
  private readonly achadosErro$ = signal(false);

  private alvo: { entregaId: string; fluxoId: string; etapa: string } | null = null;
  private consulta = 0;
  private consultaAchados = 0;
  private pagina = 1;
  private assinatura: Subscription | null = null;

  readonly habilitado = computed(() => this.flags.isEnabled(FLAG_ANALISES));
  /** Última decisão do gate da Etapa (`null` sem decisão). */
  readonly gate = this.gate$.asReadonly();
  readonly analises = this.analises$.asReadonly();
  readonly carregando = this.carregando$.asReadonly();
  readonly erro = this.erro$.asReadonly();
  /** Carregou sem falha e não veio nenhuma Análise ("nenhuma Análise recebida ainda"). */
  readonly vazio = computed(() => this.carregou$() && !this.erro$() && this.analises$().length === 0);
  readonly doArtefato = computed(() => this.analises$().filter((a) => a.escopo === 'artefato'));
  /** Análises do Deploy agrupadas por Destino, na ordem em que aparecem. */
  readonly doDeploy = computed<AnalisesDoDestino[]>(() => {
    const grupos = new Map<string, AnaliseDaEtapa[]>();
    for (const a of this.analises$().filter((x) => x.escopo !== 'artefato')) {
      const destino = a.destino ?? '';
      grupos.set(destino, [...(grupos.get(destino) ?? []), a]);
    }
    return [...grupos].map(([destino, analises]) => ({ destino, analises }));
  });

  readonly analiseAberta = this.analiseAberta$.asReadonly();
  readonly severidade = this.severidade$.asReadonly();
  readonly achados = this.achados$.asReadonly();
  readonly achadosCarregando = this.achadosCarregando$.asReadonly();
  readonly achadosErro = this.achadosErro$.asReadonly();

  async abrir(entregaId: string, fluxoId: string, etapa: string): Promise<void> {
    this.fechar();
    if (!this.habilitado()) return;
    this.alvo = { entregaId, fluxoId, etapa };
    this.assinatura = this.tempoReal.eventos
      .pipe(
        filter((e) => e.tipo === 'recarga' || (e.tipo === 'entrega.atualizada' && e.entregaId === this.alvo?.entregaId)),
        debounceTime(DEBOUNCE_ENTREGA_MS),
      )
      .subscribe(() => void this.carregar(false));
    await this.carregar(true);
  }

  fechar(): void {
    this.assinatura?.unsubscribe();
    this.assinatura = null;
    this.alvo = null;
    this.consulta++;
    this.gate$.set(null);
    this.analises$.set([]);
    this.carregou$.set(false);
    this.carregando$.set(false);
    this.erro$.set(false);
    this.fecharAchados();
  }

  tentarDeNovo(): Promise<void> {
    return this.carregar(true);
  }

  async abrirAchados(analiseId: string): Promise<void> {
    this.analiseAberta$.set(analiseId);
    this.severidade$.set(undefined);
    this.pagina = 1;
    await this.carregarAchados();
  }

  fecharAchados(): void {
    this.consultaAchados++;
    this.analiseAberta$.set(null);
    this.severidade$.set(undefined);
    this.achados$.set(null);
    this.achadosCarregando$.set(false);
    this.achadosErro$.set(false);
    this.pagina = 1;
  }

  filtrarPorSeveridade(severidade: SeveridadeDoAchado | undefined): Promise<void> {
    this.severidade$.set(severidade);
    this.pagina = 1;
    return this.carregarAchados();
  }

  irParaPagina(pagina: number): Promise<void> {
    this.pagina = pagina;
    return this.carregarAchados();
  }

  tentarAchadosDeNovo(): Promise<void> {
    return this.carregarAchados();
  }

  /** `visivel`: primeira carga ou "tentar de novo"; recarga ao vivo é silenciosa e mantém o que está em tela. */
  private async carregar(visivel: boolean): Promise<void> {
    const alvo = this.alvo;
    if (!alvo) return;
    const minha = ++this.consulta;
    if (visivel) {
      this.carregando$.set(true);
      this.erro$.set(false);
    }
    try {
      const r = await this.api.analisesDaEtapa(alvo.entregaId, alvo.fluxoId, alvo.etapa);
      if (minha !== this.consulta) return;
      this.gate$.set(r.gate);
      this.analises$.set(r.analises);
      this.carregou$.set(true);
      this.erro$.set(false);
    } catch {
      if (minha !== this.consulta) return;
      if (visivel) {
        this.analises$.set([]);
        this.gate$.set(null);
        this.erro$.set(true);
      }
    } finally {
      if (minha === this.consulta) this.carregando$.set(false);
    }
  }

  private async carregarAchados(): Promise<void> {
    const alvo = this.alvo;
    const analiseId = this.analiseAberta$();
    if (!alvo || !analiseId) return;
    const minha = ++this.consultaAchados;
    this.achadosCarregando$.set(true);
    this.achadosErro$.set(false);
    try {
      const pagina = await this.api.achados(alvo.entregaId, alvo.fluxoId, analiseId, { pagina: this.pagina, tamanho: TAMANHO_DA_PAGINA_DE_ACHADOS }, this.severidade$());
      if (minha !== this.consultaAchados) return;
      this.achados$.set(pagina);
    } catch {
      if (minha !== this.consultaAchados) return;
      this.achados$.set(null);
      this.achadosErro$.set(true);
    } finally {
      if (minha === this.consultaAchados) this.achadosCarregando$.set(false);
    }
  }
}
