import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PatientService } from '../services/patient.service';

@Component({
  selector: 'app-add-patient-modal',
  templateUrl: './add-patient-modal.component.html',
  styleUrls: ['./add-patient-modal.component.scss'],
  standalone: false,
})
export class AddPatientModalComponent implements OnInit {
  fullName: string = '';
  assignedStudy: number | null = null;
  appointmentTime: string = '';
  orariDisponibili: string[] = [];
  orarioAppuntamento: string = '';

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

  addPatient() {
    if (!this.fullName || !this.assignedStudy || !this.appointmentTime) return;
    this.patientService
      .addPatient(this.fullName, this.assignedStudy!, this.appointmentTime)
      .pipe()
      .subscribe((newPatient) => {
        this.fullName = '';
        this.assignedStudy = null;
        this.appointmentTime = '';
      });
    this.dismiss();
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
