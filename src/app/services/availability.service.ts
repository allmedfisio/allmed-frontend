import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DoctorAvailability {
  doctor: string;
  day: string;
  start: string;
  end: string;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private _availabilities$ = new BehaviorSubject<DoctorAvailability[]>([]);
  availabilities$ = this._availabilities$.asObservable();

  addAvailability(av: DoctorAvailability) {
    const list = [...this._availabilities$.value, av];
    this._availabilities$.next(list);
  }
}
