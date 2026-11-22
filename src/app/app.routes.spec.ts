import { Route } from '@angular/router';
import { itensDeMenu } from './layout/menu';
import { featureGuard } from './shared/guards/feature.guard';
import type { RotaData } from './shared/guards/rota-data';
import { routes } from './app.routes';

const filhasDoShell = (routes[0].children ?? []) as Route[];

describe('[A1] rotas de Aplicações', () => {
  const rota = filhasDoShell.find((r) => r.path === 'aplicacoes');

  it('declara /aplicacoes atrás do flag A1, com item de menu "Aplicações"', () => {
    const data = rota?.data as RotaData;

    expect(data.feature).toBe('A1');
    expect(data.menu?.rotulo).toBe('Aplicações');
    expect(rota?.canMatch).toContain(featureGuard);
  });

  it('declara /aplicacoes e /aplicacoes/:id', () => {
    const caminhos = (rota?.children ?? []).map((r) => r.path);

    expect(caminhos).toEqual(['', ':id']);
  });

  it('o menu só mostra "Aplicações" com o flag A1 ligado', () => {
    expect(itensDeMenu(routes, ['mor'], () => false).map((i) => i.rotulo)).not.toContain('Aplicações');
    expect(itensDeMenu(routes, ['mor'], (c) => c === 'A1').map((i) => i.rotulo)).toContain('Aplicações');
  });

  it('o item de menu aponta para /aplicacoes e o detalhe não vira item', () => {
    const itens = itensDeMenu(routes, [], () => true).filter((i) => i.rotulo === 'Aplicações');

    expect(itens.map((i) => i.caminho)).toEqual(['/aplicacoes']);
  });
});
