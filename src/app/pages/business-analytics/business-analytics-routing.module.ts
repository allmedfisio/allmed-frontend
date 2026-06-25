import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BusinessAnalyticsPage } from './business-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: BusinessAnalyticsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BusinessAnalyticsPageRoutingModule {}
