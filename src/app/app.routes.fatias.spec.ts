import { Route } from '@angular/router';
import { itensDeMenu } from './layout/menu';
import { ICONES_DO_SHELL } from './layout/icones';
import { featureGuard } from './shared/guards/feature.guard';
import type { RotaData } from './shared/guards/rota-data';
import { routes } from './app.routes';

const filhasDoShell = (routes[0].children ?? []) as Route[];

describe('P1 · rota do Painel de Fatias', () => {
  const rota = filhasDoShell.find((r) => r.path === 'fatias');

  it('declara /fatias atrás do flag P1, com item de menu "Painel de Fatias"', () => {
    const data = rota?.data as RotaData;

    expect(data.feature).toBe('P1');
    expect(data.menu?.rotulo).toBe('Painel de Fatias');
    expect(rota?.canMatch).toContain(featureGuard);
  });

  it('flag desligado esconde o item de menu; ligado, mostra apontando para /fatias', () => {
    expect(itensDeMenu(routes, ['mor'], () => false).map((i) => i.rotulo)).not.toContain('Painel de Fatias');
    const itens = itensDeMenu(routes, ['mor'], (c) => c === 'P1').filter((i) => i.rotulo === 'Painel de Fatias');
    expect(itens.map((i) => i.caminho)).toEqual(['/fatias']);
  });

  it('o ícone do menu existe no shell', () => {
    expect(Object.keys(ICONES_DO_SHELL)).toContain((rota?.data as RotaData).menu?.icone);
  });
});
