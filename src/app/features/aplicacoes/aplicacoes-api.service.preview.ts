import { Injectable } from '@angular/core';
import type { Pagina, PedidoDePagina } from '../../core/http/paginacao';
import type {
  AlterarAplicacaoRequest,
  AlterarPoliticaRequest,
  AplicacaoDetalhe,
  AplicacaoLista,
  CadastrarProjetoRequest,
  CriarAplicacaoRequest,
  Destino,
  DestinoRequest,
  FiltroApi,
  PapelResumo,
  PermissoesAplicacao,
  PermissoesGlobais,
  PessoaLista,
  Politica,
  ProjetoGitLabItem,
  ProjetoResumo,
  VincularPapelRequest,
} from './aplicacoes.tipos';

/**
 * Dados falsos do build `preview` (`docs/agents/padrao-frontend.md`, "Preview da Fatia"): o angular.json troca
 * `aplicacoes-api.service.ts` por este arquivo; a superfície pública é a mesma (conferida em
 * `aplicacoes-api.service.preview.spec.ts`). Tudo tipado pelo contrato gerado e em memória: sem API nem banco.
 * A sessão falsa é MOR, então todas as permissões são verdadeiras.
 */
const APLICACOES: AplicacaoLista[] = [
  { id: '019a0000-0000-7000-8000-000000000001', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 3, ativa: true },
  { id: '019a0000-0000-7000-8000-000000000002', nome: 'Portal do Cliente', sigla: 'PCL', grupo: 'portal-cliente', quantidadeProjetos: 2, ativa: true },
];

const PERMISSOES: PermissoesAplicacao = { podeEditar: true, podeEditarCadastro: true, podeEditarPolitica: true, podeGerenciarPapeis: true };

const AMBIENTES = ['qa', 'hml', 'producao'] as const;
const novoProjeto = (id: string, caminho: string, stack: string): ProjetoResumo => ({
  id,
  nome: caminho.split('/').pop(),
  caminho,
  stack,
  ativo: true,
  dependeDe: [],
  ambientes: AMBIENTES.map((ambiente) => ({ id: `${id}-${ambiente}`, ambiente, habilitado: true, destinos: [] })),
});

function acharProjeto(projetos: ProjetoResumo[], id: string): ProjetoResumo {
  const projeto = projetos.find((p) => p.id === id);
  if (!projeto) throw new Error('Projeto do preview não encontrado.');
  return projeto;
}

const PESSOAS: PessoaLista[] = [
  { sub: 'dev', nome: 'Dev Esteira', email: 'dev@esteira.local' },
  { sub: 'ana', nome: 'Ana Souza', email: 'ana@esteira.local' },
  { sub: 'beto', nome: 'Beto Lima', email: 'beto@esteira.local' },
];

const POLITICAS_INICIAIS = (): Politica[] => [
  { id: 'po-review', ambiente: 'review', critica: null, alta: null, media: null, baixa: null, modo: 'avisa' },
  { id: 'po-qa', ambiente: 'qa', critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' },
  { id: 'po-hml', ambiente: 'hml', critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' },
  { id: 'po-producao', ambiente: 'producao', critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' },
];

const GRUPO: ProjetoGitLabItem[] = [
  { projetoGitLabId: 1, caminho: 'valuto/api', nome: 'api', cadastrado: true, stackSugerida: 'dotnet' },
  { projetoGitLabId: 2, caminho: 'valuto/web', nome: 'web', cadastrado: true, stackSugerida: 'angular' },
  { projetoGitLabId: 3, caminho: 'valuto/worker', nome: 'worker', cadastrado: false, stackSugerida: 'dotnet' },
  { projetoGitLabId: 4, caminho: 'valuto/docs', nome: 'docs', cadastrado: false, stackSugerida: null },
];

@Injectable({ providedIn: 'root' })
export class AplicacoesApiService {
  private readonly dados: AplicacaoLista[] = APLICACOES.map((a) => ({ ...a }));
  private readonly projetos: ProjetoResumo[] = [novoProjeto('p-api', 'valuto/api', 'dotnet'), novoProjeto('p-web', 'valuto/web', 'angular')];
  private readonly politicas: Politica[] = POLITICAS_INICIAIS();
  private papeis: PapelResumo[] = [{ id: 'pp-1', usuario: 'ana', nome: 'Ana Souza', email: 'ana@esteira.local', papel: 'analista' }];
  private workspace: AplicacaoDetalhe['workspace'] = undefined;
  private contador = 0;

  listar(filtro: FiltroApi, pedido: PedidoDePagina): Promise<Pagina<AplicacaoLista>> {
    const busca = filtro.busca?.toLowerCase();
    const filtradas = this.dados
      .filter((a) => filtro.ativa === undefined || a.ativa === filtro.ativa)
      .filter((a) => !busca || `${a.nome} ${a.sigla} ${a.grupo}`.toLowerCase().includes(busca));
    const inicio = (pedido.pagina - 1) * pedido.tamanho;
    return Promise.resolve({
      itens: filtradas.slice(inicio, inicio + pedido.tamanho),
      total: filtradas.length,
      totalPaginas: Math.ceil(filtradas.length / pedido.tamanho),
      pagina: pedido.pagina,
      tamanho: pedido.tamanho,
    });
  }

  permissoesGlobais(): Promise<PermissoesGlobais> {
    return Promise.resolve({ podeCriar: true });
  }

  permissoes(id: string): Promise<PermissoesAplicacao> {
    void id;
    return Promise.resolve({ ...PERMISSOES });
  }

  obter(id: string): Promise<AplicacaoDetalhe> {
    const a = this.dados.find((x) => x.id === id);
    if (!a) return Promise.reject(new Error('Aplicação do preview não encontrada.'));
    return Promise.resolve({ id: a.id, nome: a.nome, sigla: a.sigla, grupo: a.grupo, ativa: a.ativa, ...(this.workspace ? { workspace: { ...this.workspace } } : {}), politicas: structuredClone(this.politicas), projetos: this.projetos.map((p) => structuredClone(p)), papeis: structuredClone(this.papeis) });
  }

  criar(pedido: CriarAplicacaoRequest): Promise<AplicacaoLista> {
    const nova: AplicacaoLista = {
      id: `019a0000-0000-7000-8000-${String(this.dados.length + 1).padStart(12, '0')}`,
      nome: pedido.nome ?? '',
      sigla: (pedido.sigla ?? '').toUpperCase(),
      grupo: pedido.grupoGitLab ?? '',
      quantidadeProjetos: 0,
      ativa: true,
    };
    this.dados.unshift(nova);
    return Promise.resolve(nova);
  }

  alterar(id: string, pedido: AlterarAplicacaoRequest): Promise<AplicacaoLista> {
    const a = this.dados.find((x) => x.id === id);
    if (!a) return Promise.reject(new Error('Aplicação do preview não encontrada.'));
    Object.assign(a, { nome: pedido.nome ?? a.nome, sigla: pedido.sigla ?? a.sigla, ativa: pedido.ativa ?? a.ativa });
    return Promise.resolve({ ...a });
  }

  projetosDoGrupo(id: string): Promise<ProjetoGitLabItem[]> {
    void id;
    const cadastrados = new Set(this.projetos.map((p) => p.caminho));
    return Promise.resolve(GRUPO.map((g) => ({ ...g, cadastrado: cadastrados.has(g.caminho ?? '') })));
  }

  definirWorkspace(id: string, projetoGitLabId: number | string | null): Promise<void> {
    void id;
    const item = GRUPO.find((g) => g.projetoGitLabId === Number(projetoGitLabId));
    this.workspace = projetoGitLabId === null || !item ? undefined : { projetoGitLabId: item.projetoGitLabId, caminho: item.caminho };
    return Promise.resolve();
  }

  cadastrarProjeto(_id: string, pedido: CadastrarProjetoRequest): Promise<ProjetoResumo> {
    const item = GRUPO.find((g) => g.projetoGitLabId === Number(pedido.projetoGitLabId));
    const projeto = novoProjeto(`p-${++this.contador}`, item?.caminho ?? 'valuto/novo', pedido.stack ?? '');
    this.projetos.push(projeto);
    return Promise.resolve(structuredClone(projeto));
  }

  substituirDependencias(projetoId: string, dependeDe: string[]): Promise<ProjetoResumo> {
    const projeto = acharProjeto(this.projetos, projetoId);
    projeto.dependeDe = [...dependeDe];
    return Promise.resolve(structuredClone(projeto));
  }

  alterarAmbiente(projetoId: string, ambiente: string, habilitado: boolean): Promise<ProjetoResumo> {
    const projeto = acharProjeto(this.projetos, projetoId);
    const alvo = projeto.ambientes?.find((a) => a.ambiente === ambiente);
    if (alvo && ambiente !== 'producao') alvo.habilitado = habilitado;
    return Promise.resolve(structuredClone(projeto));
  }

  criarDestino(projetoId: string, ambiente: string, pedido: DestinoRequest): Promise<Destino> {
    const destino: Destino = { id: `d-${++this.contador}`, nome: pedido.nome ?? '', configuracao: { ...pedido.configuracao }, ordem: pedido.ordem ?? 1 };
    acharProjeto(this.projetos, projetoId).ambientes?.find((a) => a.ambiente === ambiente)?.destinos?.push(destino);
    return Promise.resolve({ ...destino });
  }

  alterarDestino(projetoId: string, ambiente: string, destinoId: string, pedido: DestinoRequest): Promise<Destino> {
    const destino = acharProjeto(this.projetos, projetoId).ambientes?.find((a) => a.ambiente === ambiente)?.destinos?.find((d) => d.id === destinoId);
    if (!destino) return Promise.reject(new Error('Destino do preview não encontrado.'));
    Object.assign(destino, { nome: pedido.nome ?? destino.nome, configuracao: { ...pedido.configuracao }, ordem: pedido.ordem ?? destino.ordem });
    return Promise.resolve({ ...destino });
  }

  removerDestino(projetoId: string, ambiente: string, destinoId: string): Promise<void> {
    const amb = acharProjeto(this.projetos, projetoId).ambientes?.find((a) => a.ambiente === ambiente);
    if (amb) amb.destinos = (amb.destinos ?? []).filter((d) => d.id !== destinoId);
    return Promise.resolve();
  }


  alterarPolitica(id: string, ambiente: string, pedido: AlterarPoliticaRequest): Promise<Politica> {
    void id;
    const atual = this.politicas.find((p) => p.ambiente === ambiente);
    if (!atual) return Promise.reject(new Error('Política do preview não encontrada.'));
    Object.assign(atual, { critica: pedido.critica, alta: pedido.alta, media: pedido.media, baixa: pedido.baixa, modo: pedido.modo ?? atual.modo });
    return Promise.resolve({ ...atual });
  }

  buscarPessoas(busca: string): Promise<PessoaLista[]> {
    const termo = busca.toLowerCase();
    return Promise.resolve(PESSOAS.filter((p) => `${p.nome} ${p.email}`.toLowerCase().includes(termo)));
  }

  vincularPapel(id: string, pedido: VincularPapelRequest): Promise<PapelResumo> {
    void id;
    const pessoa = PESSOAS.find((p) => p.sub === pedido.usuario);
    const papel: PapelResumo = { id: `pp-${++this.contador}`, usuario: pedido.usuario ?? '', nome: pessoa?.nome, email: pessoa?.email, papel: pedido.papel ?? '' };
    this.papeis.push(papel);
    return Promise.resolve({ ...papel });
  }

  desvincularPapel(id: string, papelId: string): Promise<void> {
    void id;
    this.papeis = this.papeis.filter((p) => p.id !== papelId);
    return Promise.resolve();
  }
}
