import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

export interface UserProfile {
  name: string;
  avatarUrl: string;
}

export interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Cache in memoria del profilo utente */
  profile$: Observable<UserProfile>;

  //Ruolo corrente, inizialmente letto da localStorage */
  private _role$ = new BehaviorSubject<string | null>(
    localStorage.getItem('role')
  );
  public role$ = this._role$.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.profile$ = this.http
      .get<UserProfile>(`${environment.apiUrl}/auth/me`)
      .pipe(shareReplay(1));
  }

  /** Effettua il login, salva token e role */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((res) => {
          // Salvo il token
          localStorage.setItem('token', res.token);

          // Decodifico il JWT per estrarre il campo 'role'
          const payload = (jwtDecode as any)(res.token) as {
            role: string;
          };
          const ruolo = payload.role;
          localStorage.setItem('role', ruolo);

          // Aggiorno il BehaviorSubject
          this._role$.next(ruolo);
        })
      );
  }

  /** Getter per sapere se esiste un token in localStorage */
  get isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /** Getter per ottenere sincronamente il ruolo corrente */
  get currentRole(): string | null {
    return this._role$.getValue();
  }

  /** Logout: cancella tutto */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this._role$.next(null);
    this.router.navigate(['/login']);
  }
}
