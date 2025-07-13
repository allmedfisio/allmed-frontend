import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgendaPageRoutingModule } from './agenda-routing.module';
import { AgendaPage } from './agenda.page';
import { EditPatientModalModule } from '../../edit-patient-modal/edit-patient-modal.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AgendaPageRoutingModule, EditPatientModalModule],
  declarations: [AgendaPage],
})
export class AgendaPageModule {}
