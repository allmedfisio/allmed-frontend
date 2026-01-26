import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './services/auth-guard.service';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () =>
      import('./home/home.module').then((m) => m.HomePageModule),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'segreteria',
    loadChildren: () =>
      import('./pages/segreteria/segreteria.module').then(
        (m) => m.SegreteriaPageModule,
      ),
    canActivate: [AuthGuardService],
    data: {
      roles: ['admin', 'segreteria'],
    },
  },
  {
    path: 'medico',
    loadChildren: () =>
      import('./pages/medico/medico.module').then((m) => m.MedicoPageModule),
    canActivate: [AuthGuardService],
    data: {
      roles: ['admin', 'segreteria', 'medico'],
    },
  },
  {
    path: 'sala-attesa',
    loadChildren: () =>
      import('./pages/sala-attesa/sala-attesa.module').then(
        (m) => m.SalaAttesaPageModule,
      ),
    canActivate: [AuthGuardService],
    data: {
      roles: ['admin', 'segreteria', 'sala-attesa'],
    },
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'ticket-config',
    loadChildren: () =>
      import('./pages/ticket-config/ticket-config.module').then(
        (m) => m.TicketConfigPageModule,
      ),
  },
  {
    path: 'follow-up',
    loadChildren: () =>
      import('./pages/follow-up/follow-up.module').then(
        (m) => m.FollowUpPageModule,
      ),
    canActivate: [AuthGuardService],
    data: {
      roles: ['admin', 'segreteria'],
    },
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
