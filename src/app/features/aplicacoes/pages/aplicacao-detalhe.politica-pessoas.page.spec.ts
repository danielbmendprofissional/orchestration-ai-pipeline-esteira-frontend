import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AplicacoesApiService } from '../aplicacoes-api.service';
import type { AplicacaoDetalhe, PermissoesAplicacao } from '../aplicacoes.tipos';
import { AplicacaoDetalhePage } from './aplicacao-detalhe.page';

const detalhe = (): AplicacaoDetalhe => ({
  id: 'a1',
  nome: 'Valuto',
  sigla: 'VLT',
  grupo: 'valuto',
  ativa: true,
  projetos: [],
  politicas: [
    { id: 'po1', ambiente: 'review', critica: null, alta: null, media: null, baixa: null, modo: 'avisa' },
    { id: 'po2', ambiente: 'qa', critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' },
    { id: 'po3', ambiente: 'hml', critica: 0, alta: 0, media: null, baixa: null, modo: 'bloqueia' },
    { id: 'po4', ambiente: 'producao', critica: 0, alta: 0, media: 5, baixa: null, modo: 'bloqueia' },
  ],
  papeis: [
    { id: 'pp1', usuario: 's1', nome: 'Ana Souza', email: 'ana@x', papel: 'analista' },
    { id: 'pp2', usuario: 's1', nome: 'Ana Souza', email: 'ana@x', papel: 'publicador' },
    { id: 'pp3', usuario: 's2', nome: 'Beto Lima', email: 'beto@x', papel: 'aprovador-tecnico' },
  ],
});
const permissoes = (v: boolean): PermissoesAplicacao => ({ podeEditar: v, podeEditarCadastro: v, podeEditarPolitica: v, podeGerenciarPapeis: v });
const erroDaApi = (code: string) => new HttpErrorResponse({ status: 422, error: { errors: [{ code, message: 'msg', type: 'Validation' }] } });

describe('[A1] AplicacaoDetalhePage — abas Política de segurança e Pessoas e papéis', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<AplicacaoDetalhePage>;
  let raiz: HTMLElement;

  async function montar(pode = true) {
    api = {
      obter: vi.fn(async () => detalhe()),
      permissoes: vi.fn(async () => permissoes(pode)),
      alterarPolitica: vi.fn(async (_id: string, ambiente: string, p: object) => ({ id: 'x', ambiente, ...p })),
      buscarPessoas: vi.fn(async () => [
        { sub: 's3', nome: 'Caio Prado', email: 'caio@x' },
        { sub: 's1', nome: 'Ana Souza', email: 'ana@x' },
      ]),
      vincularPapel: vi.fn(async (_id: string, p: { usuario: string; papel: string }) => ({ id: 'novo', nome: 'Caio Prado', email: 'caio@x', ...p })),
      desvincularPapel: vi.fn(async () => undefined),
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
  const entrada = (rotulo: string) => painel().querySelector(`[aria-label="${rotulo}"]`) as HTMLInputElement;
  const escolher = (el: HTMLSelectElement, valor: string) => {
    el.value = valor;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  describe('Política de segurança', () => {
    it('mostra a tabela ambiente × severidade, com "sem limite" para null', async () => {
      await montar();
      await abrirAba('Política');

      const cabecalho = Array.from(painel().querySelectorAll('thead th')).map((t) => t.textContent?.trim());
      expect(cabecalho).toEqual(['Ambiente', 'Crítica', 'Alta', 'Média', 'Baixa', 'Modo', 'Ações']);
      expect(painel().querySelectorAll('tbody tr')).toHaveLength(4);
      expect(entrada('Média em producao').value).toBe('5');
      expect(entrada('Média em review').value).toBe('');
      expect(entrada('Média em review').placeholder).toBe('sem limite');
    });

    it('o piso fixo (qa, hml, produção: modo bloqueia, Crítica e Alta em 0) aparece travado; review é livre', async () => {
      await montar();
      await abrirAba('Política');

      for (const amb of ['qa', 'hml', 'producao']) {
        expect(entrada(`Crítica em ${amb}`).disabled).toBe(true);
        expect(entrada(`Alta em ${amb}`).disabled).toBe(true);
        expect((entrada(`Modo em ${amb}`) as unknown as HTMLSelectElement).disabled).toBe(true);
        expect(entrada(`Média em ${amb}`).disabled).toBe(false);
      }
      expect(entrada('Crítica em review').disabled).toBe(false);
      expect((entrada('Modo em review') as unknown as HTMLSelectElement).disabled).toBe(false);
    });

    it('salva os limites digitados (vazio = null) e o modo', async () => {
      await montar();
      await abrirAba('Política');

      digitar(entrada('Média em hml'), '3');
      await estavel();
      botao('Salvar hml', painel())!.click();
      await estavel();

      expect(api['alterarPolitica']).toHaveBeenCalledWith('a1', 'hml', { critica: 0, alta: 0, media: 3, baixa: null, modo: 'bloqueia' });
    });

    it('review pode endurecer: bloquear e limitar Crítica', async () => {
      await montar();
      await abrirAba('Política');

      digitar(entrada('Crítica em review'), '1');
      escolher(entrada('Modo em review') as unknown as HTMLSelectElement, 'bloqueia');
      await estavel();
      botao('Salvar review', painel())!.click();
      await estavel();

      expect(api['alterarPolitica']).toHaveBeenCalledWith('a1', 'review', { critica: 1, alta: null, media: null, baixa: null, modo: 'bloqueia' });
    });

    it('mostra o erro de limite negativo da API junto da tabela', async () => {
      await montar();
      api['alterarPolitica'].mockRejectedValue(erroDaApi('politica.limite-negativo'));
      await abrirAba('Política');

      digitar(entrada('Baixa em review'), '-1');
      await estavel();
      botao('Salvar review', painel())!.click();
      await estavel();

      expect(painel().querySelector('[role=alert]')?.textContent).toContain('negativo');
    });

    it('mostra o erro de piso (abaixo do mínimo) da API', async () => {
      await montar();
      api['alterarPolitica'].mockRejectedValue(erroDaApi('politica.abaixo-do-minimo'));
      await abrirAba('Política');

      digitar(entrada('Média em qa'), '2');
      await estavel();
      botao('Salvar qa', painel())!.click();
      await estavel();

      expect(painel().querySelector('[role=alert]')?.textContent).toContain('mínimo');
    });

    it('sem permissão: tudo travado e nenhum botão Salvar (critério 18)', async () => {
      await montar(false);
      await abrirAba('Política');

      expect(botao(/^Salvar/, painel())).toBeUndefined();
      expect(entrada('Média em review').disabled).toBe(true);
      expect(entrada('Média em review').value).toBe('');
    });
  });

  describe('Pessoas e papéis', () => {
    it('mostra a matriz pessoa × papel', async () => {
      await montar();
      await abrirAba('Pessoas');

      const cabecalho = Array.from(painel().querySelectorAll('thead th')).map((t) => t.textContent?.trim());
      expect(cabecalho).toEqual(['Pessoa', 'analista', 'membro', 'aprovador técnico', 'aprovador negócio', 'publicador']);
      expect(painel().querySelectorAll('tbody tr')).toHaveLength(2);
      expect(painel().textContent).toContain('Ana Souza');
      expect(entrada('Ana Souza: analista').checked).toBe(true);
      expect(entrada('Ana Souza: membro').checked).toBe(false);
      expect(entrada('Beto Lima: aprovador técnico').checked).toBe(true);
    });

    it('desmarcar um papel desvincula pelo id do vínculo', async () => {
      await montar();
      await abrirAba('Pessoas');

      entrada('Ana Souza: publicador').click();
      await estavel();

      expect(api['desvincularPapel']).toHaveBeenCalledWith('a1', 'pp2');
    });

    it('marcar um papel vincula a pessoa', async () => {
      await montar();
      await abrirAba('Pessoas');

      entrada('Beto Lima: membro').click();
      await estavel();

      expect(api['vincularPapel']).toHaveBeenCalledWith('a1', { usuario: 's2', papel: 'membro' });
    });

    it('"Adicionar pessoa" busca em Pessoa e vincula o papel escolhido', async () => {
      await montar();
      await abrirAba('Pessoas');
      botao('Adicionar pessoa', painel())!.click();
      await estavel();

      const busca = document.querySelector('[role=dialog] input[type=search]') as HTMLInputElement;
      digitar(busca, 'cai');
      busca.dispatchEvent(new Event('change', { bubbles: true }));
      await estavel();
      expect(api['buscarPessoas']).toHaveBeenCalledWith('cai');

      botao(/Caio Prado/)!.click();
      await estavel();
      escolher(document.querySelector('[role=dialog] select') as HTMLSelectElement, 'aprovador-negocio');
      botao('Vincular')!.click();
      await estavel();

      expect(api['vincularPapel']).toHaveBeenCalledWith('a1', { usuario: 's3', papel: 'aprovador-negocio' });
      expect(document.querySelector('[role=dialog]')).toBeNull();
    });

    it('pessoa que nunca entrou: mostra o erro da API na gaveta e a mantém aberta', async () => {
      await montar();
      api['vincularPapel'].mockRejectedValue(erroDaApi('papel.pessoa-desconhecida'));
      await abrirAba('Pessoas');
      botao('Adicionar pessoa', painel())!.click();
      await estavel();
      const busca = document.querySelector('[role=dialog] input[type=search]') as HTMLInputElement;
      digitar(busca, 'cai');
      busca.dispatchEvent(new Event('change', { bubbles: true }));
      await estavel();
      botao(/Caio Prado/)!.click();
      await estavel();

      botao('Vincular')!.click();
      await estavel();

      expect(document.querySelector('[role=dialog] [role=alert]')?.textContent).toContain('nunca entrou');
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
    });

    it('sem permissão: sem Adicionar pessoa e caixas travadas (critério 18)', async () => {
      await montar(false);
      await abrirAba('Pessoas');

      expect(botao('Adicionar pessoa', painel())).toBeUndefined();
      expect(entrada('Ana Souza: analista').disabled).toBe(true);
    });
  });
});
