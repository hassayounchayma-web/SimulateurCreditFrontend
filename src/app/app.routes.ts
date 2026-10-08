// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Accueil
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(m => m.HomeComponent)
  },

  // Auth
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [LoginGuard]
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [LoginGuard]
  },

  // Zone client (protégée)
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/layouts/main-layout/main-layout.component').then(
        m => m.MainLayoutComponent
      ),
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'hub', pathMatch: 'full' },

      {
        path: 'hub',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            m => m.DashboardComponent
          )
      },
      {
        path: 'simulation',
        loadComponent: () =>
          import('./components/wizard/wizard.component').then(
            m => m.WizardComponent
          )
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('./components/historique/historique.component').then(
            m => m.HistoriqueComponent
          )
      },

      // Anciennes routes (optionnel)
      { path: 'categories', redirectTo: 'hub', pathMatch: 'full' },
      {
        path: 'simulateurs-internes',
        loadComponent: () =>
          import('./components/simulateurs/simulateurs.component').then(
            m => m.SimulateursComponent
          )
      },
      {
        path: 'simulateurs-internes/sans-rachat',
        loadComponent: () =>
          import('./components/simulateurs/simulateur-sans-rachat/simulateur-sans-rachat').then(
            m => m.SimulateurSansRachat
          )
      },
      {
        path: 'simulateurs-internes/rachat-interne',
        loadComponent: () =>
          import('./components/simulateurs/simulateur-rachat-interne/simulateur-rachat-interne').then(
            m => m.SimulateurRachatInterne
          )
      },
      {
        path: 'simulateurs-internes/rachat-externe',
        loadComponent: () =>
          import('./components/simulateurs/simulateur-rachat-externe/simulateur-rachat-externe').then(
            m => m.SimulateurRachatExterne
          )
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./components/agent/agent-page/agent-page.component').then(
            m => m.AgentPageComponent
          )
      }
    ]
  },

  // Zone admin (séparée du dashboard client)
  {
    path: 'admin',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('./components/admin/admin-layout/admin-layout.component').then(
        m => m.AdminLayoutComponent
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/admin/admin-dashboard/admin-dashboard.component').then(
            m => m.AdminDashboardComponent
          )
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/admin/admin-users/admin-users.component').then(
            m => m.AdminUsersComponent
          )
      },
      {
        path: 'simulations',
        loadComponent: () =>
          import('./components/admin/admin-simulations/admin-simulations.component').then(
            m => m.AdminSimulationsComponent
          )
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
