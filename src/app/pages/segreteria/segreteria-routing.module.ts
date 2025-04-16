import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SegreteriaPage } from './segreteria.page';

const routes: Routes = [
  {
    path: '',
    component: SegreteriaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SegreteriaPageRoutingModule {}
