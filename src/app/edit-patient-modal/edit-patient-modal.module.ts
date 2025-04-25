import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditPatientModalComponent } from './edit-patient-modal.component';

@NgModule({
  declarations: [EditPatientModalComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule
  ],
  exports: [EditPatientModalComponent]
})
export class EditPatientModalModule {}