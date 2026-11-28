import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoDetalhe, PermissoesAplicacao } from '../aplicacoes.tipos';
import { AplicacaoDetalhePage } from './aplicacao-detalhe.page';

const permissoes = (v: boolean, teto: boolean): PermissoesAplicacao => ({ podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v, podeEditarTetoCusto: teto });
const detalhe = (): AplicacaoDetalhe => ({ id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true, tetoCusto: { padraoUsd: 2, efetivoUsd: 2 } });

describe('[X3] AplicacaoDetalhePage — teto de custo', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacaoDetalhePage>;

  async function montar(opcoes: { flag?: boolean; teto?: boolean } = {}) {
    const { flag = true, teto = true } = opcoes;
    api = {
      obter: vi.fn(async () => detalhe()),
      permissoes: vi.fn(async () => permissoes(true, teto)),
      projetosDoGrupo: vi.fn(async () => []),
      definirTetoCusto: vi.fn(async (_id: string, v: number | null) => ({ ...(v === null ? {} : { tetoCustoUsd: v }), padraoUsd: 2, efetivoUsd: v ?? 2 })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AplicacoesApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => flag && c === 'X3' } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a1' })) } },
      ],
    });
    fixture = TestBed.createComponent(AplicacaoDetalhePage);
    await estavel();
  }
  const estavel = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const el = <T extends HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`);

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('com o flag X3 desligado o campo não aparece', async () => {
    await montar({ flag: false });

    expect(el('teto-valor')).toBeNull();
    expect(el('teto-alterar')).toBeNull();
  });

  it('sem podeEditarTetoCusto mostra o valor mas esconde "Alterar teto"', async () => {
    await montar({ teto: false });

    expect(el('teto-valor')?.textContent).toContain('2,00');
    expect(el('teto-alterar')).toBeNull();
  });

  it('altera o teto pela gaveta e passa a mostrá-lo sem a marca de padrão', async () => {
    await montar();
    el<HTMLButtonElement>('teto-alterar')!.click();
    await estavel();
    const i = el<HTMLInputElement>('teto-input')!;
    i.value = '4';
    i.dispatchEvent(new Event('input', { bubbles: true }));
    el<HTMLButtonElement>('teto-salvar')!.click();
    await estavel();

    expect(api['definirTetoCusto']).toHaveBeenCalledWith('a1', 4);
    expect(el('teto-valor')?.textContent).toContain('4,00');
  });

  it('mostra o erro da API (aplicacao.teto-invalido) no campo', async () => {
    await montar();
    api['definirTetoCusto'].mockRejectedValue(
      new HttpErrorResponse({ status: 422, error: { errors: [{ code: 'aplicacao.teto-invalido', message: 'm', type: 'Validation' }] } }),
    );
    el<HTMLButtonElement>('teto-alterar')!.click();
    await estavel();
    const i = el<HTMLInputElement>('teto-input')!;
    i.value = '99';
    i.dispatchEvent(new Event('input', { bubbles: true }));
    el<HTMLButtonElement>('teto-salvar')!.click();
    await estavel();

    expect(el('teto-erro')?.textContent).toContain('entre 0,10 e 50,00');
  });
});
