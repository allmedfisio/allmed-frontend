import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PatientService } from '../services/patient.service';
import { DoctorService, Doctor } from '../services/doctor.service';
import { firstValueFrom } from 'rxjs';
import { DateFilterModalComponent } from '../date-filter-modal/date-filter-modal.component';

@Component({
  selector: 'app-add-patient-modal',
  templateUrl: './add-patient-modal.component.html',
  styleUrls: ['./add-patient-modal.component.scss'],
  standalone: false,
})
export class AddPatientModalComponent implements OnInit {
  fullName: string = '';
  phone: string = '';
  assignedDoctor!: string;
  appointmentTime!: string;
  patientStatus: 'in_attesa' | 'prenotato' = 'in_attesa';
  orariDisponibili: string[] = [];
  doctors: Doctor[] = [];
  activeDoctorsSet = new Set<string>(); // nomi dei medici attivi

  constructor(
    private patientService: PatientService,
    private doctorService: DoctorService,
    private modalController: ModalController,
  ) {}

  ngOnInit() {
    this.generaOrariDisponibili();
    // Carica TUTTI i medici (non solo quelli attivi)
    this.doctorService.getAllDoctors().subscribe((doctors) => {
      this.doctors = doctors;
    });
    // Aggiorna anche quando cambiano (in caso di nuovi medici aggiunti)
    // e registra i medici attivi
    this.doctorService.doctors$.subscribe((doctors) => {
      // Unisci con quelli già caricati per evitare duplicati
      const existingIds = new Set(this.doctors.map((d) => d.id));
      const newDoctors = doctors.filter((d) => !existingIds.has(d.id));
      this.doctors = [...this.doctors, ...newDoctors];
      // Traccia quali medici sono attivi (per validazione in_attesa)
      this.activeDoctorsSet.clear();
      doctors.forEach((d) => this.activeDoctorsSet.add(d.name));
    });
  }

  // Ritorna TUTTI i medici disponibili nel sistema ordinati per cognome
  get availableDoctors(): Doctor[] {
    // Mostra sempre TUTTI i medici nel dropdown
    // La validazione dello status viene fatta nel bottone via isValidDoctorSelection()
    return [...this.doctors].sort((a, b) => {
      const surnameA = this.extractSurname(a.name);
      const surnameB = this.extractSurname(b.name);
      return surnameA.localeCompare(surnameB);
    });
  }

  // Estrae il cognome ignorando i prefissi (Dott., Dott.ssa, D.O.)
  private extractSurname(fullName: string): string {
    // Rimuove prefissi comuni
    let cleaned = fullName.replace(/^(Dott\.ssa|Dott\.|D\.O\.)\s*/i, '').trim();
    // Il cognome è la prima parola dopo aver rimosso i prefissi
    const parts = cleaned.split(/\s+/);
    return parts[0] || fullName;
  }

  // Valida se il medico selezionato è valido per lo status corrente
  isValidDoctorSelection(): boolean {
    if (!this.assignedDoctor) return false;
    if (this.patientStatus === 'prenotato') {
      // Prenotato: il medico deve esistere nella lista completa
      return this.doctors.some((d) => d.name === this.assignedDoctor);
    } else {
      // In attesa: il medico deve essere attivo
      return this.activeDoctorsSet.has(this.assignedDoctor);
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async openDateTimePicker() {
    const initial = this.appointmentTime
      ? // se esiste già un valore completo (es. "2025-07-02T14:45:00"), lo riuso
        this.appointmentTime
      : // altrimenti uso adesso come default completo
        this.toLocalISO(new Date());
    const modal = await this.modalController.create({
      component: DateFilterModalComponent,
      componentProps: {
        initialDate: initial,
        showTime: true, // ← data + ora
      },
      cssClass: 'custom-modal',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ date?: string }>();
    if (data?.date !== undefined) {
      this.appointmentTime = data.date; // ISO full date-time
    }
  }

  async addPatient() {
    if (
      !this.fullName ||
      !this.assignedDoctor ||
      !this.appointmentTime ||
      !this.patientStatus
    )
      return;
    this.patientService
      .addPatient(
        this.fullName,
        this.assignedDoctor,
        this.appointmentTime,
        this.patientStatus,
        this.phone,
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

  /** Restituisce una stringa "YYYY-MM-DDTHH:mm:ss" con orario locale */
  toLocalISO(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-') +
      'T' +
      [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':')
    );
  }
  /*
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
*/
  pad(numero: number): string {
    return numero < 10 ? '0' + numero : numero.toString();
  }
}
