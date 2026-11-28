import { TestBed } from '@angular/core/testing';
import type { MudancaDeFiltro } from '../auditoria.service';
import { AuditoriaFiltrosComponent } from './auditoria-filtros.component';
import { AuditoriaPaginacaoComponent } from './auditoria-paginacao.component';

describe('[X1] AuditoriaFiltrosComponent', () => {
  function montar(filtro: Record<string, unknown> = { periodoDias: 30 }) {
    const fx = TestBed.createComponent(AuditoriaFiltrosComponent);
    fx.componentRef.setInput('filtro', filtro);
    fx.componentRef.setInput('aplicacoes', [{ id: 'a1', nome: 'Valuto' }, { id: 'a2', nome: 'Portal' }]);
    fx.componentRef.setInput('pessoas', [{ id: 'p1', nome: 'Carla' }, { id: '@bot', nome: 'Bot da Esteira' }]);
    fx.componentRef.setInput('categorias', [{ categoria: 'excecao', total: 3 }, { categoria: 'entrega', total: 2 }]);
    const filtrar = vi.fn<(m: MudancaDeFiltro) => void>();
    const limpar = vi.fn<() => void>();
    fx.componentInstance.filtrar.subscribe(filtrar);
    fx.componentInstance.limparObjeto.subscribe(limpar);
    fx.detectChanges();
    const el = fx.nativeElement as HTMLElement;
    return { fx, el, filtrar, limpar, q: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)! };
  }

  it('chips de categoria com contagem (Todos = soma) e ícone; a ativa fica aria-pressed', () => {
    const { el } = montar({ periodoDias: 30, categoria: 'entrega' });
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-testid="categoria"]'));
    expect(chips).toHaveLength(9);
    expect(chips[0].textContent).toContain('Todos');
    expect(chips[0].textContent).toContain('5');
    expect(chips.find((c) => c.textContent!.includes('Exceções'))!.textContent).toContain('3');
    expect(chips.find((c) => c.textContent!.includes('Papéis'))!.textContent).toContain('0');
    expect(chips.find((c) => c.getAttribute('aria-pressed') === 'true')!.textContent).toContain('Entregas');
  });

  it('clicar numa categoria filtra; em "Todos", limpa', () => {
    const { el, filtrar } = montar({ periodoDias: 30, categoria: 'entrega' });
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-testid="categoria"]'));
    chips.find((c) => c.textContent!.includes('Exceções'))!.click();
    expect(filtrar).toHaveBeenLastCalledWith({ categoria: 'excecao' });
    chips[0].click();
    expect(filtrar).toHaveBeenLastCalledWith({ categoria: undefined });
  });

  it('selects de Aplicação, Quem e Período emitem a mudança; período "tudo" = null', () => {
    const { q, filtrar } = montar();
    const mudar = (el: HTMLElement, valor: string) => {
      const s = el as HTMLSelectElement;
      s.value = valor;
      s.dispatchEvent(new Event('change'));
    };
    mudar(q('filtro-aplicacao'), 'a2');
    expect(filtrar).toHaveBeenLastCalledWith({ aplicacaoId: 'a2' });
    mudar(q('filtro-quem'), '@bot');
    expect(filtrar).toHaveBeenLastCalledWith({ quem: '@bot' });
    mudar(q('filtro-quem'), '');
    expect(filtrar).toHaveBeenLastCalledWith({ quem: undefined });
    mudar(q('filtro-periodo'), '90');
    expect(filtrar).toHaveBeenLastCalledWith({ periodoDias: 90 });
    mudar(q('filtro-periodo'), 'tudo');
    expect(filtrar).toHaveBeenLastCalledWith({ periodoDias: null });
  });

  it('busca emite o texto ao digitar (com atraso curto)', () => {
    vi.useFakeTimers();
    try {
      const { q, filtrar } = montar();
      const campo = q('filtro-busca') as HTMLInputElement;
      campo.value = 'sec-1';
      campo.dispatchEvent(new Event('input'));
      expect(filtrar).not.toHaveBeenCalled();
      vi.advanceTimersByTime(400);
      expect(filtrar).toHaveBeenCalledWith({ busca: 'sec-1' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('com objeto: chip "Só <código>" e o x emite limparObjeto (critério 15); sem objeto, sem chip', () => {
    expect(montar().q('chip-objeto')).toBeNull();
    const { q, limpar } = montar({ periodoDias: 30, objeto: 'ENT-7' });
    expect(q('chip-objeto').textContent).toContain('Só ENT-7');
    q('chip-objeto-limpar').click();
    expect(limpar).toHaveBeenCalled();
    expect(q('chip-objeto-limpar').getAttribute('aria-label')).toBe('Tirar o filtro do objeto ENT-7');
  });
});

describe('[X1] AuditoriaPaginacaoComponent', () => {
  function montar(entradas: Record<string, number>) {
    const fx = TestBed.createComponent(AuditoriaPaginacaoComponent);
    for (const [k, v] of Object.entries({ pagina: 1, total: 30, totalPaginas: 3, tamanho: 12, ...entradas })) fx.componentRef.setInput(k, v);
    const ir = vi.fn<(p: number) => void>();
    fx.componentInstance.irPara.subscribe(ir);
    fx.detectChanges();
    return { el: fx.nativeElement as HTMLElement, ir };
  }

  it('mostra "1–12 de 30", marca a página atual e navega', () => {
    const { el, ir } = montar({});
    expect(el.textContent).toContain('1–12 de 30');
    expect(el.querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('1');
    el.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    expect(ir).toHaveBeenCalledWith(2);
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled).toBe(true);
  });

  it('última página fecha em "25–30 de 30"; sem registros, nada', () => {
    expect(montar({ pagina: 3 }).el.textContent).toContain('25–30 de 30');
    expect(montar({ total: 0, totalPaginas: 0 }).el.textContent!.trim()).toBe('');
  });
});
