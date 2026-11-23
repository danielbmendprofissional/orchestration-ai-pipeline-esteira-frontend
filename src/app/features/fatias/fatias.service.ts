import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { codigoDoErro, errosDaResposta } from '../../core/http/erro-api';
import { FatiasApiService } from './fatias-api.service';
import { textoDoMotivo } from './fatias.apresentacao';
import type {
  Aba,
  AcaoPedida,
  AcoesDaFatia,
  ColunaOrdenavel,
  DecisaoDaFatia,
  FiltroFatias,
  Gaveta,
  Hotfixes,
  PainelLista,
  ProjetoFiltro,
  ReviewDaFatia,
} from './fatias.tipos';

export const TAMANHO_PADRAO = 20;
/** Flag das ações de decisão (botões e seção de Ações); a rota a declara em `data.featureAcoes`. */
export const FLAG_DAS_ACOES = 'P2';
export const COMENTARIO_MAXIMO = 2000;

/** Linha ou gaveta: o que os dois têm de decisão. Campos ausentes = flag desligada no backend. */
export interface ComDecisao {
  aplicacaoId: string;
  codigo: string;
  acoes?: AcoesDaFatia | null;
  review?: ReviewDaFatia | null;
  decisao?: string | null;
}

export interface PermissaoDaLinha {
  pode: boolean;
  /** Código do motivo (`textoDoMotivo` traduz para o `title`). */
  motivo: string | null;
}

export interface AcoesDaLinha {
  abrirReview: PermissaoDaLinha;
  aprovar: PermissaoDaLinha;
  reprovar: PermissaoDaLinha;
  review: ReviewDaFatia;
  decisao: DecisaoDaFatia;
}

export type ResultadoDaDecisao = { ok: true; acoes: AcaoPedida[] } | { ok: false; codigo: string | null; mensagem: string | null };

/** Parte do filtro que o humano muda (a aba tem método próprio). Chave ausente = não mexe; `undefined` explícito = limpa. */
export interface MudancaDeFiltro {
  fatia?: string;
  projeto?: ProjetoFiltro;
  aplicacoes?: string[];
}

/**
 * Domínio do Painel de Fatias (ADR-0005): orquestra a API e guarda o estado em signals. Só leitura.
 * Texto vindo do GitLab fica como veio: a tela o mostra por interpolação, nunca como HTML.
 */
@Injectable({ providedIn: 'root' })
export class FatiasService {
  private readonly api = inject(FatiasApiService);
  private readonly injector = inject(Injector);

  private readonly aba$ = signal<Aba>('andamento');
  private readonly filtro$ = signal<Omit<FiltroFatias, 'aba'>>({});
  private readonly pagina$ = signal(1);
  private readonly tamanho$ = signal(TAMANHO_PADRAO);
  private readonly lida = signal<PainelLista | null>(null);
  private readonly emCarga = signal(false);
  private readonly falhou = signal(false);
  private readonly emAtualizacao = signal(false);
  private readonly recente = signal(false);
  private consulta = 0;

  readonly aba = this.aba$.asReadonly();
  readonly filtro = this.filtro$.asReadonly();
  readonly pagina = this.pagina$.asReadonly();
  readonly tamanhoDaPagina = this.tamanho$.asReadonly();
  readonly carregando = this.emCarga.asReadonly();
  /** A última consulta falhou; `itens()` continua com o que já tinha, e `carregar()` é o "tentar de novo". */
  readonly falhouAoCarregar = this.falhou.asReadonly();
  readonly atualizando = this.emAtualizacao.asReadonly();
  /** O último Atualizar bateu no limite (`painel.atualizacao-recente`): os dados já são de agora há pouco. */
  readonly atualizacaoRecente = this.recente.asReadonly();

  readonly resposta = this.lida.asReadonly();
  readonly itens = computed(() => this.lida()?.itens ?? []);
  readonly total = computed(() => Number(this.lida()?.total ?? 0));
  readonly totalPaginas = computed(() => Number(this.lida()?.totalPaginas ?? 0));
  readonly avisos = computed(() => this.lida()?.avisos ?? []);
  readonly aplicacoes = computed(() => this.lida()?.aplicacoes ?? []);
  /** Instante do dado mais antigo da consulta, para "dados de HH:MM". */
  readonly geradoEm = computed(() => this.lida()?.geradoEm ?? null);
  readonly desatualizado = computed(() => this.lida()?.desatualizado ?? false);
  /** Fatia, Projeto ou Aplicação filtrados: o vazio, aí, é "nada com esses filtros". */
  readonly comFiltro = computed(() => {
    const f = this.filtro$();
    return !!f.fatia || !!f.projeto || !!f.aplicacoes?.length;
  });

  // gaveta
  private readonly gaveta$ = signal<Gaveta | null>(null);
  private readonly emCargaGaveta = signal(false);
  private readonly falhouGaveta$ = signal(false);
  private consultaGaveta = 0;
  readonly gaveta = this.gaveta$.asReadonly();
  readonly carregandoGaveta = this.emCargaGaveta.asReadonly();
  readonly falhouGaveta = this.falhouGaveta$.asReadonly();

  // hotfixes
  private readonly hotfixes$ = signal<Hotfixes | null>(null);
  private readonly falhouHotfixes$ = signal(false);
  readonly hotfixes = this.hotfixes$.asReadonly();
  readonly falhouHotfixes = this.falhouHotfixes$.asReadonly();

  async carregar(): Promise<void> {
    const minha = ++this.consulta;
    this.emCarga.set(true);
    this.falhou.set(false);
    try {
      const resposta = await this.api.listar({ aba: this.aba$(), ...this.filtro$() }, { pagina: this.pagina$(), tamanho: this.tamanho$() });
      if (minha !== this.consulta) return;
      this.lida.set(resposta);
    } catch {
      if (minha !== this.consulta) return;
      this.falhou.set(true);
    } finally {
      if (minha === this.consulta) this.emCarga.set(false);
    }
  }

  selecionarAba(aba: Aba): Promise<void> {
    this.aba$.set(aba);
    this.pagina$.set(1);
    return this.carregar();
  }

  filtrar(mudanca: MudancaDeFiltro): Promise<void> {
    const atual = { ...this.filtro$() };
    if ('fatia' in mudanca) {
      const fatia = mudanca.fatia?.trim();
      if (fatia) atual.fatia = fatia;
      else delete atual.fatia;
    }
    if ('projeto' in mudanca) {
      if (mudanca.projeto) atual.projeto = mudanca.projeto;
      else delete atual.projeto;
    }
    if ('aplicacoes' in mudanca) {
      if (mudanca.aplicacoes?.length) atual.aplicacoes = [...mudanca.aplicacoes];
      else delete atual.aplicacoes;
    }
    this.filtro$.set(atual);
    this.pagina$.set(1);
    return this.carregar();
  }

  ordenar(sort: ColunaOrdenavel, order: 'asc' | 'desc'): Promise<void> {
    this.filtro$.update((f) => ({ ...f, sort, order }));
    this.pagina$.set(1);
    return this.carregar();
  }

  irParaPagina(pagina: number): Promise<void> {
    this.pagina$.set(Math.max(1, Math.trunc(pagina)));
    return this.carregar();
  }

  mudarTamanho(tamanho: number): Promise<void> {
    this.tamanho$.set(tamanho);
    this.pagina$.set(1);
    return this.carregar();
  }

  /**
   * "Atualizar": descarta o guardado das Aplicações da consulta (as filtradas, ou todas as que a última resposta trouxe)
   * e recarrega. O limite de atualização (429) não é falha do Painel: vira `atualizacaoRecente`.
   */
  async atualizar(): Promise<void> {
    this.emAtualizacao.set(true);
    this.recente.set(false);
    try {
      const filtradas = this.filtro$().aplicacoes;
      const ids = filtradas?.length ? filtradas : this.aplicacoes().map((a) => a.id);
      const resultados = await Promise.allSettled(ids.map((id) => this.api.atualizar(id)));
      this.recente.set(resultados.some((r) => r.status === 'rejected' && codigoDoErro(r.reason) === 'painel.atualizacao-recente'));
      await this.carregar();
    } finally {
      this.emAtualizacao.set(false);
    }
  }

  async abrirGaveta(aplicacaoId: string, codigo: string): Promise<void> {
    const minha = ++this.consultaGaveta;
    this.emCargaGaveta.set(true);
    this.falhouGaveta$.set(false);
    this.gaveta$.set(null);
    try {
      const gaveta = await this.api.gaveta(aplicacaoId, codigo);
      if (minha === this.consultaGaveta) this.gaveta$.set(gaveta);
    } catch {
      if (minha === this.consultaGaveta) this.falhouGaveta$.set(true);
    } finally {
      if (minha === this.consultaGaveta) this.emCargaGaveta.set(false);
    }
  }

  fecharGaveta(): void {
    this.consultaGaveta++;
    this.gaveta$.set(null);
    this.falhouGaveta$.set(false);
    this.emCargaGaveta.set(false);
  }

  // decisões (P2)

  /** Desligada (ou ausente), a tela não mostra botão nem seção de Ações. Flags vêm do injetor na hora: o Painel de leitura não depende delas. */
  readonly acoesLigadas = computed(() => this.injector.get(FeatureFlagsService).isEnabled(FLAG_DAS_ACOES));

  /**
   * O que a linha (ou a gaveta) oferece. `null` = nada: flag desligada ou a API não mandou os campos novos.
   * Papel, CI e MR vêm prontos da API; o front só soma o que já sabe da própria linha: com `decisao` ≠ `nenhuma`
   * nenhuma nova decisão, e com review pedido ou aberto, nenhum novo pedido de review.
   */
  acoesDaLinha(fatia: ComDecisao): AcoesDaLinha | null {
    if (!this.acoesLigadas() || !fatia.acoes) return null;
    const decisao = (fatia.decisao ?? 'nenhuma') as DecisaoDaFatia;
    const review = fatia.review ?? { estado: 'nenhum', link: null };
    const emAndamento: PermissaoDaLinha = { pode: false, motivo: 'decisao-em-andamento' };
    const permissao = (p: { pode: boolean; motivo?: string | null }): PermissaoDaLinha => ({ pode: p.pode, motivo: p.motivo ?? null });
    const decidida = decisao !== 'nenhuma';
    return {
      abrirReview:
        review.estado === 'pedido' || review.estado === 'aberto' ? { pode: false, motivo: 'review-ja-pedido' } : permissao(fatia.acoes.podeAbrirReview),
      aprovar: decidida ? emAndamento : permissao(fatia.acoes.podeAprovar),
      reprovar: decidida ? emAndamento : permissao(fatia.acoes.podeReprovar),
      review,
      decisao,
    };
  }

  abrirReview(fatia: ComDecisao): Promise<ResultadoDaDecisao> {
    return this.decidir(fatia, 'abrirReview', () => this.api.abrirReview(fatia.aplicacaoId, fatia.codigo));
  }

  aprovar(fatia: ComDecisao): Promise<ResultadoDaDecisao> {
    return this.decidir(fatia, 'aprovar', () => this.api.aprovar(fatia.aplicacaoId, fatia.codigo));
  }

  reprovar(fatia: ComDecisao, comentario: string): Promise<ResultadoDaDecisao> {
    const texto = comentario.trim();
    if (!texto || texto.length > COMENTARIO_MAXIMO) {
      return Promise.resolve({
        ok: false,
        codigo: 'fatia.comentario-invalido',
        mensagem: `O comentário é obrigatório e vai até ${COMENTARIO_MAXIMO} caracteres.`,
      });
    }
    return this.decidir(fatia, 'reprovar', () => this.api.reprovar(fatia.aplicacaoId, fatia.codigo, texto));
  }

  /**
   * 202 e erro de negócio viram resultado (o diálogo mostra o texto da API); os dois recarregam a lista uma vez.
   * Recusa local (flag, decisão em andamento, motivo da API) nem chega à API.
   */
  private async decidir(fatia: ComDecisao, acao: 'abrirReview' | 'aprovar' | 'reprovar', pedir: () => Promise<{ acoes: AcaoPedida[] }>): Promise<ResultadoDaDecisao> {
    const permissao = this.acoesDaLinha(fatia)?.[acao];
    if (!permissao?.pode) {
      const motivo = permissao?.motivo ?? null;
      return { ok: false, codigo: motivo === 'decisao-em-andamento' ? 'fatia.decisao-em-andamento' : null, mensagem: textoDoMotivo(motivo) };
    }
    try {
      const { acoes } = await pedir();
      await this.carregar();
      return { ok: true, acoes };
    } catch (erro) {
      const codigo = codigoDoErro(erro);
      if (codigo) await this.carregar();
      return { ok: false, codigo, mensagem: errosDaResposta(erro)[0]?.message ?? null };
    }
  }

  async carregarHotfixes(aplicacaoId: string): Promise<void> {
    this.falhouHotfixes$.set(false);
    try {
      this.hotfixes$.set(await this.api.hotfixes(aplicacaoId));
    } catch {
      this.hotfixes$.set(null);
      this.falhouHotfixes$.set(true);
    }
  }
}
