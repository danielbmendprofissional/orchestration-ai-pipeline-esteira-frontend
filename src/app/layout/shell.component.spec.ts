import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import type { UsuarioLogado } from '../core/auth/auth-api.service';
import { AppConfigService } from '../core/config/app-config.service';
import type { RotaData } from '../shared/guards/rota-data';
import { ShellComponent } from './shell.component';

@Component({ template: 'conteúdo da rota', changeDetection: ChangeDetectionStrategy.OnPush })
class PaginaFalsa {}

const rotas: Routes = [
  { path: '', component: PaginaFalsa, data: { menu: { rotulo: 'Início', icone: 'lucideHouse' } } satisfies RotaData },
  {
    path: 'restrito',
    component: PaginaFalsa,
    data: { menu: { rotulo: 'Restrito', icone: 'lucideHouse' }, perfis: ['mor'] } satisfies RotaData,
  },
];

const dev: UsuarioLogado = { usuario: 'dev', nome: 'Dev Esteira', email: 'dev@esteira.local', perfis: ['mor'] };

describe('[F0.5] ShellComponent', () => {
  let sair: ReturnType<typeof vi.fn>;

  async function montar(usuario: UsuarioLogado) {
    sair = vi.fn();
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter(rotas),
        { provide: AuthService, useValue: { usuario: signal(usuario).asReadonly(), sair } },
        { provide: AppConfigService, useValue: { config: () => ({ ambiente: 'HML' }) } },
      ],
    });
    const fixture = TestBed.createComponent(ShellComponent);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  const nomesDosLinks = (raiz: HTMLElement) =>
    [...raiz.querySelectorAll('nav li a')].map((a) => a.textContent?.trim());

  it('tem os marcos header, nav e main e o link para pular ao conteúdo', async () => {
    const { raiz } = await montar(dev);

    expect(raiz.querySelector('header')).not.toBeNull();
    expect(raiz.querySelector('nav[aria-label="Principal"]')).not.toBeNull();
    expect(raiz.querySelector('main#conteudo')).not.toBeNull();
    expect(raiz.querySelector('a[href="#conteudo"]')?.textContent).toContain('Pular para o conteúdo');
  });

  it('mostra no menu só o que o perfil do usuário abre', async () => {
    const mor = await montar(dev);
    expect(nomesDosLinks(mor.raiz)).toEqual(['Início', 'Restrito']);
  });

  it('esconde o item restrito de quem não tem o perfil', async () => {
    const { raiz } = await montar({ ...dev, perfis: [] });

    expect(nomesDosLinks(raiz)).toEqual(['Início']);
  });

  it('mostra o selo do ambiente e o nome do usuário no cabeçalho', async () => {
    const { raiz } = await montar(dev);
    const cabecalho = raiz.querySelector('header')!;

    expect(cabecalho.textContent).toContain('HML');
    expect(cabecalho.textContent).toContain('Dev Esteira');
  });

  it('renderiza a rota ativa dentro do main', async () => {
    const { raiz } = await montar(dev);

    expect(raiz.querySelector('main')?.textContent).toContain('conteúdo da rota');
  });

  it('pular para o conteúdo leva o foco ao main', async () => {
    const { raiz } = await montar(dev);

    raiz.querySelector<HTMLAnchorElement>('a[href="#conteudo"]')!.click();

    expect(document.activeElement).toBe(raiz.querySelector('main'));
  });

  it('o menu do usuário mostra e-mail e perfis e o Sair navega ao logout', async () => {
    const { fixture, raiz } = await montar(dev);

    raiz.querySelector<HTMLButtonElement>('header button[aria-label^="Menu do usuário"]')!.click();
    await fixture.whenStable();

    const aberto = document.body.querySelector('[data-slot="dropdown-menu"]')!;
    expect(aberto.textContent).toContain('dev@esteira.local');
    expect(aberto.textContent).toContain('mor');

    [...aberto.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')]
      .find((item) => item.textContent?.includes('Sair'))!
      .click();
    expect(sair).toHaveBeenCalledTimes(1);
  });
});
