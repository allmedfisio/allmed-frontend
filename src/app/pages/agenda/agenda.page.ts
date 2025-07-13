import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { PatientService, Patient } from '../../services/patient.service';
import { DoctorService, Doctor } from '../../services/doctor.service';
import { AvailabilityService, DoctorAvailability } from '../../services/availability.service';
import { Observable, combineLatest, map } from 'rxjs';
import { EditPatientModalComponent } from '../../edit-patient-modal/edit-patient-modal.component';
import { MenuController } from '@ionic/angular';

interface CalendarEvent {
  patient: Patient;
  doctor?: Doctor;
  color: string;
}

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
  standalone: false,
})
export class AgendaPage implements OnInit {
  weekDays: Date[] = [];
  eventsByDay: Record<string, CalendarEvent[]> = {};
  colorMap = new Map<string, string>();

  constructor(
    private patientService: PatientService,
    private doctorService: DoctorService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private availabilityService: AvailabilityService,
    private menuCtrl: MenuController
  ) {}

  ngOnInit() {
    this.initWeek();
    combineLatest([this.patientService.patients$, this.doctorService.doctors$])
      .pipe(
        map(([patients, doctors]) => {
          const colors = [
            '#5e92f3',
            '#f48fb1',
            '#aed581',
            '#ffb74d',
            '#4dd0e1',
            '#ba68c8',
          ];
          this.colorMap.clear();
          doctors.forEach((d, i) => this.colorMap.set(d.id, colors[i % colors.length]));
          const mapEvents: Record<string, CalendarEvent[]> = {};
          patients.forEach((p) => {
            const date = p.appointment_time.split('T')[0];
            const doctor = doctors.find((d) => d.study === p.assigned_study);
            const color = doctor ? this.colorMap.get(doctor.id)! : '#ccc';
            const ev: CalendarEvent = { patient: p, doctor, color };
            if (!mapEvents[date]) mapEvents[date] = [];
            mapEvents[date].push(ev);
          });
          return mapEvents;
        })
      )
      .subscribe((mapEvents) => {
        this.eventsByDay = mapEvents;
      });
  }

  initWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(now.setDate(diff));
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  async openEdit(patient: Patient) {
    const modal = await this.modalCtrl.create({
      component: EditPatientModalComponent,
      cssClass: 'custom-modal',
      componentProps: { patientData: patient },
    });
    await modal.present();
  }

  async addAvailability() {
    const alert = await this.alertCtrl.create({
      header: 'Aggiungi disponibilità',
      inputs: [
        { name: 'doctor', type: 'text', placeholder: 'Medico' },
        { name: 'day', type: 'text', placeholder: 'Giorno' },
        { name: 'start', type: 'time', placeholder: 'Inizio' },
        { name: 'end', type: 'time', placeholder: 'Fine' },
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Salva',
          handler: (data) => {
            if (data.doctor && data.day && data.start && data.end) {
              this.availabilityService.addAvailability({
                doctor: data.doctor,
                day: data.day,
                start: data.start,
                end: data.end,
              });
            }
          },
        },
      ],
    });
    await alert.present();
  }

  openAppMenu() {
    this.menuCtrl.open('segreteria-menu');
  }
}
