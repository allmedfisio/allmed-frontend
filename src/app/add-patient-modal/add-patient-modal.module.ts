import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AddPatientModalComponent } from './add-patient-modal.component';

@NgModule({
  declarations: [AddPatientModalComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  exports: [AddPatientModalComponent]
})
export class AddPatientModalModule {}
