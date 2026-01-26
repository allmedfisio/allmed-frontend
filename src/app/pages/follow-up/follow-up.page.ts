import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Patient, PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-follow-up',
  templateUrl: './follow-up.page.html',
  styleUrls: ['./follow-up.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class FollowUpPage implements OnInit {
  followUpPatients$!: Observable<Patient[]>;
  threeMonthsAgo!: Date;

  constructor(
    private patientService: PatientService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
  ) {}

  ngOnInit() {
    this.threeMonthsAgo = this.computeThreeMonthsAgo();

    this.followUpPatients$ = this.patientService.patients$.pipe(
      map((list) =>
        list
          .filter(
            (p) =>
              p.status === 'in_archivio' &&
              !!p.last_visit_date &&
              this.isReadyForFollowUp(p.last_visit_date!),
          )
          .sort(
            (a, b) =>
              new Date(a.last_visit_date!).getTime() -
              new Date(b.last_visit_date!).getTime(),
          ),
      ),
    );
  }

  private computeThreeMonthsAgo(): Date {
    const today = new Date();
    const result = new Date(today);
    result.setMonth(result.getMonth() - 3);
    return result;
  }

  private isReadyForFollowUp(dateStr: string): boolean {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    return d <= this.threeMonthsAgo;
  }

  completeFollowUp(patient: Patient) {
    this.patientService.removePatient(patient.id).subscribe(
      () => {
        this.toastCtrl
          .create({
            message: `✓ Follow-up di ${patient.full_name} completato con successo`,
            duration: 2500,
            color: 'success',
          })
          .then((t) => t.present());
      },
      (error) => {
        console.error('Errore completamento follow-up:', error);
        this.toastCtrl
          .create({
            message: `⚠ Impossibile completare il follow-up. Riprova più tardi`,
            duration: 3000,
            color: 'danger',
          })
          .then((t) => t.present());
      },
    );
  }

  goBack() {
    this.navCtrl.navigateBack('/segreteria');
  }
}
