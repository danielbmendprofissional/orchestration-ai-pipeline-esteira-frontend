import { Injectable, inject, signal } from '@angular/core';
import { codigoDoErro } from '../../core/http/erro-api';
import type { Pagina } from '../../core/http/paginacao';
import { AplicacoesApiService } from './aplicacoes-api.service';
import type {
  AplicacaoDetalhe,
  AplicacaoLista,
  ColunaOrdenavel,
  FiltroApi,
  PermissoesAplicacao,
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

function resultadoDoErro(erro: unknown): ResultadoComando {
  const codigo = codigoDoErro(erro);
  const conhecido = codigo ? ERROS_DE_CAMPO[codigo] : undefined;
  return conhecido ? { ok: false, ...conhecido } : { ok: false };
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

  readonly pagina = this.lida.asReadonly();
  readonly carregando = this.emCarga.asReadonly();
  readonly falhouAoCarregar = this.falhou.asReadonly();
  readonly situacaoAtual = this.situacao.asReadonly();
  readonly busca = this.textoDeBusca.asReadonly();
  readonly ordenacao = this.ordem.asReadonly();
  readonly podeCriar = this.criar$.asReadonly();

  // detalhe
  private readonly detalhe$ = signal<AplicacaoDetalhe | null>(null);
  private readonly permissoes$ = signal<PermissoesAplicacao | null>(null);
  private readonly inexistente = signal(false);
  private readonly carregandoDetalhe$ = signal(false);

  readonly detalhe = this.detalhe$.asReadonly();
  readonly permissoes = this.permissoes$.asReadonly();
  readonly naoEncontrada = this.inexistente.asReadonly();
  readonly carregandoDetalhe = this.carregandoDetalhe$.asReadonly();

  async carregarLista(pagina = 1): Promise<void> {
    this.paginaAtual.set(pagina);
    this.emCarga.set(true);
    this.falhou.set(false);
    try {
      const [lida, globais] = await Promise.all([
        this.api.listar(this.filtroDaApi(), { pagina, tamanho: TAMANHO_DA_PAGINA }),
        this.api.permissoesGlobais(),
      ]);
      this.lida.set(lida);
      this.criar$.set(globais.podeCriar);
    } catch {
      this.falhou.set(true);
    } finally {
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
