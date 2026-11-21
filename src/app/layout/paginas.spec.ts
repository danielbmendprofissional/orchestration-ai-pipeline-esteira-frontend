import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { InicioPage } from '../features/inicio/pages/inicio.page';
import { NaoEncontradoPage } from './pages/nao-encontrado.page';
import { SemAcessoPage } from './pages/sem-acesso.page';

describe('[F0.5] páginas do shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { usuario: signal({ usuario: 'dev', nome: 'Dev Esteira', email: 'dev@esteira.local', perfis: [] }) },
        },
      ],
    });
  });

  const renderizar = async (tipo: typeof InicioPage | typeof SemAcessoPage | typeof NaoEncontradoPage) => {
    const fixture = TestBed.createComponent(tipo);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('Início tem um h1 e cumprimenta pelo nome', async () => {
    const raiz = await renderizar(InicioPage);

    expect(raiz.querySelector('h1')?.textContent).toContain('Início');
    expect(raiz.textContent).toContain('Dev Esteira');
  });

  it('Sem acesso explica e oferece voltar ao início', async () => {
    const raiz = await renderizar(SemAcessoPage);

    expect(raiz.querySelector('h1')?.textContent).toContain('Sem acesso');
    expect(raiz.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('Não encontrado explica e oferece voltar ao início', async () => {
    const raiz = await renderizar(NaoEncontradoPage);

    expect(raiz.querySelector('h1')?.textContent).toContain('Página não encontrada');
    expect(raiz.querySelector('a[href="/"]')).not.toBeNull();
  });
});
