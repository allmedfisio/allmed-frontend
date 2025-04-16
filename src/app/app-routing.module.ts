import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './services/auth-guard.service';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'segreteria',
    pathMatch: 'full'
  },
  {
    path: 'segreteria',
    loadChildren: () => import('./pages/segreteria/segreteria.module').then( m => m.SegreteriaPageModule),
    canActivate: [AuthGuardService]
  },
  {
    path: 'medico',
    loadChildren: () => import('./pages/medico/medico.module').then( m => m.MedicoPageModule)
  },
  {
    path: 'sala-attesa',
    loadChildren: () => import('./pages/sala-attesa/sala-attesa.module').then( m => m.SalaAttesaPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
