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

  it('esconde o filho de uma rota restrita: quem não abre o pai não vê o filho no menu', () => {
    const rotas: Routes = [
      {
        path: 'admin',
        data: { perfis: ['mor'] } satisfies RotaData,
        children: [{ path: 'usuarios', data: menu('Usuários') }],
      },
    ];

    expect(itensDeMenu(rotas, ['analista'])).toEqual([]);
    expect(itensDeMenu(rotas, ['mor']).map((i) => i.caminho)).toEqual(['/admin/usuarios']);
  });

  it('trata perfis vazios como sem restrição', () => {
    const rotas: Routes = [{ path: 'x', data: { ...menu('X'), perfis: [] } satisfies RotaData }];

    expect(itensDeMenu(rotas, [])).toHaveLength(1);
  });
});

describe('[A1] itensDeMenu com feature flag', () => {
  const rotas: Routes = [
    { path: '', data: menu('Início') },
    { path: 'aplicacoes', data: { ...menu('Aplicações'), feature: 'A1' } satisfies RotaData },
  ];

  it('esconde o item cuja feature está desligada', () => {
    expect(itensDeMenu(rotas, ['mor'], () => false).map((i) => i.rotulo)).toEqual(['Início']);
  });

  it('mostra o item quando a feature está ligada', () => {
    expect(itensDeMenu(rotas, ['mor'], (codigo) => codigo === 'A1').map((i) => i.rotulo)).toEqual(['Início', 'Aplicações']);
  });

  it('sem função de flags, rota com feature fica escondida (nunca ligada por omissão)', () => {
    expect(itensDeMenu(rotas, ['mor']).map((i) => i.rotulo)).toEqual(['Início']);
  });

  it('esconde também os filhos de uma rota com feature desligada', () => {
    const comFilho: Routes = [
      { path: 'aplicacoes', data: { feature: 'A1' } satisfies RotaData, children: [{ path: 'x', data: menu('X') }] },
    ];

    expect(itensDeMenu(comFilho, [], () => false)).toEqual([]);
    expect(itensDeMenu(comFilho, [], () => true).map((i) => i.caminho)).toEqual(['/aplicacoes/x']);
  });
});
