import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { codigoDoErro } from '../../core/http/erro-api';
import type { Pagina } from '../../core/http/paginacao';
import { AplicacoesApiService } from './aplicacoes-api.service';
import type {
  AlterarPoliticaRequest,
  AplicacaoDetalhe,
  AplicacaoLista,
  ColunaOrdenavel,
  Destino,
  FiltroApi,
  PapelResumo,
  PermissoesAplicacao,
  PessoaLista,
  ProjetoGitLabItem,
  ProjetoResumo,
} from './aplicacoes.tipos';

export const TAMANHO_DA_PAGINA = 20;

export type Situacao = 'ativas' | 'inativas' | 'todas';
export type CampoDoForm = 'nome' | 'sigla' | 'grupoGitLab';

/** Valores crus do formulário da gaveta; o serviço apara e normaliza antes de mandar. */
export interface FormNovaAplicacao {
  nome: string;
  sigla: string;
  grupoGitLab: string;
}
export interface FormEdicaoAplicacao {
  nome: string;
  sigla: string;
  ativa: boolean;
}

/** Erro de negócio que cabe num campo vem com `campo` e `mensagem`; outro erro já virou toast no interceptor. */
export type ResultadoComando = { ok: true } | { ok: false; campo?: CampoDoForm; mensagem?: string };

/** Códigos estáveis da API (ADR-0003) que a gaveta mostra junto do campo (A1, critérios 2 a 4). */
const ERROS_DE_CAMPO: Record<string, { campo: CampoDoForm; mensagem: string }> = {
  'aplicacao.sigla-duplicada': { campo: 'sigla', mensagem: 'Já existe uma aplicação com essa sigla.' },
  'aplicacao.grupo-ja-vinculado': { campo: 'grupoGitLab', mensagem: 'Esse grupo do GitLab já pertence a outra aplicação.' },
  'gitlab.grupo-nao-encontrado': {
    campo: 'grupoGitLab',
    mensagem: 'Grupo não encontrado, ou o bot da Esteira não tem acesso a ele.',
  },
  'gitlab.bot-nao-configurado': {
    campo: 'grupoGitLab',
    mensagem: 'O bot da Esteira ainda não está configurado para esse grupo.',
  },
};

/** Erros de negócio que não cabem num campo: a mensagem aparece junto da área que disparou a ação. */
const ERROS_GERAIS: Record<string, string> = {
  'projeto.dependencia-invalida':
    'Essa dependência não é válida: o projeto precisa ser da mesma aplicação, diferente dele mesmo e sem fechar ciclo.',
  'politica.limite-negativo': 'O limite não pode ser negativo. Deixe em branco para não ter limite.',
  'politica.abaixo-do-minimo':
    'Isso fica abaixo do mínimo fixo: em qa, hml e produção o modo é bloqueia e Crítica e Alta ficam em 0. Só dá para endurecer.',
  'papel.pessoa-desconhecida': 'Essa pessoa nunca entrou na Esteira: ela precisa fazer login uma vez antes de receber um papel.',
  'papel.duplicado': 'Essa pessoa já tem esse papel.',
  'destino.configuracao-com-segredo':
    'A configuração do destino não pode ter segredo (chave com PASSWORD, SENHA, SECRET, TOKEN, KEY ou CREDENTIAL). Cadastre o segredo como variável do GitLab.',
};

function resultadoDoErro(erro: unknown): ResultadoComando {
  const codigo = codigoDoErro(erro);
  const conhecido = codigo ? ERROS_DE_CAMPO[codigo] : undefined;
  if (conhecido) return { ok: false, ...conhecido };
  const geral = codigo ? ERROS_GERAIS[codigo] : undefined;
  return geral ? { ok: false, mensagem: geral } : { ok: false };
}

export interface FormDestino {
  nome: string;
  configuracao: Record<string, string>;
}

/** Domínio de Aplicações (ADR-0005): orquestra a API e guarda o estado em signals. As permissões vêm da API. */
@Injectable({ providedIn: 'root' })
export class AplicacoesService {
  private readonly api = inject(AplicacoesApiService);

  // lista
  private readonly situacao = signal<Situacao>('ativas');
  private readonly textoDeBusca = signal('');
  private readonly ordem = signal<{ sort: ColunaOrdenavel; order: 'asc' | 'desc' } | null>(null);
  private readonly paginaAtual = signal(1);
  private readonly lida = signal<Pagina<AplicacaoLista> | null>(null);
  private readonly emCarga = signal(false);
  private readonly falhou = signal(false);
  private readonly criar$ = signal(false);
  private readonly indisponivel$ = signal(false);

  readonly pagina = this.lida.asReadonly();
  readonly carregando = this.emCarga.asReadonly();
  readonly falhouAoCarregar = this.falhou.asReadonly();
  readonly situacaoAtual = this.situacao.asReadonly();
  readonly busca = this.textoDeBusca.asReadonly();
  readonly ordenacao = this.ordem.asReadonly();
  readonly podeCriar = this.criar$.asReadonly();
  /** A API respondeu 404 à lista: a área não existe neste ambiente. Não é erro de quem usa, nem lista vazia. */
  readonly indisponivel = this.indisponivel$.asReadonly();
  /** Busca ou situação diferente de Ativas: o vazio, aí, é "nada com esses filtros". */
  readonly comFiltro = computed(() => this.textoDeBusca() !== '' || this.situacao() !== 'ativas');

  // detalhe
  private readonly detalhe$ = signal<AplicacaoDetalhe | null>(null);
  private readonly permissoes$ = signal<PermissoesAplicacao | null>(null);
  private readonly inexistente = signal(false);
  private readonly carregandoDetalhe$ = signal(false);

  readonly detalhe = this.detalhe$.asReadonly();
  readonly permissoes = this.permissoes$.asReadonly();
  readonly naoEncontrada = this.inexistente.asReadonly();
  readonly carregandoDetalhe = this.carregandoDetalhe$.asReadonly();

  // projetos, ambientes e destinos
  private readonly grupo$ = signal<ProjetoGitLabItem[]>([]);
  private readonly erroProjetos$ = signal<string | null>(null);
  private readonly erroPolitica$ = signal<string | null>(null);
  private readonly erroPapeis$ = signal<string | null>(null);
  readonly projetosDoGrupo = this.grupo$.asReadonly();
  /** Último erro de negócio de uma ação direta (dependência, ambiente): some na próxima ação que der certo. */
  readonly erroDeProjetos = this.erroProjetos$.asReadonly();
  readonly erroDePolitica = this.erroPolitica$.asReadonly();
  readonly erroDePapeis = this.erroPapeis$.asReadonly();

  async carregarLista(pagina = 1): Promise<void> {
    this.paginaAtual.set(pagina);
    this.emCarga.set(true);
    this.falhou.set(false);
    this.indisponivel$.set(false);
    // As permissões não dependem da lista: se ela falhar, a pessoa ainda vê o que pode fazer.
    const permissoes = this.api
      .permissoesGlobais()
      .then((globais) => this.criar$.set(globais.podeCriar))
      .catch(() => undefined);
    try {
      this.lida.set(await this.api.listar(this.filtroDaApi(), { pagina, tamanho: TAMANHO_DA_PAGINA }));
    } catch (erro) {
      if (erro instanceof HttpErrorResponse && erro.status === 404) this.indisponivel$.set(true);
      else this.falhou.set(true);
    } finally {
      await permissoes;
      this.emCarga.set(false);
    }
  }

  irParaPagina(pagina: number): Promise<void> {
    return this.carregarLista(pagina);
  }

  filtrarPorSituacao(situacao: Situacao): Promise<void> {
    this.situacao.set(situacao);
    return this.carregarLista(1);
  }

  buscar(texto: string): Promise<void> {
    this.textoDeBusca.set(texto.trim());
    return this.carregarLista(1);
  }

  ordenarPor(coluna: ColunaOrdenavel): Promise<void> {
    const atual = this.ordem();
    this.ordem.set({ sort: coluna, order: atual?.sort === coluna && atual.order === 'asc' ? 'desc' : 'asc' });
    return this.carregarLista(1);
  }

  async criar(form: FormNovaAplicacao): Promise<ResultadoComando> {
    try {
      await this.api.criar({
        nome: form.nome.trim(),
        sigla: form.sigla.trim().toUpperCase(),
        grupoGitLab: form.grupoGitLab.trim(),
      });
    } catch (erro) {
      return resultadoDoErro(erro);
    }
    await this.carregarLista(1);
    return { ok: true };
  }

  async carregarDetalhe(id: string): Promise<void> {
    this.carregandoDetalhe$.set(true);
    this.inexistente.set(false);
    this.detalhe$.set(null);
    this.permissoes$.set(null);
    this.erroProjetos$.set(null);
    this.erroPolitica$.set(null);
    this.erroPapeis$.set(null);
    try {
      const [detalhe, permissoes] = await Promise.all([this.api.obter(id), this.api.permissoes(id)]);
      this.detalhe$.set(detalhe);
      this.permissoes$.set(permissoes);
    } catch {
      // Sem papel na Aplicação a API responde 404 (nunca 403): a tela trata como não encontrada.
      this.inexistente.set(true);
    } finally {
      this.carregandoDetalhe$.set(false);
    }
  }

  async alterar(id: string, form: FormEdicaoAplicacao): Promise<ResultadoComando> {
    try {
      const atualizada = await this.api.alterar(id, {
        nome: form.nome.trim(),
        sigla: form.sigla.trim().toUpperCase(),
        ativa: form.ativa,
      });
      this.detalhe$.update((d) =>
        d ? { ...d, nome: atualizada.nome, sigla: atualizada.sigla, ativa: atualizada.ativa } : d,
      );
      return { ok: true };
    } catch (erro) {
      return resultadoDoErro(erro);
    }
  }

  async alterarPolitica(aplicacaoId: string, ambiente: string, pedido: AlterarPoliticaRequest): Promise<ResultadoComando> {
    try {
      const salva = await this.api.alterarPolitica(aplicacaoId, ambiente, pedido);
      this.detalhe$.update((d) => (d ? { ...d, politicas: (d.politicas ?? []).map((p) => (p.ambiente === ambiente ? salva : p)) } : d));
      this.erroPolitica$.set(null);
      return { ok: true };
    } catch (erro) {
      const resultado = resultadoDoErro(erro);
      this.erroPolitica$.set(resultado.ok ? null : (resultado.mensagem ?? null));
      return resultado;
    }
  }

  buscarPessoas(texto: string): Promise<PessoaLista[]> {
    return this.api.buscarPessoas(texto.trim());
  }

  async vincularPapel(aplicacaoId: string, usuario: string, papel: string): Promise<ResultadoComando> {
    try {
      const vinculo = await this.api.vincularPapel(aplicacaoId, { usuario, papel });
      this.detalhe$.update((d) => (d ? { ...d, papeis: [...(d.papeis ?? []), vinculo] } : d));
      this.erroPapeis$.set(null);
      return { ok: true };
    } catch (erro) {
      const resultado = resultadoDoErro(erro);
      this.erroPapeis$.set(resultado.ok ? null : (resultado.mensagem ?? null));
      return resultado;
    }
  }

  async desvincularPapel(aplicacaoId: string, papelId: string): Promise<void> {
    try {
      await this.api.desvincularPapel(aplicacaoId, papelId);
      this.detalhe$.update((d) => (d ? { ...d, papeis: (d.papeis ?? []).filter((p: PapelResumo) => p.id !== papelId) } : d));
      this.erroPapeis$.set(null);
    } catch {
      // o erro já virou toast no interceptor
    }
  }

  async carregarProjetosDoGrupo(aplicacaoId: string): Promise<void> {
    try {
      this.grupo$.set(await this.api.projetosDoGrupo(aplicacaoId));
    } catch {
      this.grupo$.set([]);
    }
  }

  /** Cadastra um a um; o que já entrou fica no detalhe mesmo que um posterior falhe. */
  async cadastrarProjetos(aplicacaoId: string, itens: { projetoGitLabId: number | string; stack: string }[]): Promise<ResultadoComando> {
    for (const item of itens) {
      try {
        this.incluirProjeto(await this.api.cadastrarProjeto(aplicacaoId, { projetoGitLabId: item.projetoGitLabId, stack: item.stack.trim() }));
      } catch (erro) {
        return resultadoDoErro(erro);
      }
    }
    return { ok: true };
  }

  async substituirDependencias(projetoId: string, dependeDe: string[]): Promise<ResultadoComando> {
    return this.comandoDeProjeto(() => this.api.substituirDependencias(projetoId, dependeDe));
  }

  async alterarAmbiente(projetoId: string, ambiente: string, habilitado: boolean): Promise<ResultadoComando> {
    return this.comandoDeProjeto(() => this.api.alterarAmbiente(projetoId, ambiente, habilitado));
  }

  /** `destinoId` ausente cria; presente altera. A ordem de um novo destino é a seguinte à maior do ambiente. */
  async salvarDestino(projetoId: string, ambiente: string, destinoId: string | null, form: FormDestino): Promise<ResultadoComando> {
    const existentes = this.destinosDe(projetoId, ambiente);
    const ordem = destinoId ? (existentes.find((d) => d.id === destinoId)?.ordem ?? 1) : Math.max(0, ...existentes.map((d) => Number(d.ordem ?? 0))) + 1;
    const pedido = { nome: form.nome.trim(), configuracao: form.configuracao, ordem: Number(ordem) };
    try {
      const salvo = destinoId
        ? await this.api.alterarDestino(projetoId, ambiente, destinoId, pedido)
        : await this.api.criarDestino(projetoId, ambiente, pedido);
      this.trocarDestinos(projetoId, ambiente, (lista) => (destinoId ? lista.map((d) => (d.id === destinoId ? salvo : d)) : [...lista, salvo]));
      return { ok: true };
    } catch (erro) {
      return resultadoDoErro(erro);
    }
  }

  async removerDestino(projetoId: string, ambiente: string, destinoId: string): Promise<void> {
    try {
      await this.api.removerDestino(projetoId, ambiente, destinoId);
      this.trocarDestinos(projetoId, ambiente, (lista) => lista.filter((d) => d.id !== destinoId));
    } catch {
      // o erro já virou toast no interceptor
    }
  }

  private async comandoDeProjeto(chamar: () => Promise<ProjetoResumo>): Promise<ResultadoComando> {
    try {
      this.trocarProjeto(await chamar());
      this.erroProjetos$.set(null);
      return { ok: true };
    } catch (erro) {
      const resultado = resultadoDoErro(erro);
      this.erroProjetos$.set(resultado.ok ? null : (resultado.mensagem ?? null));
      return resultado;
    }
  }

  private incluirProjeto(projeto: ProjetoResumo): void {
    this.detalhe$.update((d) => (d ? { ...d, projetos: [...(d.projetos ?? []), projeto] } : d));
  }

  private trocarProjeto(projeto: ProjetoResumo): void {
    this.detalhe$.update((d) => (d ? { ...d, projetos: (d.projetos ?? []).map((p) => (p.id === projeto.id ? projeto : p)) } : d));
  }

  private destinosDe(projetoId: string, ambiente: string): Destino[] {
    const projeto = this.detalhe$()?.projetos?.find((p) => p.id === projetoId);
    return projeto?.ambientes?.find((a) => a.ambiente === ambiente)?.destinos ?? [];
  }

  private trocarDestinos(projetoId: string, ambiente: string, f: (lista: Destino[]) => Destino[]): void {
    const projeto = this.detalhe$()?.projetos?.find((p) => p.id === projetoId);
    if (!projeto) return;
    this.trocarProjeto({
      ...projeto,
      ambientes: (projeto.ambientes ?? []).map((a) => (a.ambiente === ambiente ? { ...a, destinos: f(a.destinos ?? []) } : a)),
    });
  }

  private filtroDaApi(): FiltroApi {
    const situacao = this.situacao();
    return {
      busca: this.textoDeBusca() || undefined,
      ativa: situacao === 'todas' ? undefined : situacao === 'ativas',
      sort: this.ordem()?.sort,
      order: this.ordem()?.order,
    };
  }
}
