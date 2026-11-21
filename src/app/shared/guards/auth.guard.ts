import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** Sem usuário no signal (o `me` do boot não achou sessão), vai ao login com o destino da navegação. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.usuario()) return true;
  auth.entrar(state.url);
  return false;
};
