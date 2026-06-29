import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared.module';
import { AnalisiMarketingPageRoutingModule } from './analisi-marketing-routing.module';
import { AnalisiMarketingPage } from './analisi-marketing.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    AnalisiMarketingPageRoutingModule,
  ],
  declarations: [AnalisiMarketingPage],
})
export class AnalisiMarketingPageModule {}
