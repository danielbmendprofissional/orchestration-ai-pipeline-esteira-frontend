import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FatiaDoPainel, Gaveta } from '../fatias.tipos';
import { FatiaGavetaComponent } from './fatia-gaveta.component';

const fatia: FatiaDoPainel = {
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P1.1', titulo: 'Extrato em PDF', estado: 'em-execucao', progresso: '3/5 tasks',
  emCorrecao: false, formatoAnterior: false, risco: 'medio', status: 'aprovada', statusReconhecido: true, repositorios: ['api', 'frontend'], specDisponivel: true,
};
const gaveta = (extra: Partial<Gaveta> = {}): Gaveta => ({
  aplicacaoId: 'a1', codigo: 'P1.1', titulo: 'Extrato em PDF', estado: 'em-execucao', progresso: '3/5 tasks', emCorrecao: false, formatoAnterior: false,
  spec: { disponivel: true, caminho: 'specs/feature/p1.md', link: 'https://gitlab.exemplo.local/ws/-/blob/main/specs/p1.md', risco: 'medio', formatoAnterior: false },
  mae: { numero: 40, titulo: 'P1.1 — Extrato', estado: 'opened', link: 'https://gitlab.exemplo.local/ws/-/issues/40' },
  filhas: [{ numero: 41, titulo: 'P1.1.1 — Dados', estado: 'closed', link: 'https://gitlab.exemplo.local/ws/-/issues/41' }],
  repositorios: [
    {
      repositorio: 'api', branch: 'feature/p1-extrato', linkBranch: 'https://gitlab.exemplo.local/api/-/tree/feature/p1-extrato',
      mrs: [{ iid: 7, titulo: 'P1: extrato', estado: 'opened', branch: 'feature/p1-extrato', statusPipeline: 'success', link: 'https://gitlab.exemplo.local/api/-/merge_requests/7', linkBranch: null }],
    },
    { repositorio: 'frontend', branch: 'feature/p1-extrato', linkBranch: null, mrs: [] },
  ],
  tasks: [
    { codigo: 'P1.1.1', numero: 1, issue: 41, linkIssue: 'https://gitlab.exemplo.local/ws/-/issues/41', feita: true, emAndamento: false, reviewPass: true, sha: 'a1b2c3d', executor: 'backend', repositorio: 'api', linkCommit: 'https://gitlab.exemplo.local/api/-/commit/a1b2c3d' },
    { codigo: 'P1.1.2', numero: 2, issue: 42, linkIssue: null, feita: false, emAndamento: true, reviewPass: false, sha: null, executor: null, repositorio: null, linkCommit: null },
  ],
  ...extra,
});

describe('[P1] FatiaGavetaComponent', () => {
  let fixture: ComponentFixture<FatiaGavetaComponent>;
  let fechar: ReturnType<typeof vi.fn<() => void>>;
  let tentar: ReturnType<typeof vi.fn<() => void>>;

  async function montar(entradas: { aberta?: boolean; gaveta?: Gaveta | null; carregando?: boolean; falhou?: boolean } = {}) {
    fixture = TestBed.createComponent(FatiaGavetaComponent);
    const valores = { aberta: true, fatia, gaveta: gaveta(), carregando: false, falhou: false, ...entradas };
    for (const [k, v] of Object.entries(valores)) fixture.componentRef.setInput(k, v);
    fechar = vi.fn<() => void>();
    tentar = vi.fn<() => void>();
    fixture.componentInstance.fechar.subscribe(() => fechar());
    fixture.componentInstance.tentarDeNovo.subscribe(() => tentar());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const painel = () => document.querySelector<HTMLElement>('[data-testid="gaveta"]');
  const links = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-testid="gaveta"] a'));

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('é um diálogo com o título da Fatia (código em mono e badge de estado)', async () => {
    await montar();
    expect(painel()!.closest('[role="dialog"]')).not.toBeNull();
    expect(painel()!.querySelector('h2')!.textContent).toContain('Extrato em PDF');
    expect(painel()!.textContent).toContain('P1.1');
    expect(painel()!.querySelector('[data-testid="estado-badge"]')!.textContent).toContain('Em execução');
  });

  it('[X1] "ver na auditoria" só com a Auditoria ligada, filtrando pelo código da Fatia', async () => {
    await montar();
    expect(painel()!.querySelector('[data-testid="ver-na-auditoria"]')).toBeNull();
    fixture.componentRef.setInput('auditoriaLigada', true);
    fixture.detectChanges();
    const a = painel()!.querySelector<HTMLAnchorElement>('[data-testid="ver-na-auditoria"]')!;
    expect(a.getAttribute('href')).toBe('/auditoria?objeto=P1.1');
  });

  it('fechada, não desenha nada', async () => {
    await montar({ aberta: false });
    expect(painel()).toBeNull();
  });

  it('mostra spec, issue-mãe, filhas, branch, MR com status do pipeline e tasks com commit', async () => {
    await montar();
    const texto = painel()!.textContent!;
    expect(texto).toContain('specs/feature/p1.md');
    expect(texto).toContain('#40');
    expect(texto).toContain('P1.1 — Extrato');
    expect(texto).toContain('#41');
    expect(texto).toContain('feature/p1-extrato');
    expect(texto).toContain('!7');
    expect(texto).toContain('pipeline verde');
    expect(texto).toContain('P1.1.1');
    expect(texto).toContain('a1b2c3d');
    expect(texto).toContain('P1.1.2');
    const hrefs = links().map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://gitlab.exemplo.local/ws/-/blob/main/specs/p1.md');
    expect(hrefs).toContain('https://gitlab.exemplo.local/api/-/merge_requests/7');
    expect(hrefs).toContain('https://gitlab.exemplo.local/api/-/commit/a1b2c3d');
  });

  it('tasks: estado em texto (feita, em andamento) e review aprovado', async () => {
    await montar();
    const tasks = Array.from(document.querySelectorAll('[data-testid="gaveta-task"]'));
    expect(tasks).toHaveLength(2);
    expect(tasks[0].textContent).toContain('feita');
    expect(tasks[0].textContent).toContain('review PASS');
    expect(tasks[1].textContent).toContain('em andamento');
  });

  it('todo link externo abre em outra aba com rel noopener', async () => {
    await montar();
    expect(links().length).toBeGreaterThan(0);
    for (const a of links()) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('ignora link que não é http/https: mostra o texto, sem âncora (critério 17)', async () => {
    const g = gaveta();
    g.spec.link = 'javascript:alert(1)';
    g.mae!.link = 'data:text/html,<b>x</b>';
    g.tasks[0].linkCommit = 'javascript:alert(2)';
    await montar({ gaveta: g });
    const hrefs = links().map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => /^(javascript|data):/i.test(h))).toBe(false);
    expect(painel()!.textContent).toContain('specs/feature/p1.md');
    expect(painel()!.textContent).toContain('#40');
  });

  it('texto vindo do GitLab com marcação é só texto (critério 17)', async () => {
    const g = gaveta();
    g.mae!.titulo = '<img src=x onerror=alert(1)>';
    g.repositorios[0].mrs[0].titulo = '<script>alert(2)</script>';
    await montar({ gaveta: g });
    expect(painel()!.querySelector('img, script')).toBeNull();
    expect(painel()!.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(painel()!.textContent).toContain('<script>alert(2)</script>');
  });

  it('Fatia sem spec nem mãe: diz que ainda não existe, sem link quebrado', async () => {
    await montar({
      gaveta: gaveta({ spec: { disponivel: false, caminho: null, link: null, risco: null, formatoAnterior: false }, mae: null, filhas: [], repositorios: [], tasks: [] }),
    });
    expect(painel()!.textContent).toContain('Spec ainda não disponível');
    expect(painel()!.textContent).toContain('Sem issue-mãe');
    expect(links()).toHaveLength(0);
  });

  it('carregando: mostra o estado de carga com o cabeçalho da Fatia já conhecido', async () => {
    await montar({ gaveta: null, carregando: true });
    expect(painel()!.querySelector('[role="status"]')!.textContent).toContain('Carregando');
    expect(painel()!.querySelector('h2')!.textContent).toContain('Extrato em PDF');
  });

  it('falha: alerta com "Tentar de novo"', async () => {
    await montar({ gaveta: null, falhou: true });
    expect(painel()!.querySelector('[role="alert"]')).not.toBeNull();
    Array.from(painel()!.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar de novo'))!.click();
    expect(tentar).toHaveBeenCalledTimes(1);
  });

  it('o botão Fechar emite o fechamento', async () => {
    await montar();
    painel()!.querySelector<HTMLButtonElement>('[data-testid="gaveta-fechar"]')!.click();
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('é só leitura: nenhum botão além de fechar e tentar de novo, nenhuma caixa de seleção (critério 19)', async () => {
    await montar();
    const botoes = Array.from(painel()!.querySelectorAll('button')).map((b) => b.getAttribute('data-testid'));
    expect(botoes.every((b) => b === 'gaveta-fechar')).toBe(true);
    expect(painel()!.querySelector('input, textarea, select')).toBeNull();
  });
});
