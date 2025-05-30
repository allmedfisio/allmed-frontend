import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface UserProfile {
  name: string;
  avatarUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Cache in memoria del profilo utente */
  profile$: Observable<UserProfile>;

  constructor(private http: HttpClient) {
    this.profile$ = this.http
      .get<UserProfile>(`${environment.apiUrl}/auth/me`)
      .pipe(shareReplay(1));
  }
}
