import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AddPatientModalComponent } from './add-patient-modal/add-patient-modal.component';
import { AddDoctorModalComponent } from './add-doctor-modal/add-doctor-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private modalController: ModalController) {}

  // Modali

  async openAddPatientModal() {
    const modal = await this.modalController.create({
      component: AddPatientModalComponent,
      cssClass: 'custom-modal',
    });
    return await modal.present();
  }

  async openAddDoctorModal() {
    const modal = await this.modalController.create({
      component: AddDoctorModalComponent,
      cssClass: 'custom-modal',
    });
    return await modal.present();
  }
}
