import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CalcoloCompensiPage } from './calcolo-compensi.page';

const routes: Routes = [
  {
    path: '',
    component: CalcoloCompensiPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CalcoloCompensiPageRoutingModule {}
