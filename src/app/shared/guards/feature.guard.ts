import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import type { RotaData } from './rota-data';

/**
 * `canMatch`, e não `canActivate`: com o flag desligado a rota nem casa, e a URL cai no `**` (Não encontrado),
 * como se a tela não existisse (critério 17 da A1).
 */
export const featureGuard: CanMatchFn = (route) => {
  const feature = (route.data as RotaData | undefined)?.feature;
  return !feature || inject(FeatureFlagsService).isEnabled(feature);
};
