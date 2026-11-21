import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth/auth.guards';

// `title` values are translation keys, resolved by TranslatedTitleStrategy.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'titles.home',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'accessibility',
    title: 'titles.accessibility',
    loadComponent: () =>
      import('./features/accessibility/accessibility.page').then((m) => m.AccessibilityPage),
  },
  {
    path: 'dashboard',
    title: 'titles.dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'account',
    title: 'titles.account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    title: 'titles.notFound',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
