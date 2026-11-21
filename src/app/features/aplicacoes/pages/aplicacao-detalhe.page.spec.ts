import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoDetalhe, PermissoesAplicacao } from '../aplicacoes.tipos';
import { AplicacaoDetalhePage } from './aplicacao-detalhe.page';

const detalhe: AplicacaoDetalhe = { id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true };
const permissoes = (v: boolean): PermissoesAplicacao => ({
  podeEditar: v,
  podeEditarCadastro: v,
  podeEditarPolitica: v,
  podeGerenciarPapeis: v,
});
const erroDaApi = (code: string, status = 422) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg da API', type: 'Validation' }] } });

describe('[A1] AplicacaoDetalhePage', () => {
  let api: Record<'obter' | 'permissoes' | 'alterar', ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacaoDetalhePage>;
  let raiz: HTMLElement;

  async function montar(pode: boolean) {
    api = {
      obter: vi.fn(async () => detalhe),
      permissoes: vi.fn(async () => permissoes(pode)),
      alterar: vi.fn(async () => ({ id: 'a1', nome: 'Valuto Novo', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 0, ativa: true })),
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
  const digitar = (el: HTMLInputElement, texto: string) => {
    el.value = texto;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const campo = (rotulo: string) => {
    const label = Array.from(document.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(rotulo));
    return document.getElementById(label!.getAttribute('for')!) as HTMLInputElement;
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('mostra o nome, a sigla, o grupo e a situação no cabeçalho', async () => {
    await montar(true);

    expect(raiz.querySelector('h1')?.textContent).toContain('Valuto');
    expect(raiz.textContent).toContain('VLT');
    expect(raiz.textContent).toContain('valuto');
    expect(raiz.textContent).toContain('Ativa');
  });

  it('monta as 5 abas, com a Cadastro selecionada', async () => {
    await montar(true);

    const abas = Array.from(raiz.querySelectorAll('[role=tab]')).map((t) => t.textContent?.trim());
    expect(abas).toEqual(['Cadastro', 'Projetos', 'Ambientes e destinos', 'Política de segurança', 'Pessoas e papéis']);
    expect(raiz.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain('Cadastro');
  });

  it('as abas ainda não implementadas mostram "em construção"', async () => {
    await montar(true);

    const projetos = Array.from(raiz.querySelectorAll<HTMLElement>('[role=tab]')).find((t) => t.textContent?.includes('Projetos'))!;
    projetos.click();
    await estavel();

    expect(raiz.querySelector('[role=tabpanel]:not([hidden])')?.textContent).toContain('em construção');
  });

  it('com permissão, a aba Cadastro oferece editar; sem permissão a ação nem aparece (critério 18)', async () => {
    await montar(true);
    expect(botao('Editar aplicação', raiz)).toBeDefined();

    TestBed.resetTestingModule();
    await montar(false);
    expect(botao(/Editar/, raiz)).toBeUndefined();
    expect(raiz.textContent).toContain('Somente leitura');
  });

  it('edita nome, sigla e situação na gaveta e atualiza o cabeçalho', async () => {
    await montar(true);
    botao('Editar aplicação', raiz)!.click();
    await estavel();

    expect(campo('Nome').value).toBe('Valuto');
    digitar(campo('Nome'), 'Valuto Novo');
    botao('Salvar')!.click();
    await estavel();

    expect(api.alterar).toHaveBeenCalledWith('a1', { nome: 'Valuto Novo', sigla: 'VLT', ativa: true });
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(raiz.querySelector('h1')?.textContent).toContain('Valuto Novo');
  });

  it('mostra sigla duplicada no campo da sigla ao editar', async () => {
    await montar(true);
    botao('Editar aplicação', raiz)!.click();
    await estavel();
    api.alterar.mockRejectedValue(erroDaApi('aplicacao.sigla-duplicada'));

    botao('Salvar')!.click();
    await estavel();

    const sigla = campo('Sigla');
    expect(sigla.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(sigla.getAttribute('aria-describedby')!)?.textContent).toContain('sigla');
  });

  it('na edição o grupo do GitLab é só leitura', async () => {
    await montar(true);
    botao('Editar aplicação', raiz)!.click();
    await estavel();

    expect(campo('Grupo do GitLab').readOnly).toBe(true);
  });

  it('Aplicação inexistente (404) mostra o aviso de não encontrada', async () => {
    api = {
      obter: vi.fn(async () => Promise.reject(erroDaApi('aplicacao.nao-encontrada', 404))),
      permissoes: vi.fn(async () => Promise.reject(erroDaApi('aplicacao.nao-encontrada', 404))),
      alterar: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AplicacoesApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'zz' })) } },
      ],
    });
    fixture = TestBed.createComponent(AplicacaoDetalhePage);
    raiz = fixture.nativeElement as HTMLElement;
    await estavel();

    expect(raiz.textContent).toContain('Aplicação não encontrada');
  });
});
