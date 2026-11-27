import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { featureGuard } from './shared/guards/feature.guard';
import type { RotaData } from './shared/guards/rota-data';

/**
 * Tudo mora sob o shell e exige sessão. Rota com item de menu declara `data.menu`; rota restrita declara
 * `data.perfis` e leva o `perfilGuard`. Quem abre a rota é quem a vê no menu (mesmo dado).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    // canActivate só roda na entrada do shell; o menu navega filho a filho e precisa rechecar a sessão.
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Início — Esteira',
        data: { menu: { rotulo: 'Início', icone: 'lucideHouse' } } satisfies RotaData,
        loadComponent: () => import('./features/inicio/pages/inicio.page').then((m) => m.InicioPage),
      },
      {
        // Atrás do flag Features:A1: desligado, a rota nem casa e a URL cai no Não encontrado.
        path: 'aplicacoes',
        canMatch: [featureGuard],
        data: { menu: { rotulo: 'Aplicações', icone: 'lucideLayers' }, feature: 'A1' } satisfies RotaData,
        children: [
          {
            path: '',
            title: 'Aplicações — Esteira',
            loadComponent: () =>
              import('./features/aplicacoes/pages/aplicacoes-lista.page').then((m) => m.AplicacoesListaPage),
          },
          {
            path: ':id',
            title: 'Aplicação — Esteira',
            loadComponent: () =>
              import('./features/aplicacoes/pages/aplicacao-detalhe.page').then((m) => m.AplicacaoDetalhePage),
          },
        ],
      },
      {
        // Atrás do flag Features:P1: desligado, a rota nem casa e a URL cai no Não encontrado.
        path: 'fatias',
        canMatch: [featureGuard],
        title: 'Painel de Fatias — Esteira',
        data: { menu: { rotulo: 'Painel de Fatias', icone: 'lucideListChecks' }, feature: 'P1', featureAcoes: 'P2' } satisfies RotaData,
        loadComponent: () => import('./features/fatias/pages/fatias.page').then((m) => m.FatiasPage),
      },
      {
        // Atrás do flag Features:E1b: desligado, a rota nem casa e a URL cai no Não encontrado. Sem item de menu (o menu é da E1a).
        path: 'entregas/:id',
        canMatch: [featureGuard],
        title: 'Entrega — Esteira',
        data: { feature: 'E1b' } satisfies RotaData,
        loadComponent: () => import('./features/entregas/pages/entrega.page').then((m) => m.EntregaPage),
      },
      {
        path: 'sem-acesso',
        title: 'Sem acesso — Esteira',
        loadComponent: () => import('./layout/pages/sem-acesso.page').then((m) => m.SemAcessoPage),
      },
      {
        path: '**',
        title: 'Página não encontrada — Esteira',
        loadComponent: () => import('./layout/pages/nao-encontrado.page').then((m) => m.NaoEncontradoPage),
      },
    ],
  },
];
