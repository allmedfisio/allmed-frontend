import { Injectable } from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { BehaviorSubject, Observable }   from 'rxjs';
import { tap }  from 'rxjs/operators';
import { environment }  from 'src/environments/environment';

export interface Doctor {
  id: string;
  name: string;
  study: number;
  last_patient?: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private _doctors$ = new BehaviorSubject<Doctor[]>([]);
  public doctors$ = this._doctors$.asObservable();

  constructor(private http: HttpClient) {
    this.http.get<Doctor[]>(`${environment.apiUrl}/doctors/active-doctors`)
      .subscribe(list => this._doctors$.next(list));
  }

   //Aggiunge un nuovo medico
   addDoctor(name: string, study: number): Observable<Doctor> {
    return this.http.post<Doctor>(
      `${environment.apiUrl}/doctors`,
      { name, study }
    );
  }

  //Rimuove un medico
  removeDoctor(doctorId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/doctors/${doctorId}`
    );
  }

  //Aggiorna l'ultimo paziente chiamato per un medico
  updateLastPatient(doctorId: string, lastPatient: string): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/doctors/${doctorId}/call`,
      { last_patient: lastPatient }
    ).pipe(
      tap(() => {
        const list = this._doctors$.value.map(doc =>
          doc.id === doctorId ? { ...doc, last_patient: lastPatient } : doc
        );
        this._doctors$.next(list);
      })
    );
  }
}

