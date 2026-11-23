import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AcoesDaLinha } from '../fatias.service';
import { FatiaAcoesComponent } from './fatia-acoes.component';

const livre = { pode: true, motivo: null };
const acoes = (parcial: Partial<AcoesDaLinha> = {}): AcoesDaLinha => ({
  abrirReview: livre, aprovar: livre, reprovar: livre, review: { estado: 'nenhum', link: null }, decisao: 'nenhuma', ...parcial,
});

describe('[P2] FatiaAcoesComponent', () => {
  let fixture: ComponentFixture<FatiaAcoesComponent>;
  let raiz: HTMLElement;
  let emitidos: string[];

  function montar(a: AcoesDaLinha | null) {
    fixture = TestBed.createComponent(FatiaAcoesComponent);
    fixture.componentRef.setInput('acoes', a);
    fixture.componentRef.setInput('codigo', 'P2');
    emitidos = [];
    fixture.componentInstance.abrirReview.subscribe(() => emitidos.push('abrirReview'));
    fixture.componentInstance.reprovar.subscribe(() => emitidos.push('reprovar'));
    fixture.componentInstance.aprovar.subscribe(() => emitidos.push('aprovar'));
    fixture.detectChanges();
    raiz = fixture.nativeElement;
  }
  const botao = (id: string) => raiz.querySelector<HTMLButtonElement>(`[data-testid="acao-${id}"]`);

  it('sem ações (flag desligada) não desenha nada', () => {
    montar(null);
    expect(raiz.querySelectorAll('button, a')).toHaveLength(0);
  });

  it('oferece Abrir review, Reprovar e Aprovar, nessa ordem, com o código da Fatia no nome acessível', () => {
    montar(acoes());
    const rotulos = Array.from(raiz.querySelectorAll('button')).map((b) => b.textContent!.trim());
    expect(rotulos).toEqual(['Abrir review', 'Reprovar', 'Aprovar']);
    expect(botao('aprovar')!.getAttribute('aria-label')).toBe('Aprovar P2');
    expect(botao('aprovar')!.disabled).toBe(false);
  });

  it('cada botão emite o seu pedido', () => {
    montar(acoes());
    botao('abrir-review')!.click();
    botao('reprovar')!.click();
    botao('aprovar')!.click();
    expect(emitidos).toEqual(['abrirReview', 'reprovar', 'aprovar']);
  });

  it('botão sem permissão fica desativado com o motivo no title e não emite', () => {
    montar(acoes({ aprovar: { pode: false, motivo: 'ci-nao-verde' }, reprovar: { pode: false, motivo: 'papel' } }));
    expect(botao('aprovar')!.disabled).toBe(true);
    expect(botao('aprovar')!.title).not.toBe('');
    expect(botao('aprovar')!.title).not.toBe('ci-nao-verde');
    expect(botao('reprovar')!.disabled).toBe(true);
    expect(botao('abrir-review')!.disabled).toBe(false);
    botao('aprovar')!.click();
    expect(emitidos).toEqual([]);
  });

  it('o motivo também chega ao leitor de tela, sem texto explicativo visível ao lado', () => {
    montar(acoes({ aprovar: { pode: false, motivo: 'ci-nao-verde' } }));
    const b = botao('aprovar')!;
    const descricao = raiz.querySelector('#' + b.getAttribute('aria-describedby'))!;
    expect(descricao.textContent!.trim()).toBe(b.title);
    expect(descricao.classList.contains('sr-only')).toBe(true);
  });

  it('review aberto com link troca o botão pelo link "review aberto" (nova aba, rel seguro)', () => {
    montar(acoes({ abrirReview: { pode: false, motivo: 'review-ja-pedido' }, review: { estado: 'aberto', link: 'https://review.exemplo.local/p2' } }));
    const a = raiz.querySelector<HTMLAnchorElement>('[data-testid="review-link"]')!;
    expect(a.textContent).toContain('review aberto');
    expect(a.href).toBe('https://review.exemplo.local/p2');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');
    expect(botao('abrir-review')).toBeNull();
  });

  it('review aberto com link de esquema perigoso não vira href (fica só o texto)', () => {
    montar(acoes({ abrirReview: { pode: false, motivo: 'review-ja-pedido' }, review: { estado: 'aberto', link: 'javascript:alert(1)' } }));
    expect(raiz.querySelector('a')).toBeNull();
    expect(raiz.textContent).toContain('review aberto');
  });

  it('review pedido mostra "review pedido…" no lugar do botão', () => {
    montar(acoes({ abrirReview: { pode: false, motivo: 'review-ja-pedido' }, review: { estado: 'pedido', link: null } }));
    expect(raiz.textContent).toContain('review pedido…');
    expect(botao('abrir-review')).toBeNull();
  });

  it.each([
    ['aprovando', 'aprovação pedida'],
    ['reprovando', 'reprovação pedida'],
    ['falhou', 'falhou, reexecutar na P2b'],
  ] as const)('decisao "%s" mostra "%s" e mantém Aprovar e Reprovar desativados', (decisao, texto) => {
    const emAndamento = { pode: false, motivo: 'decisao-em-andamento' };
    montar(acoes({ decisao, aprovar: emAndamento, reprovar: emAndamento }));
    expect(raiz.querySelector('[data-testid="decisao-estado"]')!.textContent).toContain(texto);
    expect(botao('aprovar')!.disabled).toBe(true);
    expect(botao('reprovar')!.disabled).toBe(true);
  });

  it('sem decisão não mostra estado de decisão', () => {
    montar(acoes());
    expect(raiz.querySelector('[data-testid="decisao-estado"]')).toBeNull();
  });
});
