import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SegreteriaPageRoutingModule } from './segreteria-routing.module';

import { SegreteriaPage } from './segreteria.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SegreteriaPageRoutingModule,
  ],
  declarations: [SegreteriaPage]
})
export class SegreteriaPageModule {}
