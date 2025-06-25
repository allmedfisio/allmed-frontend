import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { Patient, PatientService } from '../services/patient.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-edit-patient-modal',
  templateUrl: './edit-patient-modal.component.html',
  styleUrls: ['./edit-patient-modal.component.scss'],
  standalone: false,
})
export class EditPatientModalComponent implements OnInit {
  @Input() patientData!: Patient;

  // campi legati a ngModel
  fullName!: string;
  assignedStudy!: number | string;
  appointmentTime!: string;
  orariDisponibili: string[] = [];
  orarioAppuntamento: string = '';
  studi: Array<number | string> = [1, 2, 3, 4, 5, 6, 'Palestra'];

  constructor(
    private modalCtrl: ModalController,
    private patientService: PatientService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // inizializza i form fields con i dati correnti
    this.fullName = this.patientData.full_name;
    this.assignedStudy = this.patientData.assigned_study;
    this.appointmentTime = this.patientData.appointment_time;

    // **estrai HH:mm dalla stringa ISO**
    const dt = new Date(this.appointmentTime);
    const hh = this.pad(dt.getHours());
    const mm = this.pad(dt.getMinutes());
    this.orarioAppuntamento = `${hh}:${mm}`;

    console.log('orario app: ' + this.orarioAppuntamento);

    // Genera gli orari disponibili
    this.generaOrariDisponibili();
  }

  async save() {
    const updates: Partial<Patient> = {};
    if (this.fullName !== this.patientData.full_name) {
      updates.full_name = this.fullName;
    }
    if (this.assignedStudy !== this.patientData.assigned_study) {
      updates.assigned_study = this.assignedStudy;
    }
    if (this.appointmentTime !== this.patientData.appointment_time) {
      updates.appointment_time = this.appointmentTime;
    }

    if (Object.keys(updates).length === 0) {
      // niente da salvare
      await this.toastCtrl
        .create({
          message: 'Nessuna modifica da salvare',
          duration: 1500,
          color: 'warning',
        })
        .then((t) => t.present());
      return;
    }

    this.patientService
      .updatePatient(this.patientData.id, updates)
      .pipe(take(1))
      .subscribe({
        next: async () => {
          await this.toastCtrl
            .create({
              message: 'Paziente aggiornato!',
              duration: 1500,
              color: 'success',
            })
            .then((t) => t.present());
          this.modalCtrl.dismiss();
        },
        error: async () => {
          await this.toastCtrl
            .create({
              message: "Errore durante l'aggiornamento",
              duration: 1500,
              color: 'danger',
            })
            .then((t) => t.present());
        },
      });
  }

  generaOrariDisponibili() {
    const inizio = 14; // ore 4
    const fine = 20; // ore 20
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

  cancel() {
    this.modalCtrl.dismiss();
  }
}
