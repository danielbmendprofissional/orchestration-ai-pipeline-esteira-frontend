import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AvisoDoPainel } from '../fatias.tipos';
import { FatiasAvisosComponent } from './fatias-avisos.component';

const aviso = (codigo: string, extra: Partial<AvisoDoPainel> = {}): AvisoDoPainel => ({
  aplicacaoId: 'a1', aplicacao: 'Valuto', codigo, mensagem: `mensagem ${codigo}`, ...extra,
});

describe('[P1] FatiasAvisosComponent', () => {
  let fixtureAtual: ComponentFixture<FatiasAvisosComponent>;
  function montar(avisos: AvisoDoPainel[], carregando = false) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FatiasAvisosComponent);
    fixtureAtual = fixture;
    fixture.componentRef.setInput('avisos', avisos);
    fixture.componentRef.setInput('carregando', carregando);
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

  describe('[P1] Tentar de novo (critério 15)', () => {
    const botoes = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll<HTMLButtonElement>('button'));

    it('só gitlab.indisponivel e painel.indisponivel oferecem o botão, e ele emite', () => {
      const raiz = montar([aviso('gitlab.indisponivel'), aviso('painel.indisponivel'), aviso('gitlab.bot-nao-configurado'), aviso('painel.sem-workspace')]);
      expect(botoes(raiz)).toHaveLength(2);
      expect(botoes(raiz).every((b) => b.textContent!.includes('Tentar de novo'))).toBe(true);
      let emitidos = 0;
      fixtureAtual.componentInstance.tentarDeNovo.subscribe(() => emitidos++);
      botoes(raiz)[0].click();
      expect(emitidos).toBe(1);
    });

    it('fica desabilitado enquanto carrega', () => {
      const raiz = montar([aviso('gitlab.indisponivel')], true);
      expect(botoes(raiz)[0].disabled).toBe(true);
    });
  });

  it('mensagem com marcação é texto (critério 17)', () => {
    const raiz = montar([aviso('gitlab.indisponivel', { mensagem: '<b>x</b><img src=x>' })]);
    expect(raiz.querySelector('b, img')).toBeNull();
    expect(raiz.textContent).toContain('<b>x</b><img src=x>');
  });
});
