import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoDetalhe, PermissoesAplicacao, ProjetoResumo } from '../aplicacoes.tipos';
import { AplicacaoDetalhePage } from './aplicacao-detalhe.page';

const AGORA = '2026-11-27T12:00:00Z';
const projeto = (id: string, nome: string, webhook?: ProjetoResumo['webhook']): ProjetoResumo => ({
  id, nome, caminho: `valuto/${nome}`, stack: 'dotnet', ativo: true, dependeDe: [], ambientes: [], ...(webhook ? { webhook } : {}),
});
const detalhe = (): AplicacaoDetalhe => ({
  id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', ativa: true, politicas: [], papeis: [],
  projetos: [
    projeto('p1', 'api', { estado: 'falhou', codigoErro: 'webhook.bot-nao-configurado', atualizadaEm: AGORA }),
    projeto('p2', 'web', { estado: 'registrado', atualizadaEm: AGORA }),
    projeto('p3', 'worker', { estado: 'pendente', atualizadaEm: AGORA }),
    projeto('p4', 'docs'),
  ],
});
const permissoes = (v: boolean): PermissoesAplicacao => ({ podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v });

describe('[T1] AplicacaoDetalhePage: estado do webhook do Projeto', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacaoDetalhePage>;
  let raiz: HTMLElement;

  const estavel = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  async function montar(opcoes: { flag?: boolean; mor?: boolean } = {}) {
    const { flag = true, mor = true } = opcoes;
    api = {
      obter: vi.fn(async () => detalhe()),
      permissoes: vi.fn(async () => permissoes(mor)),
      reexecutarWebhook: vi.fn(async () => ({ estado: 'pendente', atualizadaEm: AGORA })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AplicacoesApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (f: string) => flag && f === 'T1' } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a1' })) } },
      ],
    });
    fixture = TestBed.createComponent(AplicacaoDetalhePage);
    raiz = fixture.nativeElement as HTMLElement;
    await estavel();
    Array.from(raiz.querySelectorAll<HTMLElement>('[role=tab]')).find((t) => t.textContent?.includes('Projetos'))!.click();
    await estavel();
  }
  const painel = () => raiz.querySelector('[role=tabpanel]:not([hidden])') as HTMLElement;
  const reexecutar = () => painel().querySelector<HTMLButtonElement>('button[aria-label^="Reexecutar"]');

  it('flag T1 desligado: a tela do Projeto não mostra webhook nem Reexecutar', async () => {
    await montar({ flag: false });
    expect(painel().textContent).not.toContain('Webhook');
    expect(reexecutar()).toBeNull();
  });

  it('mostra o estado do webhook de cada Projeto, com o código de erro traduzido', async () => {
    await montar();
    const linhas = Array.from(painel().querySelectorAll('tbody tr')).map((l) => l.textContent ?? '');
    expect(painel().textContent).toContain('Webhook');
    expect(linhas[0]).toContain('Falhou');
    expect(linhas[0]).toContain('O bot da Esteira não está configurado');
    expect(linhas[0]).not.toContain('webhook.bot-nao-configurado');
    expect(linhas[1]).toContain('Registrado');
    expect(linhas[2]).toContain('Pendente');
    expect(linhas[3]).toContain('Sem registro');
  });

  it('MOR vê Reexecutar só no Projeto com webhook falhou; clicar chama a API e passa a Pendente', async () => {
    await montar();
    expect(painel().querySelectorAll('button[aria-label^="Reexecutar"]').length).toBe(1);

    reexecutar()!.click();
    await estavel();

    expect(api['reexecutarWebhook']).toHaveBeenCalledWith('p1');
    expect(painel().querySelectorAll('tbody tr')[0].textContent).toContain('Pendente');
    expect(reexecutar()).toBeNull();
  });

  it('quem não é MOR vê o estado, mas não o botão Reexecutar', async () => {
    await montar({ mor: false });
    expect(painel().textContent).toContain('Falhou');
    expect(reexecutar()).toBeNull();
  });

  it('409 webhook.nao-reexecutavel: mostra a mensagem junto da lista', async () => {
    await montar();
    api['reexecutarWebhook'].mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { errors: [{ code: 'webhook.nao-reexecutavel', message: 'x', type: 'Conflict' }] } }),
    );
    reexecutar()!.click();
    await estavel();
    expect(painel().querySelector('[role=alert]')?.textContent).toContain('só pode ser reexecutado quando falhou');
  });
});
