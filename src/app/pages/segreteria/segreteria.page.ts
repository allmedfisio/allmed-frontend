import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { AddPatientModalComponent } from 'src/app/add-patient-modal/add-patient-modal.component';
import { AddDoctorModalComponent } from 'src/app/add-doctor-modal/add-doctor-modal.component';
import { EditPatientModalComponent } from 'src/app/edit-patient-modal/edit-patient-modal.component';
import { Patient, PatientService } from 'src/app/services/patient.service';
import { Observable, take, firstValueFrom } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Doctor, DoctorService } from 'src/app/services/doctor.service';
import { AuthService, UserProfile } from 'src/app/services/auth.service';

interface PatientGroup {
  study: number;
  patients: Patient[];
}

interface DoctorGroup {
  study: number;
  doctors: Doctor[];
}

@Component({
  selector: 'app-segreteria',
  templateUrl: './segreteria.page.html',
  styleUrls: ['./segreteria.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegreteriaPage implements OnInit {
  userProfile$!: Observable<UserProfile>;
  patientsByStatus$!: Observable<{
    waiting: { study: number; patients: Patient[] }[];
    inVisit: { study: number; patients: Patient[] }[];
  }>;
  doctorsByStudy$!: Observable<DoctorGroup[]>;

  // Campi per le modali
  fullName: string = '';
  assignedStudy: number | null = null;
  doctorName: string = '';
  doctorStudy: number = NaN;

  // Dati dell'user -> Da modificare
  userName: string = 'Nome Utente';
  userImage: string = 'path-to-image.jpg';

  constructor(
    private router: Router,
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Sottoscrivi (via async pipe) al profilo
    this.userProfile$ = this.authService.profile$;

    // Divide i pazienti in base allo status
    this.patientsByStatus$ = this.patientService.patients$.pipe(
      map((list) => this.groupByStatus(list))
    );

    // Carica i medici attivi solo una volta
    this.doctorsByStudy$ = this.doctorService.doctors$.pipe(
      tap((list) => console.log('SegreteriaPage: nuovi medici ricevuti', list)),
      map((list) => this.groupByStudy(list))
    );
  }

  // Funzioni di Patient

  removePatient(patientId: string) {
    this.patientService.removePatient(patientId).subscribe();
  }

  async callPatient(patient: Patient): Promise<void> {
    // Preleva lista dei gruppi di medici
    const groups = await firstValueFrom(this.doctorsByStudy$);
    // Cerca il gruppo giusto e il primo medico
    const group = groups.find((g) => g.study === patient.assigned_study);
    const doc = group?.doctors[0];

    if (!doc) {
      this.presentToast(
        `Nessun medico per lo studio ${patient.assigned_study}`,
        'danger'
      );
      return;
    }

    try {
      // Esiste: chiamiamo il paziente
      await firstValueFrom(
        this.patientService.callPatient(patient.id).pipe(take(1))
      );
      // Aggiorna il paziente in visita del medico
      await firstValueFrom(
        this.doctorService
          .updateLastPatient(doc.id, patient.full_name)
          .pipe(take(1))
      );
      this.presentToast(
        `Paziente ${patient.full_name} chiamato dallo studio ${patient.assigned_study}`,
        'success'
      );
    } catch (err: any) {
      this.presentToast(`Errore: ${err.message}`, 'danger');
    }
  }

  // Funzioni di Doctor

  addDoctor() {
    if (!this.doctorName || isNaN(this.doctorStudy)) return;
    this.doctorService
      .addDoctor(this.doctorName, this.doctorStudy)
      .subscribe(() => {
        this.doctorName = '';
        this.doctorStudy = NaN;
      });
  }

  removeDoctor(id: string) {
    this.doctorService.removeDoctor(id).subscribe();
  }

  // ========== Grouping Helpers ==========

  private groupByStatus(list: Patient[]): {
    waiting: PatientGroup[];
    inVisit: PatientGroup[];
  } {
    const byStatus = (status: Patient['status']) => {
      // Filtro per status
      let slice = list.filter((p) => p.status === status);

      // Ordino per appointment_time crescente
      slice = slice.sort((a, b) =>
        a.appointment_time.localeCompare(b.appointment_time)
      );

      // Raggruppo per studio
      const studies = Array.from(
        new Set(slice.map((p) => p.assigned_study))
      ).sort((a, b) => a - b);
      return studies.map((study) => ({
        study,
        patients: slice.filter((p) => p.assigned_study === study),
      }));
    };
    return { waiting: byStatus('in_attesa'), inVisit: byStatus('in_visita') };
  }

  private groupByStudy(list: Doctor[]) {
    const studies = Array.from(new Set(list.map((d) => d.study)));
    return studies.map((study) => ({
      study,
      doctors: list.filter((d) => d.study === study),
    }));
  }

  // ========== trackBy ==========

  trackByStudy(index: number, group: { study: number }) {
    return group.study;
  }

  trackByPatientId(index: number, item: Patient) {
    return item.id;
  }

  trackByDoctorId(index: number, item: Doctor) {
    return item.id;
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

  async openEditPatientModal(patient: any) {
    const modal = await this.modalController.create({
      component: EditPatientModalComponent,
      cssClass: 'custom-modal',
      componentProps: {
        patientData: patient,
      },
    });
    return await modal.present();
  }

  // Toast

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // Logout

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
