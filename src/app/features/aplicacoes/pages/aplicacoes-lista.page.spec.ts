import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoLista } from '../aplicacoes.tipos';
import { AplicacoesListaPage } from './aplicacoes-lista.page';

const valuto: AplicacaoLista = { id: 'a1', nome: 'Valuto', sigla: 'VLT', grupo: 'valuto', quantidadeProjetos: 3, ativa: true };
const portal: AplicacaoLista = { id: 'a2', nome: 'Portal do Cliente', sigla: 'PCL', grupo: 'portal-cliente', quantidadeProjetos: 2, ativa: true };
const pagina = (itens: AplicacaoLista[], extra = {}) => ({ itens, total: itens.length, totalPaginas: 1, pagina: 1, tamanho: 20, ...extra });
const erroDaApi = (code: string) =>
  new HttpErrorResponse({ status: 422, error: { errors: [{ code, message: 'msg da API', type: 'Validation' }] } });

describe('[A1] AplicacoesListaPage', () => {
  let api: Record<'listar' | 'permissoesGlobais' | 'criar', ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacoesListaPage>;
  let raiz: HTMLElement;

  async function montar(podeCriar: boolean, itens = [valuto, portal], extraPagina = {}) {
    api = {
      listar: vi.fn(async () => pagina(itens, extraPagina)),
      permissoesGlobais: vi.fn(async () => ({ podeCriar })),
      criar: vi.fn(async () => valuto),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AplicacoesApiService, useValue: api }],
    });
    fixture = TestBed.createComponent(AplicacoesListaPage);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    fixture.detectChanges();
  }

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
  const estavel = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('lista nome, sigla, grupo e nº de projetos, com link para o detalhe', async () => {
    await montar(true);

    expect(raiz.querySelector('h1')?.textContent).toContain('Aplicações');
    const linhas = raiz.querySelectorAll('tbody tr');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].textContent).toContain('Valuto');
    expect(linhas[0].textContent).toContain('VLT');
    expect(linhas[0].textContent).toContain('valuto');
    expect(linhas[0].textContent).toContain('3');
    expect(linhas[0].querySelector('a')?.getAttribute('href')).toBe('/aplicacoes/a1');
  });

  it('mostra "Nova aplicação" só quando a API diz que pode criar (critério 18)', async () => {
    await montar(true);
    expect(botao('Nova aplicação', raiz)).toBeDefined();

    TestBed.resetTestingModule();
    await montar(false);
    expect(botao(/Nova aplicação/, raiz)).toBeUndefined();
  });

  it('sem nenhuma Aplicação cadastrada, avisa que ainda não há e orienta quem pode criar', async () => {
    await montar(true, []);

    expect(raiz.textContent).toContain('Nenhuma aplicação cadastrada ainda');
    expect(raiz.textContent).toContain('Nova aplicação');
    expect(raiz.querySelector('[role=alert]')).toBeNull();
  });

  it('sem Aplicações e sem permissão de criar, só avisa que não há', async () => {
    await montar(false, []);

    expect(raiz.textContent).toContain('Nenhuma aplicação cadastrada ainda');
    expect(raiz.textContent).not.toContain('Crie a primeira');
  });

  it('com filtro ativo e nada encontrado, diz que não há com esses filtros', async () => {
    await montar(true, []);

    botao('Todas', raiz)!.click();
    await estavel();

    expect(raiz.textContent).toContain('Nenhuma aplicação com esses filtros');
  });

  it('área indisponível (404): mostra aviso calmo, sem alerta de erro, e o botão continua pelas permissões', async () => {
    await montar(true);
    api.listar.mockRejectedValue(new HttpErrorResponse({ status: 404 }));
    botao('Todas', raiz)!.click();
    await estavel();

    expect(raiz.textContent).toContain('ainda não está disponível');
    expect(raiz.querySelector('[role=alert]')).toBeNull();
    expect(botao('Nova aplicação', raiz)).toBeDefined();
  });

  it('o filtro Inativas pede ativa=false à API, e Todas pede sem filtro', async () => {
    await montar(true);

    botao('Inativas', raiz)!.click();
    await estavel();
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ ativa: false }), { pagina: 1, tamanho: 20 });
    expect(botao('Inativas', raiz)!.getAttribute('aria-pressed')).toBe('true');

    botao('Todas', raiz)!.click();
    await estavel();
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ ativa: undefined }), { pagina: 1, tamanho: 20 });
  });

  it('a busca pede à API o texto digitado', async () => {
    await montar(true);

    const busca = raiz.querySelector<HTMLInputElement>('input[type=search]')!;
    digitar(busca, 'port');
    busca.dispatchEvent(new Event('change', { bubbles: true }));
    await estavel();

    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ busca: 'port' }), { pagina: 1, tamanho: 20 });
  });

  it('pagina: "Próxima" pede a página 2', async () => {
    await montar(true, [valuto], { total: 25, totalPaginas: 2 });

    botao('Próxima', raiz)!.click();
    await estavel();

    expect(api.listar).toHaveBeenLastCalledWith(expect.anything(), { pagina: 2, tamanho: 20 });
  });

  describe('gaveta de nova aplicação', () => {
    const abrir = async () => {
      await montar(true);
      botao('Nova aplicação', raiz)!.click();
      await estavel();
    };

    it('abre com nome, sigla e grupo do GitLab', async () => {
      await abrir();

      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      expect(campo('Nome')).toBeTruthy();
      expect(campo('Sigla')).toBeTruthy();
      expect(campo('Grupo do GitLab')).toBeTruthy();
    });

    it('cria com os valores digitados, fecha a gaveta e recarrega a lista', async () => {
      await abrir();
      digitar(campo('Nome'), 'Recursos Humanos');
      digitar(campo('Sigla'), 'rhu');
      digitar(campo('Grupo do GitLab'), 'recursos-humanos');

      botao('Criar aplicação')!.click();
      await estavel();

      expect(api.criar).toHaveBeenCalledWith({ nome: 'Recursos Humanos', sigla: 'RHU', grupoGitLab: 'recursos-humanos' });
      expect(document.querySelector('[role=dialog]')).toBeNull();
    });

    it('mostra a sigla duplicada no campo da sigla e mantém a gaveta aberta', async () => {
      await abrir();
      api.criar.mockRejectedValue(erroDaApi('aplicacao.sigla-duplicada'));
      digitar(campo('Nome'), 'Valuto 2');
      digitar(campo('Sigla'), 'VLT');
      digitar(campo('Grupo do GitLab'), 'valuto-2');

      botao('Criar aplicação')!.click();
      await estavel();

      const sigla = campo('Sigla');
      expect(sigla.getAttribute('aria-invalid')).toBe('true');
      const aviso = document.getElementById(sigla.getAttribute('aria-describedby')!);
      expect(aviso?.textContent).toContain('sigla');
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
    });

    it('mostra grupo já vinculado no campo do grupo', async () => {
      await abrir();
      api.criar.mockRejectedValue(erroDaApi('aplicacao.grupo-ja-vinculado'));
      digitar(campo('Nome'), 'X');
      digitar(campo('Sigla'), 'XXX');
      digitar(campo('Grupo do GitLab'), 'valuto');

      botao('Criar aplicação')!.click();
      await estavel();

      const grupo = campo('Grupo do GitLab');
      expect(grupo.getAttribute('aria-invalid')).toBe('true');
      expect(document.getElementById(grupo.getAttribute('aria-describedby')!)?.textContent).toMatch(/grupo/i);
    });

    it('não envia com campo obrigatório vazio', async () => {
      await abrir();

      botao('Criar aplicação')!.click();
      await estavel();

      expect(api.criar).not.toHaveBeenCalled();
      expect(campo('Nome').getAttribute('aria-invalid')).toBe('true');
    });

    it('Cancelar fecha a gaveta sem criar', async () => {
      await abrir();

      botao('Cancelar')!.click();
      await estavel();

      expect(api.criar).not.toHaveBeenCalled();
      expect(document.querySelector('[role=dialog]')).toBeNull();
    });
  });
});
