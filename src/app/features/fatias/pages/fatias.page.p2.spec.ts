import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { FatiasApiService } from '../fatias-api.service';
import type { FatiaDoPainel, Gaveta, PainelLista } from '../fatias.tipos';
import { FatiasPage } from './fatias.page';

const livre = { pode: true, motivo: null };
const fatia: FatiaDoPainel = {
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2', titulo: 'Review e aprovação', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api', 'frontend'], specDisponivel: true,
  acoes: { podeAbrirReview: livre, podeAprovar: livre, podeReprovar: livre }, review: { estado: 'nenhum', link: null }, decisao: 'nenhuma',
};
const lista = (): PainelLista => ({
  itens: [fatia], pagina: 1, tamanhoPagina: 20, total: 1, totalPaginas: 1, avisos: [],
  aplicacoes: [{ id: 'a1', nome: 'Valuto', sigla: 'VLT', geradoEm: '2026-11-23T10:00:00Z', desatualizado: false }],
  geradoEm: '2026-11-23T10:00:00Z', desatualizado: false,
});
const pedidas = { acoes: [{ id: 'x1', tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] };
const conflito = (code: string, message: string) => new HttpErrorResponse({ status: 409, error: { errors: [{ code, message, type: 'Conflict' }] } });

describe('[P2] FatiasPage: decisões', () => {
  let api: Record<'listar' | 'atualizar' | 'gaveta' | 'hotfixes' | 'abrirReview' | 'aprovar' | 'reprovar', ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<FatiasPage>;
  let raiz: HTMLElement;

  async function montar(flag = true) {
    api = {
      listar: vi.fn(async () => lista()),
      atualizar: vi.fn(async () => undefined),
      gaveta: vi.fn(async (): Promise<Gaveta> => {
        throw new Error('sem gaveta');
      }),
      hotfixes: vi.fn(async () => ({ aplicacaoId: 'a1', itens: [], aviso: null })),
      abrirReview: vi.fn(async () => ({ acoes: [] })),
      aprovar: vi.fn(async () => pedidas),
      reprovar: vi.fn(async () => pedidas),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FatiasApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => flag && c === 'P2' } },
      ],
    });
    fixture = TestBed.createComponent(FatiasPage);
    raiz = fixture.nativeElement;
    await estavel();
  }
  const estavel = async () => {
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 10));
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.detectChanges();
  };
  const botao = (id: string) => raiz.querySelector<HTMLButtonElement>(`[data-testid="acao-${id}"]`)!;
  const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const digitar = async (texto: string) => {
    const campo = document.querySelector<HTMLTextAreaElement>('[data-testid="reprovar-comentario"]')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    await estavel();
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('flag desligada: nenhum botão de decisão na linha', async () => {
    await montar(false);
    expect(raiz.querySelectorAll('[data-testid^="acao-"]')).toHaveLength(0);
  });

  it('Abrir review pede direto, sem diálogo', async () => {
    await montar();
    botao('abrir-review').click();
    await estavel();
    expect(api.abrirReview).toHaveBeenCalledWith('a1', 'P2');
    expect(dialogo()).toBeNull();
  });

  it('Reprovar abre o diálogo e só chama a API com o comentário; depois fecha', async () => {
    await montar();
    botao('reprovar').click();
    await estavel();
    expect(dialogo()!.textContent).toContain('Reprovar P2');
    expect(api.reprovar).not.toHaveBeenCalled();
    await digitar('faltou teste');
    document.querySelector<HTMLButtonElement>('[data-testid="reprovar-confirmar"]')!.click();
    await estavel();
    expect(api.reprovar).toHaveBeenCalledWith('a1', 'P2', 'faltou teste');
    expect(api.listar.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(dialogo()).toBeNull();
  });

  it('erro de negócio no Reprovar fica no diálogo, que continua aberto com o comentário', async () => {
    await montar();
    api.reprovar.mockRejectedValueOnce(conflito('fatia.sem-mr-aberta', 'A Fatia não tem MR aberta.'));
    botao('reprovar').click();
    await estavel();
    await digitar('motivo');
    document.querySelector<HTMLButtonElement>('[data-testid="reprovar-confirmar"]')!.click();
    await estavel();
    expect(dialogo()!.querySelector('[role="alert"]')!.textContent).toContain('A Fatia não tem MR aberta.');
    expect(document.querySelector<HTMLTextAreaElement>('[data-testid="reprovar-comentario"]')!.value).toBe('motivo');
  });

  it('Aprovar abre a confirmação com as MRs (por projeto) e só então chama a API', async () => {
    await montar();
    botao('aprovar').click();
    await estavel();
    expect(dialogo()!.querySelectorAll('[data-testid="aprovar-mr"]')).toHaveLength(2);
    expect(api.aprovar).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('[data-testid="aprovar-confirmar"]')!.click();
    await estavel();
    expect(api.aprovar).toHaveBeenCalledWith('a1', 'P2');
    expect(dialogo()).toBeNull();
  });

  it('erro de negócio no Aprovar aparece no diálogo com o texto da API', async () => {
    await montar();
    api.aprovar.mockRejectedValueOnce(conflito('fatia.ci-nao-verde', 'CI da MR !7 não está verde.'));
    botao('aprovar').click();
    await estavel();
    document.querySelector<HTMLButtonElement>('[data-testid="aprovar-confirmar"]')!.click();
    await estavel();
    expect(dialogo()!.querySelector('[role="alert"]')!.textContent).toContain('CI da MR !7 não está verde.');
  });

  it('Cancelar fecha o diálogo sem chamar a API', async () => {
    await montar();
    botao('aprovar').click();
    await estavel();
    document.querySelector<HTMLButtonElement>('[data-testid="aprovar-cancelar"]')!.click();
    await estavel();
    expect(dialogo()).toBeNull();
    expect(api.aprovar).not.toHaveBeenCalled();
  });
});
