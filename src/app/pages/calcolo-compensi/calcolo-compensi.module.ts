import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CalcoloCompensiPageRoutingModule } from './calcolo-compensi-routing.module';
import { CalcoloCompensiPage } from './calcolo-compensi.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CalcoloCompensiPageRoutingModule,
    CalcoloCompensiPage, // standalone component
  ],
})
export class CalcoloCompensiPageModule {}
