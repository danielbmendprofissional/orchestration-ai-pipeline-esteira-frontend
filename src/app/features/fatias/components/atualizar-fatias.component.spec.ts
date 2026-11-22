import { TestBed } from '@angular/core/testing';
import { horaDosDados } from '../fatias.apresentacao';
import { AtualizarFatiasComponent } from './atualizar-fatias.component';

const INSTANTE = '2026-11-22T14:05:00Z';

describe('[P1] AtualizarFatiasComponent', () => {
  function montar(entradas: Partial<Record<'geradoEm' | 'desatualizado' | 'atualizando' | 'recente', unknown>> = {}) {
    const fixture = TestBed.createComponent(AtualizarFatiasComponent);
    const valores = { geradoEm: INSTANTE, desatualizado: false, atualizando: false, recente: false, ...entradas };
    for (const [k, v] of Object.entries(valores)) fixture.componentRef.setInput(k, v);
    const atualizar = vi.fn();
    fixture.componentInstance.atualizar.subscribe(() => atualizar());
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { raiz, atualizar, botao: raiz.querySelector<HTMLButtonElement>('[data-testid="atualizar"]')!, aviso: raiz.querySelector('[aria-live]')! };
  }

  it('botão Atualizar emite o pedido', () => {
    const { botao, atualizar } = montar();
    expect(botao.textContent).toContain('Atualizar');
    botao.click();
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('mostra "dados de HH:MM" numa região aria-live polite', () => {
    const { aviso } = montar();
    expect(aviso.getAttribute('aria-live')).toBe('polite');
    expect(aviso.textContent).toContain(`dados de ${horaDosDados(INSTANTE)}`);
  });

  it('sem instante, não inventa hora', () => {
    const { aviso } = montar({ geradoEm: null });
    expect(aviso.textContent).not.toContain('dados de');
  });

  it('desatualizado: diz em texto, não só em cor', () => {
    const { aviso } = montar({ desatualizado: true });
    expect(aviso.textContent).toContain('desatualizados');
  });

  it('atualizando: desabilita o botão e anuncia', () => {
    const { botao, aviso } = montar({ atualizando: true });
    expect(botao.disabled).toBe(true);
    expect(botao.getAttribute('aria-busy')).toBe('true');
    expect(aviso.textContent).toContain('Atualizando');
  });

  it('limite de atualização (429): aviso leve de que os dados já são recentes', () => {
    const { aviso, botao } = montar({ recente: true });
    expect(aviso.textContent).toContain('já estão atualizados');
    expect(botao.disabled).toBe(false);
  });
});
