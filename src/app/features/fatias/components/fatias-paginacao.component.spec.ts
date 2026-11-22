import { TestBed } from '@angular/core/testing';
import { FatiasPaginacaoComponent } from './fatias-paginacao.component';

describe('[P1] FatiasPaginacaoComponent', () => {
  function montar(pagina: number, totalPaginas: number, total: number, tamanho = 5) {
    const fixture = TestBed.createComponent(FatiasPaginacaoComponent);
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('totalPaginas', totalPaginas);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('tamanho', tamanho);
    const irPara = vi.fn();
    const mudarTamanho = vi.fn();
    fixture.componentInstance.irPara.subscribe(irPara);
    fixture.componentInstance.mudarTamanho.subscribe(mudarTamanho);
    fixture.detectChanges();
    return { raiz: fixture.nativeElement as HTMLElement, irPara, mudarTamanho };
  }
  const numeros = (raiz: HTMLElement) =>
    Array.from(raiz.querySelectorAll('[data-testid="pagina-numero"]')).map((b) => b.textContent?.trim());

  it('mostra "26–30 de 300" e a janela 1 2 … 5 6 7 … 59 60 com a atual marcada', () => {
    const { raiz } = montar(6, 60, 300);
    expect(raiz.textContent).toContain('26–30 de 300');
    expect(numeros(raiz)).toEqual(['1', '2', '5', '6', '7', '59', '60']);
    expect(raiz.querySelectorAll('[data-testid="pagina-reticencias"]')).toHaveLength(2);
    expect(raiz.querySelector('[aria-current="page"]')!.textContent?.trim()).toBe('6');
  });

  it('na última página o "até" não passa do total', () => {
    const { raiz } = montar(3, 3, 11);
    expect(raiz.textContent).toContain('11–11 de 11');
  });

  it('anterior e próxima emitem a página vizinha e desabilitam nas pontas', () => {
    const { raiz, irPara } = montar(1, 3, 11);
    const anterior = raiz.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!;
    const proxima = raiz.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!;
    expect(anterior.disabled).toBe(true);
    proxima.click();
    expect(irPara).toHaveBeenCalledWith(2);
  });

  it('clicar num número emite essa página', () => {
    const { raiz, irPara } = montar(1, 10, 50);
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-testid="pagina-numero"]')).find((b) => b.textContent?.trim() === '10')!.click();
    expect(irPara).toHaveBeenCalledWith(10);
  });

  it('"Ir para" com Enter emite a página, limitada ao intervalo', () => {
    const { raiz, irPara } = montar(1, 10, 50);
    const campo = raiz.querySelector<HTMLInputElement>('[aria-label="Ir para a página"]')!;
    campo.value = '99';
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(irPara).toHaveBeenCalledWith(10);
  });

  it('"Por página" oferece 5, 8, 10, 20, 50 e 100 e emite o escolhido', () => {
    const { raiz, mudarTamanho } = montar(1, 10, 50, 20);
    const seletor = raiz.querySelector<HTMLSelectElement>('[aria-label="Fatias por página"]')!;
    expect(Array.from(seletor.options).map((o) => o.value)).toEqual(['5', '8', '10', '20', '50', '100']);
    expect(seletor.value).toBe('20');
    seletor.value = '50';
    seletor.dispatchEvent(new Event('change', { bubbles: true }));
    expect(mudarTamanho).toHaveBeenCalledWith(50);
  });

  it('sem resultado não mostra nada', () => {
    const { raiz } = montar(1, 0, 0);
    expect(raiz.querySelector('nav')).toBeNull();
  });
});
