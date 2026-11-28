import { TestBed } from '@angular/core/testing';
import type { GrupoDoDia } from '../auditoria.service';
import type { RegistroDaLista } from '../auditoria.tipos';
import { AuditoriaListaComponent } from './auditoria-lista.component';

const registro = (extra: Partial<RegistroDaLista> = {}): RegistroDaLista => ({
  id: 'r1', quando: new Date(2026, 10, 28, 15, 40).toISOString(), quem: { nome: 'Carla <b>Mendes</b>', origem: 'tela' }, categoria: 'excecao',
  verbo: 'aprovou a exceção', objeto: { codigo: 'SEC-1', nome: 'Path traversal', entidade: 'Excecao', entidadeId: 'x' }, aplicacao: { id: 'a1', nome: 'Valuto' },
  autoaprovacao: false, resumoMudancas: 'estado: pendente → ativa', ...extra,
});
const grupos: GrupoDoDia[] = [
  { dia: '2026-11-28', rotulo: 'Hoje', registros: [registro(), registro({ id: 'r2', autoaprovacao: true, quem: { nome: 'Bot da Esteira', origem: 'bot' }, categoria: 'publicacao' })] },
  { dia: '2026-11-27', rotulo: 'Ontem', registros: [registro({ id: 'r3', aplicacao: null })] },
];

describe('[X1] AuditoriaListaComponent', () => {
  function montar(entradas: Record<string, unknown> = {}) {
    const fx = TestBed.createComponent(AuditoriaListaComponent);
    const valores = { grupos, carregando: false, falhou: false, vazio: false, comFiltro: false, avisoDeEscopo: false, ...entradas };
    for (const [k, v] of Object.entries(valores)) fx.componentRef.setInput(k, v);
    const abrir = vi.fn<(id: string) => void>();
    const tentar = vi.fn<() => void>();
    fx.componentInstance.abrir.subscribe(abrir);
    fx.componentInstance.tentarDeNovo.subscribe(tentar);
    fx.detectChanges();
    return { fx, el: fx.nativeElement as HTMLElement, abrir, tentar };
  }

  it('agrupa por dia (Hoje, Ontem) com uma linha por registro: hora, ícone com rótulo, quem verbo objeto e Aplicação (critério 16)', () => {
    const { el } = montar();
    expect(Array.from(el.querySelectorAll('[data-testid="dia"]')).map((d) => d.textContent!.trim())).toEqual(['Hoje', 'Ontem']);
    const linhas = el.querySelectorAll('[data-testid="registro"]');
    expect(linhas).toHaveLength(3);
    expect(linhas[0].textContent).toContain('15:40');
    expect(linhas[0].textContent).toContain('aprovou a exceção');
    expect(linhas[0].textContent).toContain('SEC-1');
    expect(linhas[0].textContent).toContain('Valuto');
    expect(linhas[0].querySelector('ng-icon')).not.toBeNull();
    expect(linhas[0].textContent).toContain('Exceções');
    expect(linhas[2].textContent).toContain('—');
  });

  it('texto da API entra como texto, nunca como HTML; etiqueta "autoaprovação" só quando marcada', () => {
    const { el } = montar();
    const linhas = el.querySelectorAll('[data-testid="registro"]');
    expect(linhas[0].querySelector('b')).toBeNull();
    expect(linhas[0].textContent).toContain('Carla <b>Mendes</b>');
    expect(linhas[0].textContent).not.toContain('autoaprovação');
    expect(linhas[1].textContent).toContain('autoaprovação');
  });

  it('clicar na linha pede a gaveta daquele registro', () => {
    const { el, abrir } = montar();
    el.querySelectorAll<HTMLButtonElement>('[data-testid="registro"]')[1].click();
    expect(abrir).toHaveBeenCalledWith('r2');
  });

  it('vazio sem filtro mostra o estado vazio com o aviso de escopo (só para quem não é MOR), e não erro (critério 16)', () => {
    const { el } = montar({ grupos: [], vazio: true, avisoDeEscopo: true });
    expect(el.querySelector('[data-testid="vazio"]')!.textContent).toContain('Nenhum registro');
    expect(el.textContent).toContain('Você só vê as aplicações em que tem papel');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('vazio por filtro fala dos filtros; MOR não vê o aviso de escopo', () => {
    const { el } = montar({ grupos: [], vazio: true, comFiltro: true, avisoDeEscopo: false });
    expect(el.querySelector('[data-testid="vazio"]')!.textContent).toContain('com esses filtros');
    expect(el.textContent).not.toContain('em que tem papel');
  });

  it('carregando: status; erro: alerta com "Tentar de novo" (e não o vazio)', () => {
    expect(montar({ grupos: [], carregando: true }).el.querySelector('[role="status"]')!.textContent).toContain('Carregando');
    const { el, tentar } = montar({ grupos: [], falhou: true });
    expect(el.querySelector('[data-testid="vazio"]')).toBeNull();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    el.querySelector<HTMLButtonElement>('[data-testid="tentar-de-novo"]')!.click();
    expect(tentar).toHaveBeenCalled();
  });
});
