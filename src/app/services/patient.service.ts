import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

export interface Patient {
  id: string;
  full_name: string;
  assigned_number: number;
  assigned_study: number | string;
  status: 'prenotato' | 'in_attesa' | 'in_visita' | 'completato';
  appointment_time: string;
}

type PatientDelta = Partial<Patient> & { id: string };

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private _patients$ = new BehaviorSubject<Patient[]>([]);
  public socket: Socket;

  constructor(private http: HttpClient) {
    // inizializza la connessione WebSocket
    this.socket = io(`${environment.apiUrl}`, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      console.log('PatientService socket id:', this.socket.id);
      // entra subito in segreteria
      this.socket.emit('joinSegreteria');
      console.log('PatientService ▶︎ emitted joinSegreteria');
    });

    // 1️⃣ Ascolta i dati pushati dal server
    this.socket.on('patientsSnapshot', (data) => {
      console.log('Service ricevuto patientsSnapshot:', data);
      this._patients$.next(data);
    });

    this.socket.on('patientChanged', (payload: PatientDelta) => {
      const currentList = this._patients$.value;
      const idx = currentList.findIndex((p) => p.id === payload.id);

      if (idx > -1) {
        // ① Se è già presente, ne aggiorni solo i campi modificati
        const updated = { ...currentList[idx], ...payload };
        currentList[idx] = updated;
        console.log('currentList: ' + currentList);
      } else {
        // ② Altrimenti è un nuovo paziente: lo aggiungi in coda
        currentList.push(payload as Patient);
      }

      // ③ Emetti la nuova lista
      this._patients$.next([...currentList]);
    });

    this.socket.on('patientRemoved', ({ id }) => {
      const list = this._patients$.value.filter((p) => p.id !== id);
      this._patients$.next(list);
    });

    this.socket.on('connect_error', (err) => {
      console.error('PatientService ▶︎ connect_error', err);
    });
  }

  /** Lista raw di tutti i pazienti (push-only, cache 1 valore) */
  get patients$() {
    return this._patients$.asObservable().pipe(shareReplay(1));
  }

  /*
Aggiunge un nuovo paziente
@returns Observable<Patient> del paziente creato (id + dati)
*/
  addPatient(
    full_name: string,
    assigned_study: number | string,
    appointment_time: string
  ): Observable<Patient> {
    return this.http.post<Patient>(`${environment.apiUrl}/patients`, {
      full_name,
      assigned_study,
      appointment_time,
    });
  }

  // Aggiunge pazienti in bulk da excel
  bulkCreate(patients: any[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/patients/bulk`, patients);
  }

  // Segna i pazienti prenotati come in-attesa
  markArrived(patientId: string): Observable<{ id: string; status: string }> {
    return this.http.put<{ id: string; status: string }>(
      `${environment.apiUrl}/patients/${patientId}/arrive`,
      {}
    );
  }

  /**
Segnala al backend che il paziente è stato chiamato / è in visita
@returns Observable<{id: string; status: string}>
*/
  callPatient(patientId: string): Observable<{ id: string; status: string }> {
    return this.http.put<{ id: string; status: string }>(
      `${environment.apiUrl}/patients/${patientId}/call`,
      {}
    );
  }

  /**
Aggiorna uno o più campi di un paziente
@param patientId 
@param data 
*/
  updatePatient(patientId: string, data: Partial<Patient>): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/patients/${patientId}`,
      data
    );
  }

  /**
Rimuove un paziente
*/
  removePatient(patientId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/patients/${patientId}`
    );
  }

  // Rimuove tutti i pazienti -> non utilizzata per adesso
  deleteAllPatients(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/patients`);
  }

  //Ritorna un Observable di { current, next } per uno studio

  getByStudy$(studyId: number) {
    const token = localStorage.getItem('token')!;
    return this.http.get<{ current: Patient | null; next: Patient | null }>(
      `${environment.apiUrl}/patients/study/${studyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }
}
