import { Routes } from '@angular/router';

import { redirectLoggedInGuard } from './auth/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
    title: 'Login',
    canActivate: [redirectLoggedInGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
    title: 'Register',
    canActivate: [redirectLoggedInGuard],
  },
  {
    path: 'newsletter',
    loadComponent: () =>
      import('./pages/demo/newsletter/newsletter.page').then((m) => m.NewsletterPage),
    title: 'Newsletter',
  },
  {
    path: 'cookie-consent',
    loadComponent: () =>
      import('./pages/demo/cookie-consent/cookie-consent.page').then((m) => m.CookieConsentPage),
    title: 'Newsletter',
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./pages/forbidden.page').then((m) => m.ForbiddenPage),
    title: 'Forbidden',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/404.page').then((m) => m.NotFoundPage),
    title: 'Not Found',
  },
];
