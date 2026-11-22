import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AvisoDoPainel } from '../fatias.tipos';
import { FatiasAvisosComponent } from './fatias-avisos.component';

const aviso = (codigo: string, extra: Partial<AvisoDoPainel> = {}): AvisoDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', codigo, mensagem: `mensagem ${codigo}`, ...extra,
});

describe('[P1] FatiasAvisosComponent', () => {
  function montar(avisos: AvisoDoPainel[]) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FatiasAvisosComponent);
    fixture.componentRef.setInput('avisos', avisos);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sem avisos não desenha nada', () => {
    expect(montar([]).querySelector('[data-testid="aviso"]')).toBeNull();
  });

  it('sem workspace: nome da Aplicação, mensagem e link para o cadastro dela', () => {
    const raiz = montar([aviso('painel.sem-workspace', { aplicacaoId: 'abc' })]);
    const a = raiz.querySelector('[data-testid="aviso"]')!;
    expect(a.textContent).toContain('Valuto');
    expect(a.textContent).toContain('mensagem painel.sem-workspace');
    const link = a.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/aplicacoes/abc');
    expect(link.textContent).toContain('Cadastrar workspace');
  });

  it('bot não configurado e GitLab fora mostram a mensagem, sem link', () => {
    const raiz = montar([aviso('gitlab.bot-nao-configurado'), aviso('gitlab.indisponivel', { aplicacao: 'Portal' })]);
    const avisos = raiz.querySelectorAll('[data-testid="aviso"]');
    expect(avisos).toHaveLength(2);
    expect(avisos[0].textContent).toContain('mensagem gitlab.bot-nao-configurado');
    expect(avisos[1].textContent).toContain('Portal');
    expect(raiz.querySelector('a')).toBeNull();
  });

  it('mensagem com marcação é texto (critério 17)', () => {
    const raiz = montar([aviso('gitlab.indisponivel', { mensagem: '<b>x</b><img src=x>' })]);
    expect(raiz.querySelector('b, img')).toBeNull();
    expect(raiz.textContent).toContain('<b>x</b><img src=x>');
  });
});
