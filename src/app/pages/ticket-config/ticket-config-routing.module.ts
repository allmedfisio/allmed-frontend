import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TicketConfigPage } from './ticket-config.page';

const routes: Routes = [
  {
    path: '',
    component: TicketConfigPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TicketConfigPageRoutingModule {}
