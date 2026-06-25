import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared.module';
import { BusinessAnalyticsPageRoutingModule } from './business-analytics-routing.module';
import { BusinessAnalyticsPage } from './business-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    BusinessAnalyticsPageRoutingModule,
  ],
  declarations: [BusinessAnalyticsPage],
})
export class BusinessAnalyticsPageModule {}
