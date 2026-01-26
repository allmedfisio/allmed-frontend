import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { Patient, PatientService } from '../services/patient.service';
import { DoctorService, Doctor } from '../services/doctor.service';
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
  assignedDoctor!: string;
  appointmentTime!: string;
  phone: string = '';
  orariDisponibili: string[] = [];
  orarioAppuntamento: string = '';
  doctors: Doctor[] = [];

  constructor(
    private modalCtrl: ModalController,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    // inizializza i form fields con i dati correnti
    this.fullName = this.patientData.full_name;
    this.assignedDoctor = this.patientData.assigned_doctor_name || '';
    this.appointmentTime = this.patientData.appointment_time;
    this.phone = this.patientData.phone || '';

    // Carica la lista dei medici
    this.doctorService.doctors$.subscribe((doctors) => {
      this.doctors = doctors;
    });

    // Genera gli orari disponibili PRIMA di estrarre l'orario
    this.generaOrariDisponibili();

    // **estrai HH:mm dalla stringa ISO**
    if (this.appointmentTime) {
      const dt = new Date(this.appointmentTime);
      const hh = this.pad(dt.getHours());
      const mm = this.pad(dt.getMinutes());
      this.orarioAppuntamento = `${hh}:${mm}`;
      console.log('orario app estratto: ' + this.orarioAppuntamento);

      // Se l'orario estratto non è negli orari disponibili, aggiungilo
      if (!this.orariDisponibili.includes(this.orarioAppuntamento)) {
        this.orariDisponibili.push(this.orarioAppuntamento);
        this.orariDisponibili.sort(); // ordina gli orari
        console.log('Orario aggiunto:', this.orarioAppuntamento);
      }
    }
  }

  async save() {
    const updates: Partial<Patient> = {};
    if (this.fullName !== this.patientData.full_name) {
      updates.full_name = this.fullName;
    }
    if (this.assignedDoctor !== this.patientData.assigned_doctor_name) {
      updates.assigned_doctor_name = this.assignedDoctor;
    }
    if (this.appointmentTime !== this.patientData.appointment_time) {
      updates.appointment_time = this.appointmentTime;
    }
    if ((this.phone || '') !== (this.patientData.phone || '')) {
      updates.phone = this.phone;
    }

    if (Object.keys(updates).length === 0) {
      // niente da salvare
      await this.toastCtrl
        .create({
          message: 'Non hai modificato nessun dato',
          duration: 2000,
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
              message: '✓ Dati del paziente aggiornati con successo',
              duration: 2000,
              color: 'success',
            })
            .then((t) => t.present());
          this.modalCtrl.dismiss();
        },
        error: async () => {
          await this.toastCtrl
            .create({
              message: '⚠ Impossibile salvare le modifiche. Riprova',
              duration: 2500,
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
    console.log('orario app selezionato: ', this.orarioAppuntamento);

    // Estrai la data corrente dal campo appointmentTime (mantieni la data, cambia solo l'ora)
    const currentDate = new Date(this.appointmentTime);
    const [ore, minuti] = this.orarioAppuntamento.split(':').map(Number);

    // Crea una nuova data mantenendo lo stesso giorno
    const data = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      ore,
      minuti,
      0,
    );

    // formato ISO "locale" (senza spostamento UTC)
    const yyyy = data.getFullYear();
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const dd = String(data.getDate()).padStart(2, '0');
    const hh = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');

    this.appointmentTime = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    console.log('appointment_time aggiornato: ', this.appointmentTime);
  }

  pad(numero: number): string {
    return numero < 10 ? '0' + numero : numero.toString();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
