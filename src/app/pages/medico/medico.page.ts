import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Patient, PatientService } from '../../services/patient.service';
import { firstValueFrom, Subscription, Observable } from 'rxjs';
import { DoctorService } from 'src/app/services/doctor.service';
import { AuthService, UserProfile } from 'src/app/services/auth.service';

@Component({
  selector: 'app-medico',
  templateUrl: './medico.page.html',
  styleUrls: ['./medico.page.scss'],
  standalone: false,
})
export class MedicoPage implements OnInit, OnDestroy {
  /** Paziente attualmente in visita */
  currentPatient: Patient | null = null;
  /** Prossimo paziente in attesa */
  nextPatient: Patient | null = null;
  myStudyId!: number;
  private sub?: Subscription;
  userProfile$!: Observable<UserProfile>;

  constructor(
    private route: ActivatedRoute,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private alertCtrl: AlertController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Sottoscrivi (via async pipe) al profilo
    this.userProfile$ = this.authService.profile$;
    //Recupera lo studio dalla route: /medico/:id
    this.myStudyId = Number(this.route.snapshot.paramMap.get('id'));

    const stored = localStorage.getItem('myStudyId');
    if (stored) {
      // già impostato: avvia direttamente
      this.initForStudy(+stored);
    } else {
      // primo avvio: chiedi allo user di selezionare
      this.selectStudy();
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private initForStudy(study: number) {
    this.myStudyId = study;

    // Join alla stanza corretta
    this.patientService.socket.emit('joinStudio', String(this.myStudyId));

    // Sottoscrizione per filtrare current/next per questo studio
    this.sub = this.patientService.patients$.subscribe((list) => {
      const studyList = list.filter((p) => p.assigned_study === this.myStudyId);
      this.currentPatient =
        studyList.find((p) => p.status === 'in_visita') || null;
      const waiting = studyList
        .filter((p) => p.status === 'in_attesa')
        .sort((a, b) =>
          (a.appointment_time ?? '').localeCompare(b.appointment_time ?? '')
        );
      this.nextPatient = waiting.length ? waiting[0] : null;
    });
  }

  async selectStudy() {
    const inputs = Array.from({ length: 6 }, (_, i) => ({
      name: `${i + 1}`,
      type: 'radio' as const,
      label: `Studio ${i + 1}`,
      value: `${i + 1}`,
    }));

    const alert = await this.alertCtrl.create({
      header: 'Seleziona lo studio',
      inputs,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'OK',
          handler: (val: string) => {
            localStorage.setItem('myStudyId', val);
            this.initForStudy(+val);
          },
        },
      ],
    });
    await alert.present();
  }

  // ✅ versione a prova di race-condition
  async callNext() {
    if (!this.nextPatient) return;

    // 1️⃣ Congela il paziente da chiamare prima di qualunque side-effect
    const patientToCall = this.nextPatient;

    try {
      // 2️⃣ Cambia lo stato del paziente (attesa ➜ in_visita)
      await firstValueFrom(this.patientService.callPatient(patientToCall.id));

      // 3️⃣ Recupera il record del medico relativo a questo studio
      const doctors = await firstValueFrom(this.doctorService.doctors$);
      const myDoctor = doctors.find((d) => d.study === this.myStudyId);
      if (myDoctor) {
        // 4️⃣ Aggiorna last_patient con il nome “congelato”
        await firstValueFrom(
          this.doctorService.updateLastPatient(
            myDoctor.id,
            patientToCall.full_name
          )
        );
      }
      /* 5️⃣ Il subscribe alla lista pazienti continuerà ad aggiornare
          currentPatient e nextPatient senza ulteriori race-condition */
    } catch (err) {
      console.error('Errore in callNext:', err);
    }
  }

  logout() {
    this.authService.logout();
  }

  /** Chiama il prossimo paziente in attesa
  callNext() {
    if (!this.nextPatient) return;

    // Chiama il paziente
    this.patientService
      .callPatient(this.nextPatient.id)
      .pipe(take(1))
      .subscribe({
        next: async () => {
          // Aggiorno il doctor cercandolo per studio
          const doctors = await firstValueFrom(this.doctorService.doctors$);
          const doc = doctors.find((d) => d.study === this.myStudyId);
          if (doc) {
            // 3️⃣ Aggiorna last_patient
            await firstValueFrom(
              this.doctorService.updateLastPatient(
                doc.id,
                this.currentPatient!.full_name
              )
            );
          }
          // verrà aggiornato via socket e il subscribe sopra ricalcolerà current/next
        },
        error: (err) => console.error('Errore in callPatient:', err),
      });
  } */
}
