import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoPageRoutingModule } from './medico-routing.module';

import { MedicoPage } from './medico.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoPageRoutingModule,
    SharedModule,
  ],
  declarations: [MedicoPage],
})
export class MedicoPageModule {}
