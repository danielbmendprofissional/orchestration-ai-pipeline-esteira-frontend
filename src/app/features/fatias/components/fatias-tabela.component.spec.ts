import { TestBed } from '@angular/core/testing';
import type { FatiaDoPainel } from '../fatias.tipos';
import { FatiasTabelaComponent } from './fatias-tabela.component';

const fatia = (codigo: string, extra: Partial<FatiaDoPainel> = {}): FatiaDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo, titulo: `Título ${codigo}`, estado: 'em-execucao', progresso: '3/7 tasks',
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api', 'frontend'], specDisponivel: true,
  ...extra,
});

describe('[P1] FatiasTabelaComponent', () => {
  function montar(itens: FatiaDoPainel[], mostrarAplicacao = true) {
    const fixture = TestBed.createComponent(FatiasTabelaComponent);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('mostrarAplicacao', mostrarAplicacao);
    const abrir = vi.fn();
    fixture.componentInstance.abrir.subscribe(abrir);
    fixture.detectChanges();
    return { raiz: fixture.nativeElement as HTMLElement, abrir };
  }

  it('é uma tabela semântica com cabeçalhos de coluna', () => {
    const { raiz } = montar([fatia('P1.1')]);
    const cabecalhos = Array.from(raiz.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(cabecalhos).toEqual(['Fatia', 'Aplicação', 'Projeto', 'Risco', 'Estado', 'Progresso', 'Abrir detalhes']);
    expect(raiz.querySelector('thead th')!.getAttribute('scope')).toBe('col');
  });

  it('mostra código, título, Projeto, risco, estado e progresso em texto', () => {
    const { raiz } = montar([fatia('P1.1')]);
    const linha = raiz.querySelector('[data-testid="fatia-linha"]')!;
    expect(linha.getAttribute('data-codigo')).toBe('P1.1');
    expect(linha.textContent).toContain('P1.1');
    expect(linha.textContent).toContain('Título P1.1');
    expect(linha.textContent).toContain('Valuto');
    expect(linha.textContent).toContain('API');
    expect(linha.textContent).toContain('Front');
    expect(linha.textContent).toContain('alto');
    expect(linha.querySelector('[data-testid="estado-badge"]')!.textContent).toContain('Em execução');
    expect(linha.textContent).toContain('3/7 tasks');
  });

  it('esconde a coluna Aplicação quando só uma Aplicação está filtrada', () => {
    const { raiz } = montar([fatia('P1.1')], false);
    expect(Array.from(raiz.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).not.toContain('Aplicação');
  });

  it('marca "formato anterior ao padrão" só quando a Fatia é do formato anterior', () => {
    const { raiz } = montar([fatia('A1', { formatoAnterior: true }), fatia('A2')]);
    const linhas = raiz.querySelectorAll('[data-testid="fatia-linha"]');
    expect(linhas[0].textContent).toContain('formato anterior ao padrão');
    expect(linhas[1].textContent).not.toContain('formato anterior ao padrão');
  });

  it('mostra texto com marcação como texto, sem criar elemento (critério 17)', () => {
    const { raiz } = montar([fatia('X1', { titulo: '<img src=x onerror=alert(1)> <b>negrito</b>', progresso: '<script>x</script>' })]);
    expect(raiz.querySelector('img, b, script')).toBeNull();
    expect(raiz.textContent).toContain('<img src=x onerror=alert(1)> <b>negrito</b>');
    expect(raiz.textContent).toContain('<script>x</script>');
  });

  it('clicar na linha ou acionar o botão do código abre a gaveta daquela Fatia', () => {
    const f = fatia('P1.1');
    const { raiz, abrir } = montar([f]);
    raiz.querySelector<HTMLElement>('[data-testid="fatia-linha"]')!.click();
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenLastCalledWith(f);
    raiz.querySelector<HTMLButtonElement>('[data-testid="fatia-abrir"]')!.click();
    expect(abrir).toHaveBeenCalledTimes(2);
  });

  it('é só leitura: sem caixa de seleção e sem botão além do que abre a gaveta (critério 19)', () => {
    const { raiz } = montar([fatia('P1.1'), fatia('P1.2')]);
    expect(raiz.querySelector('input')).toBeNull();
    expect(raiz.querySelectorAll('button')).toHaveLength(2);
  });
});
