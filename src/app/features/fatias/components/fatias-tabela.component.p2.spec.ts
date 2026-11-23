import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AcoesDaLinha } from '../fatias.service';
import type { FatiaDoPainel } from '../fatias.tipos';
import { FatiasTabelaComponent } from './fatias-tabela.component';

const fatia = (codigo: string): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo, titulo: `Título ${codigo}`, estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
});
const livre = { pode: true, motivo: null };
const acoes: AcoesDaLinha = { abrirReview: livre, aprovar: livre, reprovar: livre, review: { estado: 'nenhum', link: null }, decisao: 'nenhuma' };

describe('[P2] FatiasTabelaComponent: ações na linha', () => {
  let fixture: ComponentFixture<FatiasTabelaComponent>;
  let raiz: HTMLElement;
  let abertas: string[];
  let pedidos: string[];

  function montar(mapa: Map<string, AcoesDaLinha | null> | null) {
    fixture = TestBed.createComponent(FatiasTabelaComponent);
    fixture.componentRef.setInput('itens', [fatia('P2'), fatia('P3')]);
    if (mapa) fixture.componentRef.setInput('acoes', mapa);
    abertas = [];
    pedidos = [];
    fixture.componentInstance.abrir.subscribe((f) => abertas.push(f.codigo));
    fixture.componentInstance.decidir.subscribe((p) => pedidos.push(`${p.tipo}:${p.fatia.codigo}`));
    fixture.detectChanges();
    raiz = fixture.nativeElement;
  }

  it('sem mapa de ações (flag desligada) não há coluna nem botão', () => {
    montar(null);
    expect(raiz.querySelectorAll('est-fatia-acoes')).toHaveLength(0);
    expect(raiz.textContent).not.toContain('Decisão');
  });

  it('com ações, a linha ganha os botões; a linha sem ações fica sem eles', () => {
    montar(new Map([['a1P2', acoes], ['a1P3', null]]));
    const linhas = raiz.querySelectorAll('[data-testid="fatia-linha"]');
    expect(linhas[0].querySelectorAll('button[data-testid^="acao-"]')).toHaveLength(3);
    expect(linhas[1].querySelectorAll('button[data-testid^="acao-"]')).toHaveLength(0);
    expect(raiz.querySelector('th')!.parentElement!.textContent).toContain('Decisão');
  });

  it('clicar num botão pede a decisão daquela Fatia e não abre a gaveta', () => {
    montar(new Map([['a1P2', acoes], ['a1P3', acoes]]));
    raiz.querySelector<HTMLButtonElement>('[data-codigo="P3"] [data-testid="acao-aprovar"]')!.click();
    raiz.querySelector<HTMLButtonElement>('[data-codigo="P2"] [data-testid="acao-reprovar"]')!.click();
    raiz.querySelector<HTMLButtonElement>('[data-codigo="P2"] [data-testid="acao-abrir-review"]')!.click();
    expect(pedidos).toEqual(['aprovar:P3', 'reprovar:P2', 'abrirReview:P2']);
    expect(abertas).toEqual([]);
  });
});
