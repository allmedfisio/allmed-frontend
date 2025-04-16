import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SalaAttesaPage } from './sala-attesa.page';

const routes: Routes = [
  {
    path: '',
    component: SalaAttesaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalaAttesaPageRoutingModule {}
