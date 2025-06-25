import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  doLogin(): void {
    // Chiamo AuthService.login() che salva token+role in localStorage
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        // Se il login ha avuto successo, posso reindirizzare dove voglio.
        // In genere, in base al ruolo, scelgo la homepage per quel ruolo.
        const ruolo = this.authService.currentRole;
        if (ruolo === 'segreteria' || ruolo === 'admin') {
          this.router.navigate(['/segreteria']);
        } else if (ruolo === 'medico') {
          this.router.navigate(['/medico']);
        } else if (ruolo === 'sala-attesa') {
          this.router.navigate(['/sala-attesa']);
        } else {
          // fallback
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Errore di login';
      },
    });
  }
}
