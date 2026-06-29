import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnalisiMarketingPage } from './analisi-marketing.page';

const routes: Routes = [
  {
    path: '',
    component: AnalisiMarketingPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalisiMarketingPageRoutingModule {}
