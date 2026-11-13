import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    title: 'titles.adminUsers',
    loadComponent: () => import('./users-list.page').then((m) => m.UsersListPage),
  },
  {
    path: 'users/:id',
    title: 'titles.adminUser',
    loadComponent: () => import('./user-detail.page').then((m) => m.UserDetailPage),
  },
];
