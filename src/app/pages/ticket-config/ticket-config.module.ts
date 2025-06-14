import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TicketConfigPageRoutingModule } from './ticket-config-routing.module';

import { TicketConfigPage } from './ticket-config.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TicketConfigPageRoutingModule,
    SharedModule,
  ],
  declarations: [TicketConfigPage],
})
export class TicketConfigPageModule {}
