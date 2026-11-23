import { TestBed } from '@angular/core/testing';
import type { AplicacaoDoPainel } from '../fatias.tipos';
import { FiltroAplicacoesComponent } from './filtro-aplicacoes.component';

const app = (n: number): AplicacaoDoPainel => ({ id: `a${n}`, nome: `Aplicação ${n}`, sigla: `AP${n}`, geradoEm: null, desatualizado: false });

describe('[P1] FiltroAplicacoesComponent', () => {
  function montar(aplicacoes: AplicacaoDoPainel[], selecionadas: string[] = [], recentes: string[] = []) {
    const fixture = TestBed.createComponent(FiltroAplicacoesComponent);
    fixture.componentRef.setInput('aplicacoes', aplicacoes);
    fixture.componentRef.setInput('selecionadas', selecionadas);
    fixture.componentRef.setInput('recentes', recentes);
    const mudou = vi.fn();
    fixture.componentInstance.mudou.subscribe(mudou);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const botao = () => raiz.querySelector<HTMLButtonElement>('[data-testid="filtro-aplicacao"]')!;
    const abrir = () => {
      botao().click();
      fixture.detectChanges();
    };
    const itens = () => Array.from(raiz.querySelectorAll<HTMLInputElement>('[data-testid="opcao-aplicacao"]'));
    return { fixture, raiz, mudou, botao, abrir, itens };
  }

  it('o botão mostra a escolha: "Todas as aplicações", o nome, ou "Nome +n"', () => {
    const todas = [app(1), app(2), app(3)];
    expect(montar(todas).botao().textContent).toContain('Todas as aplicações');
    expect(montar(todas, ['a2']).botao().textContent).toContain('Aplicação 2');
    expect(montar(todas, ['a1', 'a3']).botao().textContent).toContain('Aplicação 1 +1');
  });

  it('abre um painel com busca (nunca um select) e aria-expanded', () => {
    const { raiz, botao, abrir } = montar([app(1), app(2)]);
    expect(raiz.querySelector('select')).toBeNull();
    expect(botao().getAttribute('aria-expanded')).toBe('false');
    abrir();
    expect(botao().getAttribute('aria-expanded')).toBe('true');
    expect(raiz.querySelector('[aria-label="Buscar Aplicação"]')).not.toBeNull();
  });

  it('mostra no máximo 8 por vez e a dica "digite para refinar"', () => {
    const { raiz, abrir, itens } = montar(Array.from({ length: 50 }, (_, i) => app(i + 1)));
    abrir();
    expect(itens()).toHaveLength(8);
    expect(raiz.textContent).toContain('Mostrando 8 de 50');
    expect(raiz.textContent).toContain('digite para refinar');
  });

  it('a busca filtra por nome ou sigla', () => {
    const { fixture, raiz, abrir, itens } = montar(Array.from({ length: 50 }, (_, i) => app(i + 1)));
    abrir();
    const campo = raiz.querySelector<HTMLInputElement>('[aria-label="Buscar Aplicação"]')!;
    campo.value = 'ap47';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(itens().map((i) => i.value)).toEqual(['a47']);
  });

  it('Recentes aparecem primeiro, em grupo próprio', () => {
    const { raiz, abrir, itens } = montar([app(1), app(2), app(3)], [], ['a3']);
    abrir();
    expect(raiz.textContent).toContain('Recentes');
    expect(itens()[0].value).toBe('a3');
    expect(itens().filter((i) => i.value === 'a3')).toHaveLength(1);
  });

  it('marcar uma opção emite a seleção com várias escolhas', () => {
    const { fixture, abrir, itens, mudou } = montar([app(1), app(2)], ['a1']);
    abrir();
    const dois = itens().find((i) => i.value === 'a2')!;
    expect(itens().find((i) => i.value === 'a1')!.checked).toBe(true);
    dois.click();
    fixture.detectChanges();
    expect(mudou).toHaveBeenLastCalledWith(['a1', 'a2']);
  });

  it('"Limpar seleção" emite lista vazia', () => {
    const { fixture, raiz, abrir, mudou } = montar([app(1), app(2)], ['a1']);
    abrir();
    Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Limpar seleção'))!.click();
    fixture.detectChanges();
    expect(mudou).toHaveBeenLastCalledWith([]);
  });

  it('Esc fecha o painel e devolve o foco ao botão', () => {
    const { fixture, raiz, botao, abrir } = montar([app(1)]);
    document.body.appendChild(raiz);
    abrir();
    raiz.querySelector('[aria-label="Buscar Aplicação"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(botao().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(botao());
    raiz.remove();
  });
});
