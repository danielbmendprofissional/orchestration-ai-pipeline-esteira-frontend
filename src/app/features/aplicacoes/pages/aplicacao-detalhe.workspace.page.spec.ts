import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoDetalhe, PermissoesAplicacao } from '../aplicacoes.tipos';
import { AplicacaoDetalhePage } from './aplicacao-detalhe.page';

const permissoes = (v: boolean): PermissoesAplicacao => ({ podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v, podeEditarTetoCusto: v });
const erroDaApi = (code: string, status = 422) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg da API', type: 'Validation' }] } });
const base = (): AplicacaoDetalhe => ({ id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true });
const comWorkspace = (): AplicacaoDetalhe => ({ ...base(), workspace: { projetoGitLabId: 9, caminho: 'valuto/workspace' } });

describe('[P1] AplicacaoDetalhePage — campo Workspace', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacaoDetalhePage>;
  let raiz: HTMLElement;

  async function montar(opcoes: { pode?: boolean; flag?: boolean; dados?: AplicacaoDetalhe } = {}) {
    const { pode = true, flag = true, dados = base() } = opcoes;
    api = {
      obter: vi.fn(async () => dados),
      permissoes: vi.fn(async () => permissoes(pode)),
      projetosDoGrupo: vi.fn(async () => [
        { projetoGitLabId: 1, caminho: 'valuto/api', nome: 'api', cadastrado: true, stackSugerida: 'dotnet' },
        { projetoGitLabId: 9, caminho: 'valuto/workspace', nome: 'workspace', cadastrado: false, stackSugerida: null },
        { projetoGitLabId: 10, caminho: 'valuto/<b>docs</b>', nome: 'docs', cadastrado: false, stackSugerida: null },
      ]),
      definirWorkspace: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AplicacoesApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => flag && c === 'P1' } },
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
  const el = <T extends HTMLElement>(id: string) => raiz.querySelector<T>(`[data-testid="${id}"]`);
  const escolher = async (valor: string) => {
    const s = el<HTMLSelectElement>('workspace-select')!;
    s.value = valor;
    s.dispatchEvent(new Event('change', { bubbles: true }));
    await estavel();
  };

  it('com o flag P1 desligado o campo não aparece e a lista do grupo não é buscada', async () => {
    await montar({ flag: false });

    expect(el('workspace-campo')).toBeNull();
    expect(api['projetosDoGrupo']).not.toHaveBeenCalled();
  });

  it('com o flag ligado mostra o seletor só com os projetos não cadastrados do grupo', async () => {
    await montar();

    const opcoes = Array.from(el<HTMLSelectElement>('workspace-select')!.options).map((o) => o.textContent?.trim());
    expect(opcoes).toContain('valuto/workspace');
    expect(opcoes).not.toContain('valuto/api');
    expect(raiz.textContent).toContain('Workspace');
  });

  it('mostra o caminho do workspace atual', async () => {
    await montar({ dados: comWorkspace() });

    expect(el('workspace-atual')?.textContent).toContain('valuto/workspace');
  });

  it('sem podeEditarCadastro mostra só leitura: sem seletor nem botões', async () => {
    await montar({ pode: false, dados: comWorkspace() });

    expect(el('workspace-atual')?.textContent).toContain('valuto/workspace');
    expect(el('workspace-select')).toBeNull();
    expect(el('workspace-salvar')).toBeNull();
    expect(el('workspace-limpar')).toBeNull();
  });

  it('salva o projeto escolhido por PUT e passa a mostrar o caminho', async () => {
    await montar();
    await escolher('9');

    el<HTMLButtonElement>('workspace-salvar')!.click();
    await estavel();

    expect(api['definirWorkspace']).toHaveBeenCalledWith('a1', 9);
    expect(el('workspace-atual')?.textContent).toContain('valuto/workspace');
  });

  it('limpar manda null', async () => {
    await montar({ dados: comWorkspace() });

    el<HTMLButtonElement>('workspace-limpar')!.click();
    await estavel();

    expect(api['definirWorkspace']).toHaveBeenCalledWith('a1', null);
    expect(el('workspace-atual')?.textContent).not.toContain('valuto/workspace');
  });

  it('mostra a recusa da API junto do campo, ligada por aria-describedby', async () => {
    await montar();
    api['definirWorkspace'].mockRejectedValue(erroDaApi('aplicacao.workspace-e-projeto', 409));
    await escolher('9');

    el<HTMLButtonElement>('workspace-salvar')!.click();
    await estavel();

    const erro = el('workspace-erro')!;
    expect(erro.getAttribute('role')).toBe('alert');
    expect(erro.textContent?.trim().length).toBeGreaterThan(0);
    expect(el('workspace-select')!.getAttribute('aria-describedby')).toContain(erro.id);
  });

  it('texto do GitLab com marcação aparece como texto, nunca como HTML', async () => {
    await montar();

    expect(raiz.querySelector('b')).toBeNull();
    expect(Array.from(el<HTMLSelectElement>('workspace-select')!.options).map((o) => o.textContent?.trim())).toContain('valuto/<b>docs</b>');
  });
});
