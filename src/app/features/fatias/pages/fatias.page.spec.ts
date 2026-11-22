import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FatiasApiService } from '../fatias-api.service';
import { horaDosDados } from '../fatias.apresentacao';
import type { FatiaDoPainel, Gaveta, PainelLista } from '../fatias.tipos';
import { FatiasPage } from './fatias.page';

const GERADO = '2026-11-22T14:05:00Z';
const fatia = (codigo: string, extra: Partial<FatiaDoPainel> = {}): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo, titulo: `Título ${codigo}`, estado: 'em-execucao', progresso: '2/5 tasks',
  emCorrecao: false, formatoAnterior: false, risco: 'baixo', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
  ...extra,
});
const lista = (extra: Partial<PainelLista> = {}): PainelLista => ({
  itens: [fatia('V1'), fatia('V2', { formatoAnterior: true, repositorios: ['api', 'frontend'] })],
  pagina: 1, tamanhoPagina: 20, total: 2, totalPaginas: 1, avisos: [],
  aplicacoes: [
    { id: 'a1', nome: 'Valuto', sigla: 'VLT', geradoEm: GERADO, desatualizado: false },
    { id: 'a2', nome: 'Portal do Cliente', sigla: 'PCL', geradoEm: GERADO, desatualizado: false },
  ],
  geradoEm: GERADO, desatualizado: false, ...extra,
});
const gavetaDe = (codigo: string): Gaveta => ({
  aplicacaoId: 'a1', codigo, titulo: `Título ${codigo}`, estado: 'em-execucao', progresso: null, emCorrecao: false, formatoAnterior: false,
  spec: { disponivel: true, caminho: `specs/${codigo}.md`, link: 'https://gitlab.exemplo.local/ws/-/blob/main/x.md', risco: 'baixo', formatoAnterior: false },
  mae: null, filhas: [], repositorios: [], tasks: [],
});
const erroDaApi = (code: string, status = 429) =>
  new HttpErrorResponse({ status, error: { errors: [{ code, message: 'msg da API', type: 'Failure' }] } });

describe('[P1] FatiasPage', () => {
  let api: Record<'listar' | 'atualizar' | 'gaveta' | 'hotfixes', ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<FatiasPage>;
  let raiz: HTMLElement;

  async function montar(resposta: PainelLista | Error = lista()) {
    api = {
      listar: vi.fn(async () => {
        if (resposta instanceof Error) throw resposta;
        return resposta;
      }),
      atualizar: vi.fn(async () => undefined),
      gaveta: vi.fn(async (_a: string, codigo: string) => gavetaDe(codigo)),
      hotfixes: vi.fn(async () => ({ aplicacaoId: 'a1', itens: [], aviso: null })),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: FatiasApiService, useValue: api }] });
    fixture = TestBed.createComponent(FatiasPage);
    raiz = fixture.nativeElement as HTMLElement;
    await estavel();
  }
  const estavel = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const porTestId = (id: string) => raiz.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const aba = (nome: string) => Array.from(raiz.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => t.textContent?.includes(nome))!;
  const botao = (nome: string) => Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().includes(nome));
  const ultimaConsulta = () => api.listar.mock.calls.at(-1)! as [Record<string, unknown>, { pagina: number; tamanho: number }];

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('carrega a aba Em andamento ao abrir e mostra as Fatias', async () => {
    await montar();
    expect(raiz.querySelector('h1')!.textContent).toContain('Painel de Fatias');
    expect(ultimaConsulta()[0]).toEqual({ aba: 'andamento' });
    expect(raiz.querySelectorAll('[data-testid="fatia-linha"]')).toHaveLength(2);
    expect(raiz.textContent).toContain('formato anterior ao padrão');
  });

  describe('abas', () => {
    it('Em andamento, Prontas para Entrega e Todas, em tablist; só a aba atual está selecionada', async () => {
      await montar();
      expect(raiz.querySelector('[role="tablist"]')).not.toBeNull();
      expect(Array.from(raiz.querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim())).toEqual(['Em andamento', 'Prontas para Entrega', 'Todas']);
      expect(aba('Em andamento').getAttribute('aria-selected')).toBe('true');
      expect(aba('Todas').getAttribute('aria-selected')).toBe('false');
      expect(raiz.querySelector('[role="tabpanel"]')).not.toBeNull();
    });

    it('trocar de aba consulta a aba e volta para a página 1', async () => {
      await montar();
      aba('Prontas para Entrega').click();
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ aba: 'prontas' });
      expect(ultimaConsulta()[1].pagina).toBe(1);
      expect(aba('Prontas para Entrega').getAttribute('aria-selected')).toBe('true');
      aba('Todas').click();
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ aba: 'todas' });
    });

    it('setas movem entre as abas', async () => {
      await montar();
      aba('Em andamento').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ aba: 'prontas' });
    });
  });

  describe('filtros', () => {
    it('Fatia: filtra por código ou título ao confirmar', async () => {
      await montar();
      const campo = raiz.querySelector<HTMLInputElement>('[aria-label="Buscar Fatia"]')!;
      campo.value = 'extrato';
      campo.dispatchEvent(new Event('change', { bubbles: true }));
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ fatia: 'extrato' });
    });

    it('Projeto: API e Front alternam e voltam a Todos', async () => {
      await montar();
      botao('API')!.click();
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ projeto: 'api' });
      expect(botao('API')!.getAttribute('aria-pressed')).toBe('true');
      botao('Front')!.click();
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ projeto: 'frontend' });
      botao('Front')!.click();
      await estavel();
      expect(ultimaConsulta()[0]).not.toHaveProperty('projeto');
    });

    it('Aplicação: escolher várias manda `aplicacoes` e esconde a coluna só com uma', async () => {
      await montar();
      expect(Array.from(raiz.querySelectorAll('thead th')).map((t) => t.textContent?.trim())).toContain('Aplicação');
      porTestId('filtro-aplicacao')!.click();
      await estavel();
      raiz.querySelector<HTMLInputElement>('[data-testid="opcao-aplicacao"][value="a1"]')!.click();
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ aplicacoes: ['a1'] });
      expect(Array.from(raiz.querySelectorAll('thead th')).map((t) => t.textContent?.trim())).not.toContain('Aplicação');
      raiz.querySelector<HTMLInputElement>('[data-testid="opcao-aplicacao"][value="a2"]')!.click();
      await estavel();
      expect(ultimaConsulta()[0]).toMatchObject({ aplicacoes: ['a1', 'a2'] });
    });

    it('"Limpar filtros" aparece com filtro e zera tudo', async () => {
      await montar();
      expect(botao('Limpar filtros')).toBeUndefined();
      botao('API')!.click();
      await estavel();
      botao('Limpar filtros')!.click();
      await estavel();
      expect(ultimaConsulta()[0]).toEqual({ aba: 'andamento' });
    });
  });

  describe('paginação', () => {
    it('mostra a janela e navega pela página, por "Ir para" e por "Por página"', async () => {
      await montar(lista({ pagina: 1, totalPaginas: 60, total: 1200 }));
      expect(raiz.querySelector('nav[aria-label="Paginação"]')).not.toBeNull();
      raiz.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
      await estavel();
      expect(ultimaConsulta()[1].pagina).toBe(2);

      const ir = raiz.querySelector<HTMLInputElement>('[aria-label="Ir para a página"]')!;
      ir.value = '30';
      ir.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await estavel();
      expect(ultimaConsulta()[1].pagina).toBe(30);

      const por = raiz.querySelector<HTMLSelectElement>('[aria-label="Fatias por página"]')!;
      por.value = '50';
      por.dispatchEvent(new Event('change', { bubbles: true }));
      await estavel();
      expect(ultimaConsulta()[1]).toEqual({ pagina: 1, tamanho: 50 });
    });
  });

  describe('Atualizar e frescor', () => {
    it('mostra "dados de HH:MM" e, ao clicar, descarta o guardado das Aplicações e recarrega', async () => {
      await montar();
      expect(raiz.textContent).toContain(`dados de ${horaDosDados(GERADO)}`);
      botao('Atualizar')!.click();
      await vi.waitFor(() => expect(api.listar).toHaveBeenCalledTimes(2));
      expect(api.atualizar.mock.calls.map((c) => c[0]).sort()).toEqual(['a1', 'a2']);
    });

    it('limite de atualização (429) é um aviso leve, não erro', async () => {
      await montar();
      api.atualizar.mockRejectedValue(erroDaApi('painel.atualizacao-recente'));
      botao('Atualizar')!.click();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(raiz.textContent).toContain('já estão atualizados');
      });
      expect(porTestId('fatias-erro')).toBeNull();
    });

    it('dado desatualizado (GitLab fora com guardado) é dito em texto', async () => {
      await montar(lista({ desatualizado: true }));
      expect(raiz.textContent).toContain('desatualizados');
    });
  });

  describe('avisos por Aplicação', () => {
    it('mostra sem workspace (com link para o cadastro), bot não configurado e GitLab fora', async () => {
      await montar(
        lista({
          avisos: [
            { aplicacaoId: 'a2', aplicacao: 'Portal do Cliente', codigo: 'painel.sem-workspace', mensagem: 'Cadastre o workspace.' },
            { aplicacaoId: 'a3', aplicacao: 'Gestão', codigo: 'gitlab.bot-nao-configurado', mensagem: 'Bot não configurado.' },
            { aplicacaoId: 'a4', aplicacao: 'Cobrança', codigo: 'gitlab.indisponivel', mensagem: 'GitLab fora.' },
          ],
        }),
      );
      expect(raiz.querySelectorAll('[data-testid="aviso"]')).toHaveLength(3);
      expect(raiz.querySelector<HTMLAnchorElement>('[data-testid="aviso"] a')!.getAttribute('href')).toBe('/aplicacoes/a2');
    });
  });

  describe('[P1] Tentar de novo no aviso de GitLab fora', () => {
    it('recarrega a lista (só leitura, sem atualizar)', async () => {
      await montar(lista({ avisos: [{ aplicacaoId: 'a4', aplicacao: 'Cobrança', codigo: 'gitlab.indisponivel', mensagem: 'GitLab fora.' }] }));
      const antes = api.listar.mock.calls.length;
      raiz.querySelector<HTMLButtonElement>('[data-testid="aviso"] button')!.click();
      await estavel();
      expect(api.listar.mock.calls.length).toBe(antes + 1);
      expect(api.atualizar).not.toHaveBeenCalled();
    });
  });

  describe('estados', () => {
    it('carregando: mostra o estado de carga e não o vazio', async () => {
      await montar();
      let liberar!: (l: PainelLista) => void;
      api.listar.mockImplementation(() => new Promise<PainelLista>((r) => (liberar = r)));
      aba('Todas').click();
      fixture.detectChanges();
      expect(porTestId('fatias-carregando')!.getAttribute('role')).toBe('status');
      expect(porTestId('fatias-vazio')).toBeNull();
      liberar(lista());
      await estavel();
      expect(porTestId('fatias-carregando')).toBeNull();
    });

    it('vazio sem filtro explica o que aparece na aba', async () => {
      await montar(lista({ itens: [], total: 0, totalPaginas: 0 }));
      expect(porTestId('fatias-vazio')!.textContent).toContain('Nenhuma Fatia');
      expect(raiz.querySelector('table')).toBeNull();
    });

    it('vazio com filtro diz que nada bate com os filtros', async () => {
      await montar();
      api.listar.mockResolvedValue(lista({ itens: [], total: 0, totalPaginas: 0 }));
      botao('API')!.click();
      await estavel();
      expect(porTestId('fatias-vazio')!.textContent).toContain('com esses filtros');
    });

    it('erro: alerta com "Tentar de novo", que recarrega', async () => {
      await montar(new Error('rede'));
      expect(porTestId('fatias-erro')!.getAttribute('role')).toBe('alert');
      api.listar.mockResolvedValue(lista());
      botao('Tentar de novo')!.click();
      await estavel();
      expect(porTestId('fatias-erro')).toBeNull();
      expect(raiz.querySelectorAll('[data-testid="fatia-linha"]')).toHaveLength(2);
    });
  });

  describe('gaveta', () => {
    it('clicar na linha abre a gaveta daquela Fatia e Fechar a fecha', async () => {
      await montar();
      raiz.querySelector<HTMLElement>('[data-testid="fatia-linha"][data-codigo="V2"]')!.click();
      await estavel();
      expect(api.gaveta).toHaveBeenCalledWith('a1', 'V2');
      const painel = document.querySelector('[data-testid="gaveta"]')!;
      expect(painel.textContent).toContain('specs/V2.md');
      painel.querySelector<HTMLButtonElement>('[data-testid="gaveta-fechar"]')!.click();
      await estavel();
      expect(document.querySelector('[data-testid="gaveta"]')).toBeNull();
    });
  });

  describe('só leitura e segurança', () => {
    it('nenhuma caixa de seleção e nenhum botão de escrita; hotfix fica fora (critério 19)', async () => {
      await montar();
      expect(raiz.querySelector('input[type="checkbox"]')).toBeNull();
      const rotulos = Array.from(raiz.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
      expect(rotulos.join('|')).not.toMatch(/Abrir Entrega|Abrir review|Aprovar|Reprovar|Liberar|Excluir|Hotfix/i);
      expect(api.hotfixes).not.toHaveBeenCalled();
    });

    it('título com marcação do GitLab é mostrado como texto (critério 17)', async () => {
      await montar(lista({ itens: [fatia('X1', { titulo: '<img src=x onerror=alert(1)>' })], total: 1 }));
      expect(raiz.querySelector('img')).toBeNull();
      expect(raiz.textContent).toContain('<img src=x onerror=alert(1)>');
    });
  });
});
