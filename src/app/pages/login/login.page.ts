import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http.post<{ token: string }>('http://localhost:5000/auth/login', { username: this.username, password: this.password })
      .subscribe({
        next: (response) => {
          localStorage.setItem('token', response.token);
          this.router.navigate(['/segreteria']);
        },
        error: (response) => {
          this.errorMessage = response.error.error;
        }
      });
  }
}
