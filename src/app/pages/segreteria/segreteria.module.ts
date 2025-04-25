import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SegreteriaPageRoutingModule } from './segreteria-routing.module';

import { SegreteriaPage } from './segreteria.page';
import { AddPatientModalModule } from 'src/app/add-patient-modal/add-patient-modal.module';
import { EditPatientModalModule } from 'src/app/edit-patient-modal/edit-patient-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SegreteriaPageRoutingModule,
    AddPatientModalModule,
    EditPatientModalModule
  ],
  declarations: [SegreteriaPage]
})
export class SegreteriaPageModule {}
