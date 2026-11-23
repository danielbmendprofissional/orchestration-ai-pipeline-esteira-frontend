import { Route } from '@angular/router';
import { FLAG_DAS_ACOES } from './features/fatias/fatias.service';
import type { RotaData } from './shared/guards/rota-data';
import { routes } from './app.routes';

const rota = ((routes[0].children ?? []) as Route[]).find((r) => r.path === 'fatias');

describe('[P2] rota do Painel de Fatias', () => {
  it('a rota segue sob P1 e declara P2 como a flag das ações de decisão', () => {
    const data = rota?.data as RotaData;

    expect(data.feature).toBe('P1');
    expect(data.featureAcoes).toBe('P2');
    expect(FLAG_DAS_ACOES).toBe(data.featureAcoes);
  });
});
