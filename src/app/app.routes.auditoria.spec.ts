import { Route } from '@angular/router';
import { itensDeMenu } from './layout/menu';
import { ICONES_DO_SHELL } from './layout/icones';
import { featureGuard } from './shared/guards/feature.guard';
import type { RotaData } from './shared/guards/rota-data';
import { routes } from './app.routes';

const filhasDoShell = (routes[0].children ?? []) as Route[];

describe('[X1] rota da Auditoria', () => {
  const rota = filhasDoShell.find((r) => r.path === 'auditoria');

  it('declara /auditoria atrás do flag X1 (canMatch), com item de menu "Auditoria"', () => {
    const data = rota?.data as RotaData;

    expect(data.feature).toBe('X1');
    expect(data.menu?.rotulo).toBe('Auditoria');
    expect(rota?.canMatch).toContain(featureGuard);
  });

  it('a gaveta mora na URL: /auditoria/:id', () => {
    expect(rota?.children?.map((r) => r.path)).toEqual(['', ':id']);
  });

  it('sem o flag X1 o item some do menu; ligado, aponta para /auditoria; sem exigir perfil', () => {
    expect(itensDeMenu(routes, ['mor'], () => false).map((i) => i.rotulo)).not.toContain('Auditoria');
    expect(itensDeMenu(routes, [], (c) => c === 'X1').filter((i) => i.rotulo === 'Auditoria').map((i) => i.caminho)).toEqual(['/auditoria']);
    expect((rota?.data as RotaData).perfis).toBeUndefined();
  });

  it('o ícone do menu existe no shell', () => {
    expect(Object.keys(ICONES_DO_SHELL)).toContain((rota?.data as RotaData).menu?.icone);
  });
});
