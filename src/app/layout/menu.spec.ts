import { Routes } from '@angular/router';
import type { RotaData } from '../shared/guards/rota-data';
import { itensDeMenu } from './menu';

const menu = (rotulo: string) => ({ menu: { rotulo, icone: 'lucideHouse' } }) satisfies RotaData;

describe('[F0.5] itensDeMenu', () => {
  it('monta o menu dos metadados das rotas, com o caminho de cada uma', () => {
    const rotas: Routes = [
      { path: '', data: menu('Início') },
      { path: 'aplicacoes', data: menu('Aplicações') },
    ];

    expect(itensDeMenu(rotas, [])).toEqual([
      { rotulo: 'Início', icone: 'lucideHouse', caminho: '/' },
      { rotulo: 'Aplicações', icone: 'lucideHouse', caminho: '/aplicacoes' },
    ]);
  });

  it('ignora a rota sem metadado de menu (sem-acesso, não encontrado, detalhes)', () => {
    const rotas: Routes = [
      { path: 'sem-acesso', data: {} },
      { path: 'aplicacoes/:id', data: {} },
      { path: '**' },
    ];

    expect(itensDeMenu(rotas, ['mor'])).toEqual([]);
  });

  it('desce nas rotas filhas acumulando o caminho, inclusive sob uma rota de caminho vazio', () => {
    const rotas: Routes = [
      {
        path: '',
        children: [
          { path: '', data: menu('Início') },
          { path: 'entregas', data: menu('Entregas'), children: [{ path: 'abrir', data: menu('Abrir') }] },
        ],
      },
    ];

    expect(itensDeMenu(rotas, []).map((i) => [i.rotulo, i.caminho])).toEqual([
      ['Início', '/'],
      ['Entregas', '/entregas'],
      ['Abrir', '/entregas/abrir'],
    ]);
  });

  it('esconde o item cujos perfis o usuário não tem, e mostra com um deles', () => {
    const rotas: Routes = [
      { path: '', data: menu('Início') },
      { path: 'auditoria', data: { ...menu('Auditoria'), perfis: ['mor', 'auditor'] } satisfies RotaData },
    ];

    expect(itensDeMenu(rotas, ['analista']).map((i) => i.rotulo)).toEqual(['Início']);
    expect(itensDeMenu(rotas, ['auditor']).map((i) => i.rotulo)).toEqual(['Início', 'Auditoria']);
  });

  it('trata perfis vazios como sem restrição', () => {
    const rotas: Routes = [{ path: 'x', data: { ...menu('X'), perfis: [] } satisfies RotaData }];

    expect(itensDeMenu(rotas, [])).toHaveLength(1);
  });
});
