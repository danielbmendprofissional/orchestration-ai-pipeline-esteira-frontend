import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { FatiasApiService } from '../fatias-api.service';
import type { AcaoDaFatia, FatiaDoPainel, Gaveta, PainelLista } from '../fatias.tipos';
import { FatiasPage } from './fatias.page';

const livre = { pode: true, motivo: null };
const fatia = (): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2b', titulo: 'Ações do bot', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
  acoes: { podeAbrirReview: livre, podeAprovar: livre, podeReprovar: livre }, review: { estado: 'nenhum', link: null }, decisao: 'falhou',
});
const lista = (): PainelLista => ({
  itens: [fatia()], pagina: 1, tamanhoPagina: 20, total: 1, totalPaginas: 1, avisos: [],
  aplicacoes: [{ id: 'a1', nome: 'Valuto', sigla: 'VLT', geradoEm: '2026-11-23T10:00:00Z', desatualizado: false }],
  geradoEm: '2026-11-23T10:00:00Z', desatualizado: false,
});
const falhada: AcaoDaFatia = {
  id: 'x1', tipo: 'aprovar', estado: 'falhou', repositorio: 'api', mrIid: 7, pedidaPor: 'Ana', pedidaEm: '2026-11-23T10:00:00Z',
  atualizadaEm: '2026-11-23T10:00:00Z', codigoErro: 'gitlab.merge-recusado', comentario: null, podeReexecutar: livre,
};
const gaveta = (): Gaveta => ({
  aplicacaoId: 'a1', codigo: 'P2b', titulo: 'Ações do bot', estado: 'em-revisao', progresso: null, emCorrecao: false, formatoAnterior: false,
  spec: { disponivel: true, caminho: 'specs/p2b.md', link: null, risco: 'alto', formatoAnterior: false },
  mae: null, filhas: [], repositorios: [], tasks: [], acoesPedidas: [falhada], decisao: 'falhou',
});

describe('[P2b] FatiasPage: Reexecutar na gaveta', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<FatiasPage>;

  async function montar(flag = true) {
    api = {
      listar: vi.fn(async () => lista()),
      atualizar: vi.fn(),
      gaveta: vi.fn(async () => gaveta()),
      hotfixes: vi.fn(async () => ({ aplicacaoId: 'a1', itens: [], aviso: null })),
      reexecutar: vi.fn(async () => ({ acoes: [{ id: 'x2', tipo: 'aprovar', estado: 'pedida', repositorio: 'api', mrIid: 7 }] })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FatiasApiService, useValue: api },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => flag && c === 'P2' } },
      ],
    });
    fixture = TestBed.createComponent(FatiasPage);
    await estavel();
    fixture.nativeElement.querySelector('[data-testid="fatia-abrir"]').click();
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
  const reexecutar = () => document.querySelector<HTMLButtonElement>('[data-testid="gaveta-reexecutar"]');
  const aviso = () => document.querySelector<HTMLElement>('[data-testid="gaveta-aviso"]');

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('aceito (202): chama a rota da Ação, mostra o estado como texto e recarrega a lista e a gaveta', async () => {
    await montar();
    const listagens = api['listar'].mock.calls.length;
    const gavetas = api['gaveta'].mock.calls.length;

    reexecutar()!.click();
    await estavel();

    expect(api['reexecutar']).toHaveBeenCalledWith('a1', 'P2b', 'x1');
    expect(api['listar'].mock.calls.length).toBe(listagens + 1);
    expect(api['gaveta'].mock.calls.length).toBe(gavetas + 1);
    expect(aviso()!.getAttribute('role')).toBe('status');
    expect(aviso()!.textContent).toContain('Reexecução pedida');
  });

  it('recusado com erro de negócio: mostra o texto da API no aviso da gaveta e recarrega a lista', async () => {
    await montar();
    api['reexecutar'].mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { errors: [{ code: 'fatia.sem-mr-aberta', message: 'A Fatia não tem MR aberta.', type: 'Conflict' }] } }),
    );
    const listagens = api['listar'].mock.calls.length;

    reexecutar()!.click();
    await estavel();

    expect(aviso()!.getAttribute('role')).toBe('alert');
    expect(aviso()!.textContent).toContain('A Fatia não tem MR aberta.');
    expect(api['listar'].mock.calls.length).toBe(listagens + 1);
  });

  it('flag desligada: a gaveta não tem botão', async () => {
    await montar(false);
    expect(reexecutar()).toBeNull();
  });
});
