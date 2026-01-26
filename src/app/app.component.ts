import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Patient, PatientService } from './services/patient.service';
import { AddPatientModalComponent } from './add-patient-modal/add-patient-modal.component';
import { AddDoctorModalComponent } from './add-doctor-modal/add-doctor-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  followUpCount$!: Observable<number>;

  constructor(
    private modalController: ModalController,
    private patientService: PatientService,
  ) {
    // Conta i pazienti in follow-up
    this.followUpCount$ = this.patientService.patients$.pipe(
      map((list) => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return list.filter(
          (p) =>
            p.status === 'in_archivio' &&
            !!p.last_visit_date &&
            new Date(p.last_visit_date) <= threeMonthsAgo,
        ).length;
      }),
    );
  }

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
