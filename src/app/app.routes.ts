import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
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
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Início — Esteira',
        data: { menu: { rotulo: 'Início', icone: 'lucideHouse' } } satisfies RotaData,
        loadComponent: () => import('./features/inicio/pages/inicio.page').then((m) => m.InicioPage),
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
