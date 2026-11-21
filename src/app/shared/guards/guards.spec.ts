import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { UsuarioLogado } from '../../core/auth/auth-api.service';
import { authGuard } from './auth.guard';
import { perfilGuard } from './perfil.guard';
import type { RotaData } from './rota-data';

const usuario = (perfis: string[]): UsuarioLogado => ({ usuario: 'dev', nome: 'Dev', email: 'dev@esteira.local', perfis });
const estado = { url: '/aplicacoes?aba=projetos' } as RouterStateSnapshot;
const rota = (data: RotaData = {}) => {
  const snapshot = new ActivatedRouteSnapshot();
  snapshot.data = data;
  return snapshot;
};

describe('[F0.5] guards de rota', () => {
  let atual: ReturnType<typeof signal<UsuarioLogado | null>>;
  let entrar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    atual = signal<UsuarioLogado | null>(null);
    entrar = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { usuario: atual.asReadonly(), entrar } }],
    });
  });

  const rodar = (guard: typeof authGuard, data?: RotaData) =>
    TestBed.runInInjectionContext(() => guard(rota(data), estado));

  describe('authGuard', () => {
    it('libera a rota quando há usuário', () => {
      atual.set(usuario([]));

      expect(rodar(authGuard)).toBe(true);
      expect(entrar).not.toHaveBeenCalled();
    });

    it('bloqueia e leva ao login com o destino da navegação quando não há usuário', () => {
      expect(rodar(authGuard)).toBe(false);
      expect(entrar).toHaveBeenCalledWith('/aplicacoes?aba=projetos');
    });
  });

  describe('perfilGuard', () => {
    it.each([undefined, [] as string[]])('libera a rota sem restrição de perfil (%j)', (perfis) => {
      atual.set(usuario([]));

      expect(rodar(perfilGuard, { perfis })).toBe(true);
    });

    it('libera quando o usuário tem ao menos um dos perfis da rota', () => {
      atual.set(usuario(['analista', 'mor']));

      expect(rodar(perfilGuard, { perfis: ['mor', 'publicador'] })).toBe(true);
    });

    it('leva a /sem-acesso quando o usuário não tem nenhum dos perfis', () => {
      atual.set(usuario(['analista']));

      const resultado = rodar(perfilGuard, { perfis: ['mor'] });

      expect(resultado).toBeInstanceOf(UrlTree);
      expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/sem-acesso');
      expect(entrar).not.toHaveBeenCalled();
    });

    it('leva ao login, e não a /sem-acesso, quando nem há usuário', () => {
      expect(rodar(perfilGuard, { perfis: ['mor'] })).toBe(false);
      expect(entrar).toHaveBeenCalledWith('/aplicacoes?aba=projetos');
    });
  });
});
