import { Component, OnInit, OnDestroy } from '@angular/core';
import { PatientService } from 'src/app/services/patient.service';
import { DoctorService } from 'src/app/services/doctor.service';
import { combineLatest, Subscription } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  pairwise,
  shareReplay,
} from 'rxjs/operators';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';

interface Row {
  study: number;
  doctorName: string;
  patientNumber: number | '-';
  nextPatientNumber: number | '-';
}

@Component({
  selector: 'app-sala-attesa',
  templateUrl: './sala-attesa.page.html',
  styleUrls: ['./sala-attesa.page.scss'],
  standalone: false,
  animations: [
    trigger('highlight', [
      state('off', style({ backgroundColor: 'transparent' })),
      state('on', style({ backgroundColor: 'rgba(255,255,0,0.5)' })),
      transition('off => on', animate('400ms ease-in')),
      transition('on => off', animate('400ms ease-out')),
    ]),
  ],
})
export class SalaAttesaPage implements OnInit, OnDestroy {
  unlocked = false;
  rows$ = combineLatest([
    this.doctorService.doctors$,
    this.patientService.patients$,
  ]).pipe(
    map(([doctors, patients]) =>
      doctors
        .sort((a, b) => a.study - b.study) // ordino i medici per studio
        .map<Row>((doc) => {
          // Paziente "in visita" per questo studio
          const curr = patients.find(
            (p) => p.assigned_study === doc.study && p.status === 'in_visita'
          );

          // lista di attesa per questo studio
          const waiting = patients
            .filter(
              (p) => p.assigned_study === doc.study && p.status === 'in_attesa'
            )
            // ordino per appointment_time
            .sort((a, b) =>
              a.appointment_time.localeCompare(b.appointment_time)
            );

          const next = waiting[0]; // primo in coda o undefined
          return {
            study: doc.study,
            doctorName: doc.name,
            patientNumber: curr?.assigned_number ?? '-',
            nextPatientNumber: next?.assigned_number ?? '-',
          };
        })
    ),
    shareReplay(1)
  );

  // per evidenziare la riga che cambia
  highlightedStudy: number | null = null;
  private sub = new Subscription();
  // Audio di notifica, istanziato e caricato una sola volta
  private notifyAudio = new Audio('assets/notify.mp3');

  constructor(
    private patientService: PatientService,
    private doctorService: DoctorService
  ) {}

  ngOnInit() {
    // Preload: avvia il caricamento del file audio
    this.notifyAudio.load();

    // ogni volta che cambia lo snapshot dei pazienti...
    this.sub.add(
      this.patientService.patients$
        .pipe(
          // riduco al solo array di {study, id}, ordinato per studio
          map((list) =>
            list
              .filter((p) => p.status === 'in_visita')
              .map((p) => ({ study: p.assigned_study, id: p.id }))
              .sort((a, b) => a.study - b.study)
          ),
          // emetto solo quando l’array cambia davvero
          distinctUntilChanged(
            (prev, curr) =>
              prev.length === curr.length &&
              prev.every(
                (x, i) => x.study === curr[i].study && x.id === curr[i].id
              )
          ),
          // voglio i valori a coppie [vecchio, nuovo]
          pairwise()
        )
        .subscribe(([prev, curr]) => {
          // notifico solo i nuovi entrati in visita
          curr.forEach((p) => {
            if (!prev.find((x) => x.id === p.id)) {
              this.triggerNotification(p.study);
            }
          });
        })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  unlockAudio() {
    this.notifyAudio
      .play()
      .then(() => {
        this.notifyAudio.pause();
        this.unlocked = true;
      })
      .catch((err) => console.warn('unlock failed', err));
  }

  private triggerNotification(study: number) {
    // evidenzio la riga
    this.highlightedStudy = study;
    setTimeout(() => (this.highlightedStudy = null), 1000);

    // reset del playback e riproduzione
    if (this.unlocked) {
      this.notifyAudio.currentTime = 0;
      this.notifyAudio.play().catch((err) => {
        // logga l’errore ma non blocca l’app
        console.warn('Impossibile riprodurre audio:', err);
      });
    }
  }

  trackByStudy(_: number, item: Row) {
    return item.study;
  }
}
