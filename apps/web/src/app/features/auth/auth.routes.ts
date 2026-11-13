import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/auth.guards';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'titles.login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'titles.register',
    canActivate: [guestGuard],
    loadComponent: () => import('./register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'verify-email',
    title: 'titles.verifyEmail',
    loadComponent: () => import('./verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'forgot-password',
    title: 'titles.forgotPassword',
    canActivate: [guestGuard],
    loadComponent: () => import('./forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    title: 'titles.resetPassword',
    loadComponent: () => import('./reset-password.page').then((m) => m.ResetPasswordPage),
  },
];
