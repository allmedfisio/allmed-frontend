import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Doctor {
  id: string;
  name: string;
  study: number | string;
  last_patient?: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private _doctors$ = new BehaviorSubject<Doctor[]>([]);
  public doctors$ = this._doctors$.asObservable();
  private socket: Socket;

  constructor(private http: HttpClient) {
    /* 1️⃣ Connessione WebSocket ---------------------------------------- */
    this.socket = io(environment.apiUrl, { transports: ['websocket'] });

    /* 2️⃣ (facoltativo) entri nella stanza "segreteria" come fa PatientService */
    this.socket.on('connect', () => {
      this.socket.emit('joinSegreteria');
    });

    /* 3️⃣ Ogni push dal backend → ricarichi la lista medici */
    this.socket.on('doctorsUpdated', () => {
      console.log('DoctorService ▶︎ doctorsUpdated');
      this.loadDoctors();
    });

    /* 4️⃣ prima fetch iniziale */
    this.loadDoctors();
  }

  /** Ricarica la lista di medici da backend e la spinge nel BehaviorSubject */
  private loadDoctors(): void {
    this.http
      .get<Doctor[]>(`${environment.apiUrl}/doctors/active-doctors`)
      .subscribe((list) => {
        console.log('DoctorService.loadDoctors() → ', list);
        this._doctors$.next(list);
      });
  }

  /** Ottiene tutti i medici (inclusi quelli non attivi) dalla master list */
  getAllDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${environment.apiUrl}/doctors/all-doctors`);
  }

  /** Ottiene la lista di tutti i nomi dei medici disponibili dalla collection doctor-list */
  getDoctorList(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/doctors/doctor-list`);
  }

  /** Aggiunge un nuovo nome alla lista dei medici disponibili */
  addDoctorName(name: string): Observable<{ message: string; name: string }> {
    return this.http.post<{ message: string; name: string }>(
      `${environment.apiUrl}/doctors/doctor-list`,
      { name },
    );
  }

  //Aggiunge un nuovo medico
  addDoctor(name: string, study: number | string): Observable<Doctor> {
    return this.http
      .post<Doctor>(`${environment.apiUrl}/doctors`, {
        name,
        study,
      })
      .pipe(tap(() => this.loadDoctors()));
  }

  //Rimuove un medico
  removeDoctor(doctorId: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/doctors/${doctorId}`)
      .pipe(tap(() => this.loadDoctors()));
  }

  //Aggiorna l'ultimo paziente chiamato per un medico
  updateLastPatient(doctorId: string, lastPatient: string): Observable<void> {
    return this.http
      .put<void>(`${environment.apiUrl}/doctors/${doctorId}/call`, {
        last_patient: lastPatient,
      })
      .pipe(
        tap(() => {
          this.loadDoctors();
        }),
      );
  }
}
