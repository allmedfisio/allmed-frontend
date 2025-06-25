import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AddDoctorModalComponent } from './add-doctor-modal.component';

@NgModule({
  declarations: [AddDoctorModalComponent],
  imports: [CommonModule, FormsModule, IonicModule],
  exports: [AddDoctorModalComponent],
})
export class AddDoctorModalModule {}
