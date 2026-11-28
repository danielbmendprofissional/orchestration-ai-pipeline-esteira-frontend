import { Injectable, computed, inject, signal } from '@angular/core';
import { codigoDoErro } from '../../core/http/erro-api';
import type { Pagina } from '../../core/http/paginacao';
import { AuditoriaApiService } from './auditoria-api.service';
import type {
  AplicacaoDoRegistro, CategoriaContagem, FiltroAuditoria, ObjetoDoRegistro, PeriodoEmDias, PessoaDoFiltro, RegistroDaLista, RegistroDetalhe,
} from './auditoria.tipos';

export const TAMANHO_DA_PAGINA = 12;
export const PERIODO_PADRAO: PeriodoEmDias = 30;
const PERIODOS: readonly number[] = [7, 30, 90];

/** Parâmetros de URL da tela (query string): `app`, `quem`, `cat`, `periodo`, `objeto`, `q`. */
export type ParamsDaUrl = Record<string, string | undefined>;

/** Mudança de filtro que a pessoa faz. Chave ausente = não mexe; `undefined`/vazio = limpa. */
export type MudancaDeFiltro = Partial<Pick<FiltroAuditoria, 'aplicacaoId' | 'quem' | 'categoria' | 'periodoDias' | 'objeto' | 'busca'>>;

export interface GrupoDoDia {
  /** `aaaa-mm-dd`, no fuso local. */
  dia: string;
  /** "Hoje", "Ontem" ou `dd/mm/aaaa`. */
  rotulo: string;
  registros: RegistroDaLista[];
}

/** Destino do botão "Abrir <código>" da gaveta; entidade sem tela conhecida = `null` (sem botão). */
export function destinoDoObjeto(objeto: ObjetoDoRegistro): string[] | null {
  switch (objeto.entidade) {
    case 'Aplicacao': return ['/aplicacoes', objeto.entidadeId];
    case 'Entrega': return ['/entregas', objeto.entidadeId];
    case 'Fatia':
    case 'AcaoBot': return ['/fatias']; // as Ações do bot gravam a entidade AcaoBot, com o código da Fatia no objeto
    default: return null;
  }
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const chaveDoDia = (d: Date) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;

function rotuloDoDia(d: Date, agora: Date): string {
  const hoje = chaveDoDia(agora);
  const ontem = chaveDoDia(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));
  const chave = chaveDoDia(d);
  if (chave === hoje) return 'Hoje';
  if (chave === ontem) return 'Ontem';
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function periodoDaUrl(bruto: string | undefined): PeriodoEmDias | null {
  if (bruto === 'tudo') return null;
  const n = Number(bruto);
  return PERIODOS.includes(n) ? (n as PeriodoEmDias) : PERIODO_PADRAO;
}

const limpo = (v: string | undefined) => v?.trim() || undefined;

/**
 * Domínio da Auditoria (ADR-0005): filtros (espelhados na URL), página, lista agrupada por dia, contagens por
 * categoria e a gaveta. Só leitura. Texto do registro vem da API e é mostrado por interpolação, nunca como HTML.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly api = inject(AuditoriaApiService);

  private readonly filtro$ = signal<FiltroAuditoria>({ periodoDias: PERIODO_PADRAO });
  private readonly pagina$ = signal(1);
  private readonly lida = signal<Pagina<RegistroDaLista> | null>(null);
  private readonly contagens = signal<CategoriaContagem[]>([]);
  private readonly aplicacoes$ = signal<AplicacaoDoRegistro[]>([]);
  private readonly pessoas$ = signal<PessoaDoFiltro[]>([]);
  private readonly emCarga = signal(false);
  private readonly falhou = signal(false);
  private consulta = 0;
  private filtrosCarregados = false;

  readonly filtro = this.filtro$.asReadonly();
  readonly pagina = this.pagina$.asReadonly();
  readonly carregando = this.emCarga.asReadonly();
  /** A última consulta falhou; é diferente de vazio. */
  readonly falhouAoCarregar = this.falhou.asReadonly();
  readonly aplicacoes = this.aplicacoes$.asReadonly();
  readonly pessoas = this.pessoas$.asReadonly();
  readonly categorias = this.contagens.asReadonly();
  readonly itens = computed(() => this.lida()?.itens ?? []);
  readonly total = computed(() => this.lida()?.total ?? 0);
  readonly totalPaginas = computed(() => this.lida()?.totalPaginas ?? 0);

  /** Registros agrupados por dia, na ordem em que a API devolveu. */
  readonly grupos = computed<GrupoDoDia[]>(() => {
    const agora = new Date();
    const grupos: GrupoDoDia[] = [];
    for (const registro of this.itens()) {
      const quando = new Date(registro.quando);
      const dia = chaveDoDia(quando);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.dia === dia) ultimo.registros.push(registro);
      else grupos.push({ dia, rotulo: rotuloDoDia(quando, agora), registros: [registro] });
    }
    return grupos;
  });

  /** Consulta feita, sem falha e sem registro: estado vazio (não é erro). */
  readonly vazio = computed(() => this.lida() !== null && !this.emCarga() && !this.falhou() && this.itens().length === 0);

  /** Algum filtro além do período padrão: o vazio, aí, é "nada com esses filtros". */
  readonly comFiltro = computed(() => {
    const f = this.filtro$();
    return !!(f.aplicacaoId || f.quem || f.categoria || f.objeto || f.busca) || f.periodoDias !== PERIODO_PADRAO;
  });

  /** Os filtros na forma da URL (`app`, `quem`, `cat`, `periodo`, `objeto`, `q`); o que é padrão não aparece. */
  readonly query = computed<Record<string, string>>(() => {
    const f = this.filtro$();
    const q: Record<string, string> = {};
    if (f.aplicacaoId) q['app'] = f.aplicacaoId;
    if (f.quem) q['quem'] = f.quem;
    if (f.categoria) q['cat'] = f.categoria;
    if (f.periodoDias === null) q['periodo'] = 'tudo';
    else if (f.periodoDias !== undefined && f.periodoDias !== PERIODO_PADRAO) q['periodo'] = String(f.periodoDias);
    if (f.objeto) q['objeto'] = f.objeto;
    if (f.busca) q['q'] = f.busca;
    return q;
  });

  /** Aplica os parâmetros da URL (entrada da tela, link "ver na auditoria", "voltar") e carrega, na página 1. */
  aplicarUrl(params: ParamsDaUrl): Promise<void> {
    const filtro: FiltroAuditoria = { periodoDias: periodoDaUrl(params['periodo']) };
    const pares: [keyof FiltroAuditoria, string | undefined][] = [
      ['aplicacaoId', limpo(params['app'])], ['quem', limpo(params['quem'])], ['categoria', limpo(params['cat'])],
      ['objeto', limpo(params['objeto'])], ['busca', limpo(params['q'])],
    ];
    for (const [chave, valor] of pares) if (valor) (filtro as Record<string, unknown>)[chave] = valor;
    this.filtro$.set(filtro);
    this.pagina$.set(1);
    return this.carregar();
  }

  filtrar(mudanca: MudancaDeFiltro): Promise<void> {
    const atual: FiltroAuditoria = { ...this.filtro$() };
    for (const chave of Object.keys(mudanca) as (keyof MudancaDeFiltro)[]) {
      const valor = mudanca[chave];
      const texto = typeof valor === 'string' ? valor.trim() : valor;
      if (chave === 'periodoDias') atual.periodoDias = valor === undefined ? PERIODO_PADRAO : (valor as PeriodoEmDias | null);
      else if (texto) (atual as Record<string, unknown>)[chave] = texto;
      else delete atual[chave];
    }
    this.filtro$.set(atual);
    this.pagina$.set(1);
    return this.carregar();
  }

  /** O `x` do chip "Só <código>". */
  limparObjeto(): Promise<void> {
    return this.filtrar({ objeto: undefined });
  }

  irParaPagina(pagina: number): Promise<void> {
    this.pagina$.set(Math.max(1, Math.trunc(pagina)));
    return this.carregar();
  }

  /** Lista, contagens por categoria e (uma vez) as opções dos seletores, em paralelo. */
  async carregar(): Promise<void> {
    const minha = ++this.consulta;
    this.emCarga.set(true);
    this.falhou.set(false);
    try {
      const filtro = this.filtro$();
      const [pagina, contagens] = await Promise.all([
        this.api.listar(filtro, { pagina: this.pagina$(), tamanho: TAMANHO_DA_PAGINA }),
        this.api.categorias(filtro),
        this.carregarOpcoes(),
      ]);
      if (minha !== this.consulta) return;
      this.lida.set(pagina);
      this.contagens.set(contagens.map((c) => ({ categoria: c.categoria, total: Number(c.total) })));
    } catch {
      if (minha !== this.consulta) return;
      this.falhou.set(true);
    } finally {
      if (minha === this.consulta) this.emCarga.set(false);
    }
  }

  private async carregarOpcoes(): Promise<void> {
    if (this.filtrosCarregados) return;
    const { aplicacoes, pessoas } = await this.api.filtros();
    this.aplicacoes$.set(aplicacoes);
    this.pessoas$.set(pessoas);
    this.filtrosCarregados = true;
  }

  // gaveta (`/auditoria/:id`)
  private readonly detalhe$ = signal<RegistroDetalhe | null>(null);
  private readonly emCargaDetalhe = signal(false);
  private readonly naoEncontrado = signal(false);
  private readonly falhouDetalhe$ = signal(false);
  private consultaDetalhe = 0;
  readonly detalhe = this.detalhe$.asReadonly();
  readonly carregandoDetalhe = this.emCargaDetalhe.asReadonly();
  /** 404 `auditoria.nao-encontrado`: inexistente ou fora do escopo (a API não distingue). */
  readonly detalheNaoEncontrado = this.naoEncontrado.asReadonly();
  readonly falhouDetalhe = this.falhouDetalhe$.asReadonly();

  async abrir(id: string): Promise<void> {
    const minha = ++this.consultaDetalhe;
    this.detalhe$.set(null);
    this.naoEncontrado.set(false);
    this.falhouDetalhe$.set(false);
    this.emCargaDetalhe.set(true);
    try {
      const detalhe = await this.api.detalhe(id);
      if (minha === this.consultaDetalhe) this.detalhe$.set(detalhe);
    } catch (erro) {
      if (minha !== this.consultaDetalhe) return;
      if (codigoDoErro(erro) === 'auditoria.nao-encontrado') this.naoEncontrado.set(true);
      else this.falhouDetalhe$.set(true);
    } finally {
      if (minha === this.consultaDetalhe) this.emCargaDetalhe.set(false);
    }
  }

  fechar(): void {
    this.consultaDetalhe++;
    this.detalhe$.set(null);
    this.naoEncontrado.set(false);
    this.falhouDetalhe$.set(false);
    this.emCargaDetalhe.set(false);
  }
}
