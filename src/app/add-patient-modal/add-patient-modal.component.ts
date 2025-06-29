import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PatientService } from '../services/patient.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-add-patient-modal',
  templateUrl: './add-patient-modal.component.html',
  styleUrls: ['./add-patient-modal.component.scss'],
  standalone: false,
})
export class AddPatientModalComponent implements OnInit {
  fullName: string = '';
  assignedStudy!: number | string;
  appointmentTime: string = '';
  patientStatus: 'in_attesa' | 'prenotato' = 'in_attesa';
  orariDisponibili: string[] = [];
  orarioAppuntamento: string = '';
  studies: Array<number | string> = [1, 2, 3, 4, 5, 6, 'Palestra'];

  constructor(
    private patientService: PatientService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.generaOrariDisponibili();
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async addPatient() {
    if (
      !this.fullName ||
      !this.assignedStudy ||
      !this.appointmentTime ||
      !this.patientStatus
    )
      return;
    this.patientService
      .addPatient(
        this.fullName,
        this.assignedStudy,
        this.appointmentTime,
        this.patientStatus
      )
      .pipe()
      .subscribe({
        next: async (newPatient) => {
          this.modalController.dismiss({ patient: newPatient });
        },
        error: (err) => console.error(err),
      });
  }

  generaOrariDisponibili() {
    const inizio = 14; // ore 8
    const fine = 19.15; // ore 20
    const intervalloMinuti = 15;

    for (let ora = inizio; ora <= fine; ora++) {
      for (let minuti = 0; minuti < 60; minuti += intervalloMinuti) {
        const orario = `${this.pad(ora)}:${this.pad(minuti)}`;
        this.orariDisponibili.push(orario);
      }
    }
  }

  aggiornaDataCompleta() {
    console.log('orario app: ', this.orarioAppuntamento);
    const oggi = new Date();
    const [ore, minuti] = this.orarioAppuntamento.split(':').map(Number);

    const data = new Date(
      oggi.getFullYear(),
      oggi.getMonth(),
      oggi.getDate(),
      ore,
      minuti,
      0
    );

    // formato ISO "locale" (senza spostamento UTC)
    const yyyy = data.getFullYear();
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const dd = String(data.getDate()).padStart(2, '0');
    const hh = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');

    this.appointmentTime = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    console.log('app time: ', this.appointmentTime);
  }

  pad(numero: number): string {
    return numero < 10 ? '0' + numero : numero.toString();
  }
}
