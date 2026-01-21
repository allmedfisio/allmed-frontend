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
import { highlight } from 'src/app/animations';

interface Row {
  study: number | string;
  id: string;
  doctorName: string;
  patientNumber: number | '-';
  nextPatientNumber: number | '-';
}

@Component({
  selector: 'app-sala-attesa',
  templateUrl: './sala-attesa.page.html',
  styleUrls: ['./sala-attesa.page.scss'],
  standalone: false,
  animations: [highlight],
})
export class SalaAttesaPage implements OnInit, OnDestroy {
  unlocked = false;
  rows$ = combineLatest([
    this.doctorService.doctors$,
    this.patientService.patients$,
  ]).pipe(
    map(([doctors, patients]) =>
      doctors
        .sort((a, b) => {
          const aIsNum = typeof a.study === 'number';
          const bIsNum = typeof b.study === 'number';

          if (aIsNum && bIsNum) {
            // entrambi numeri
            return (a.study as number) - (b.study as number);
          } else if (aIsNum) {
            // solo a è numero → prima a
            return -1;
          } else if (bIsNum) {
            // solo b è numero → prima b
            return 1;
          } else {
            // entrambi stringhe → ordine alfabetico
            return String(a.study).localeCompare(String(b.study));
          }
        })
        //.sort((a, b) => a.study - b.study)  ordino i medici per studio
        .map<Row>((doc) => {
          // Paziente "in visita" per questo medico
          const curr = patients.find(
            (p) => p.assigned_doctor === doc.id && p.status === 'in_visita'
          );

          // lista di attesa per questo medico
          const waiting = patients
            .filter(
              (p) => p.assigned_doctor === doc.id && p.status === 'in_attesa'
            )
            // ordino per appointment_time
            .sort((a, b) =>
              a.appointment_time.localeCompare(b.appointment_time)
            );

          const next = waiting[0]; // primo in coda o undefined

          return {
            study: doc.study,
            id: doc.id,
            doctorName: doc.name,
            patientNumber: curr?.assigned_number ?? '-',
            nextPatientNumber: next?.assigned_number ?? '-',
          };
        })
    ),
    shareReplay(1)
  );

  // per evidenziare la riga che cambia
  highlightedStudy: number | string | null = null;
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
      combineLatest([
        this.patientService.patients$,
        this.doctorService.doctors$
      ])
        .pipe(
          // riduco al solo array di {doctorId, id}, con studio recuperato dal medico
          map(([patients, doctors]) =>
            patients
              .filter((p) => p.status === 'in_visita' && p.assigned_doctor)
              .map((p) => {
                const doctor = doctors.find((d) => d.id === p.assigned_doctor);
                return { doctorId: p.assigned_doctor, study: doctor?.study, id: p.id };
              })
              .filter((p) => p.study !== undefined) // rimuovi pazienti senza medico valido
              .sort((a, b) => {
                const aIsNum = typeof a.study === 'number';
                const bIsNum = typeof b.study === 'number';

                if (aIsNum && bIsNum) {
                  // entrambi numeri
                  return (a.study as number) - (b.study as number);
                } else if (aIsNum) {
                  // solo a è numero → prima a
                  return -1;
                } else if (bIsNum) {
                  // solo b è numero → prima b
                  return 1;
                } else {
                  // entrambi stringhe → ordine alfabetico
                  return String(a.study).localeCompare(String(b.study));
                }
              })
          ),
          // emetto solo quando l'array cambia davvero
          distinctUntilChanged(
            (prev, curr) =>
              prev.length === curr.length &&
              prev.every(
                (x, i) => x.doctorId === curr[i].doctorId && x.id === curr[i].id
              )
          ),
          // voglio i valori a coppie [vecchio, nuovo]
          pairwise()
        )
        .subscribe(([prev, curr]) => {
          // notifico solo i nuovi entrati in visita
          curr.forEach((p) => {
            if (!prev.find((x) => x.id === p.id)) {
              this.triggerNotification(p.study!);
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

  private triggerNotification(study: number | string) {
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

  // Helpers

  trackByStudy(_: number, item: Row) {
    console.log('item study: ' + item.study);
    return item.study;
  }

  trackByRow(_: number, item: Row): string {
    return item.id; // ora un key univoco per riga
  }

  isNumber(value: any): boolean {
    // Per fare in modo di mostrare Studio se numero o solo la stringa se stringa
    // prova a convertirlo in numero e verifica che non sia NaN
    return !isNaN(Number(value));
  }
}
