import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoDetalhe, PermissoesAplicacao } from '../aplicacoes.tipos';
import { AplicacaoDetalhePage } from './aplicacao-detalhe.page';

const amb = (ambiente: string, habilitado = true, destinos: object[] = []) => ({ id: `${ambiente}-id`, ambiente, habilitado, destinos });
const projeto = (id: string, nome: string, extra = {}) => ({
  id,
  nome,
  caminho: `valuto/${nome}`,
  stack: 'dotnet',
  ativo: true,
  dependeDe: [],
  ambientes: [amb('qa'), amb('hml'), amb('producao')],
  ...extra,
});
const detalhe = (): AplicacaoDetalhe => ({
  id: 'a1',
  nome: 'Valuto',
  sigla: 'VLT',
  grupo: 'valuto',
  ativa: true,
  politicas: [],
  papeis: [],
  projetos: [projeto('p1', 'api'), projeto('p2', 'web', { stack: 'angular' })],
});
const permissoes = (v: boolean): PermissoesAplicacao => ({ podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v });
const erroDaApi = (code: string) => new HttpErrorResponse({ status: 422, error: { errors: [{ code, message: 'msg', type: 'Validation' }] } });

describe('[A1] AplicacaoDetalhePage — abas Projetos e Ambientes e destinos', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacaoDetalhePage>;
  let raiz: HTMLElement;

  async function montar(pode = true, dados: AplicacaoDetalhe = detalhe()) {
    api = {
      obter: vi.fn(async () => dados),
      permissoes: vi.fn(async () => permissoes(pode)),
      projetosDoGrupo: vi.fn(async () => [
        { projetoGitLabId: 1, caminho: 'valuto/api', nome: 'api', cadastrado: true, stackSugerida: 'dotnet' },
        { projetoGitLabId: 7, caminho: 'valuto/worker', nome: 'worker', cadastrado: false, stackSugerida: 'dotnet' },
        { projetoGitLabId: 8, caminho: 'valuto/docs', nome: 'docs', cadastrado: false, stackSugerida: null },
      ]),
      cadastrarProjeto: vi.fn(async (_id: string, p: { projetoGitLabId: number }) => projeto(`n${p.projetoGitLabId}`, 'worker')),
      substituirDependencias: vi.fn(async (id: string, dependeDe: string[]) => ({ ...projeto(id, 'web', { stack: 'angular' }), dependeDe })),
      alterarAmbiente: vi.fn(async (id: string, _ambiente: string, habilitado: boolean) => ({
        ...projeto(id, 'api'),
        ambientes: [amb('qa'), amb('hml', habilitado), amb('producao')],
      })),
      criarDestino: vi.fn(async (_p: string, _a: string, d: object) => ({ id: 'd-novo', ...d })),
      alterarDestino: vi.fn(),
      removerDestino: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AplicacoesApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a1' })) } },
      ],
    });
    fixture = TestBed.createComponent(AplicacaoDetalhePage);
    raiz = fixture.nativeElement as HTMLElement;
    await estavel();
  }

  const estavel = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const botao = (nome: string | RegExp, contexto: ParentNode = document) =>
    Array.from(contexto.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      typeof nome === 'string' ? b.textContent?.trim() === nome : nome.test(b.textContent ?? ''),
    );
  const abrirAba = async (nome: string) => {
    Array.from(raiz.querySelectorAll<HTMLElement>('[role=tab]')).find((t) => t.textContent?.includes(nome))!.click();
    await estavel();
  };
  const painel = () => raiz.querySelector('[role=tabpanel]:not([hidden])') as HTMLElement;
  const digitar = (el: HTMLInputElement, texto: string) => {
    el.value = texto;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const campo = (rotulo: string) => {
    const label = Array.from(document.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(rotulo));
    return document.getElementById(label!.getAttribute('for')!) as HTMLInputElement;
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  describe('Projetos', () => {
    it('lista os projetos cadastrados com stack e dependências', async () => {
      await montar();
      await abrirAba('Projetos');

      const texto = painel().textContent ?? '';
      expect(texto).toContain('valuto/api');
      expect(texto).toContain('dotnet');
      expect(texto).toContain('valuto/web');
      expect(texto).toContain('angular');
    });

    it('"Adicionar projetos" lista os do grupo ainda não cadastrados, com a stack sugerida editável', async () => {
      await montar();
      await abrirAba('Projetos');
      botao('Adicionar projetos', painel())!.click();
      await estavel();

      expect(api['projetosDoGrupo']).toHaveBeenCalledWith('a1');
      const dialogo = document.querySelector('[role=dialog]')!;
      expect(dialogo.textContent).toContain('valuto/worker');
      expect(dialogo.textContent).not.toContain('valuto/api');
      expect(campo('Stack de valuto/worker').value).toBe('dotnet');
      expect(campo('Stack de valuto/docs').value).toBe('');
    });

    it('cadastra só os projetos marcados, com a stack digitada, e fecha a gaveta', async () => {
      await montar();
      await abrirAba('Projetos');
      botao('Adicionar projetos', painel())!.click();
      await estavel();

      (document.querySelector('input[type=checkbox][aria-label="Selecionar valuto/worker"]') as HTMLInputElement).click();
      (document.querySelector('input[type=checkbox][aria-label="Selecionar valuto/docs"]') as HTMLInputElement).click();
      digitar(campo('Stack de valuto/docs'), 'node');
      await estavel();
      botao('Cadastrar selecionados')!.click();
      await estavel();

      expect(api['cadastrarProjeto']).toHaveBeenCalledTimes(2);
      expect(api['cadastrarProjeto']).toHaveBeenCalledWith('a1', { projetoGitLabId: 7, stack: 'dotnet' });
      expect(api['cadastrarProjeto']).toHaveBeenCalledWith('a1', { projetoGitLabId: 8, stack: 'node' });
      expect(document.querySelector('[role=dialog]')).toBeNull();
    });

    it('declara dependência entre projetos e manda a lista de ids (substitui)', async () => {
      await montar();
      await abrirAba('Projetos');

      (painel().querySelector('input[type=checkbox][aria-label="valuto/web depende de valuto/api"]') as HTMLInputElement).click();
      await estavel();

      expect(api['substituirDependencias']).toHaveBeenCalledWith('p2', ['p1']);
    });

    it('mostra o erro de dependência inválida junto da lista (ciclo, outra Aplicação)', async () => {
      await montar();
      api['substituirDependencias'].mockRejectedValue(erroDaApi('projeto.dependencia-invalida'));
      await abrirAba('Projetos');

      (painel().querySelector('input[type=checkbox][aria-label="valuto/web depende de valuto/api"]') as HTMLInputElement).click();
      await estavel();

      expect(painel().querySelector('[role=alert]')?.textContent).toContain('dependência');
    });

    it('sem permissão, escondem-se Adicionar projetos e as caixas de dependência (critério 18)', async () => {
      await montar(false);
      await abrirAba('Projetos');

      expect(botao(/Adicionar projetos/, painel())).toBeUndefined();
      expect(painel().querySelector('input[type=checkbox]')).toBeNull();
      expect(painel().textContent).toContain('valuto/api');
    });
  });

  describe('Ambientes e destinos', () => {
    it('mostra a matriz Projeto × Ambiente (qa, hml, produção) e produção sempre habilitada', async () => {
      await montar();
      await abrirAba('Ambientes e destinos');

      const cabecalho = Array.from(painel().querySelectorAll('thead th')).map((t) => t.textContent?.trim());
      expect(cabecalho).toEqual(['Projeto', 'qa', 'hml', 'produção']);
      expect(painel().querySelectorAll('tbody tr')).toHaveLength(2);
      const producao = painel().querySelector('input[aria-label="valuto/api em produção"]') as HTMLInputElement;
      expect(producao.checked).toBe(true);
      expect(producao.disabled).toBe(true);
    });

    it('desabilitar o ambiente chama a API', async () => {
      await montar();
      await abrirAba('Ambientes e destinos');

      (painel().querySelector('input[aria-label="valuto/api em hml"]') as HTMLInputElement).click();
      await estavel();

      expect(api['alterarAmbiente']).toHaveBeenCalledWith('p1', 'hml', false);
    });

    it('cria um destino com configuração chave→valor na gaveta', async () => {
      await montar();
      await abrirAba('Ambientes e destinos');
      botao('Adicionar destino de valuto/api em hml', painel())!.click();
      await estavel();

      digitar(campo('Nome do destino'), 'cluster-a');
      digitar(campo('Chave 1'), 'KUBE_CONTEXT');
      digitar(campo('Valor 1'), 'ctx-a');
      botao('Salvar destino')!.click();
      await estavel();

      expect(api['criarDestino']).toHaveBeenCalledWith('p1', 'hml', {
        nome: 'cluster-a',
        configuracao: { KUBE_CONTEXT: 'ctx-a' },
        ordem: 1,
      });
      expect(document.querySelector('[role=dialog]')).toBeNull();
    });

    it('mostra na gaveta a recusa de chave com nome de segredo', async () => {
      await montar();
      api['criarDestino'].mockRejectedValue(erroDaApi('destino.configuracao-com-segredo'));
      await abrirAba('Ambientes e destinos');
      botao('Adicionar destino de valuto/api em hml', painel())!.click();
      await estavel();

      digitar(campo('Nome do destino'), 'x');
      digitar(campo('Chave 1'), 'DB_PASSWORD');
      digitar(campo('Valor 1'), 'segredo');
      botao('Salvar destino')!.click();
      await estavel();

      const aviso = document.querySelector('[role=dialog] [role=alert]');
      expect(aviso?.textContent).toContain('variável do GitLab');
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
    });

    it('remove um destino existente', async () => {
      const d = detalhe();
      d.projetos![0].ambientes![1].destinos = [{ id: 'd1', nome: 'cluster-a', configuracao: { KUBE_CONTEXT: 'a' }, ordem: 1 }];
      await montar(true, d);
      await abrirAba('Ambientes e destinos');

      botao('Remover destino cluster-a', painel())!.click();
      await estavel();

      expect(api['removerDestino']).toHaveBeenCalledWith('p1', 'hml', 'd1');
    });

    it('sem permissão, as ações de ambiente e destino não aparecem (critério 18)', async () => {
      await montar(false);
      await abrirAba('Ambientes e destinos');

      expect(botao(/Adicionar destino/, painel())).toBeUndefined();
      expect((painel().querySelector('input[aria-label="valuto/api em hml"]') as HTMLInputElement).disabled).toBe(true);
    });
  });
});
