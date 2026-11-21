import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { RotaData } from './rota-data';

/**
 * Perfil é só o que o `me` devolve. O front não reimplementa regra de papel: papéis por Aplicação e
 * "o que posso fazer aqui" vêm da API (`/permissoes`, A1).
 */
export const perfilGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const exigidos = (route.data as RotaData).perfis;
  if (!exigidos?.length) return true;

  const usuario = auth.usuario();
  if (!usuario) {
    auth.entrar(state.url);
    return false;
  }
  return usuario.perfis.some((perfil) => exigidos.includes(perfil)) || inject(Router).createUrlTree(['/sem-acesso']);
};
