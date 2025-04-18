import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io } from 'socket.io-client';
import { Router } from '@angular/router';
import { Token } from '@angular/compiler';

@Component({
  selector: 'app-segreteria',
  templateUrl: './segreteria.page.html',
  styleUrls: ['./segreteria.page.scss'],
  standalone: false,
})
export class SegreteriaPage implements OnInit {
  patients: any[] = [];
  doctors: any[] = [];
  fullName: string = '';
  assignedStudy: number | null = null;
  doctorName: string = '';
  doctorStudy: number = NaN;
  socket: any;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
    }
    
    this.socket = io('https://allmed-backend.onrender.com');  // Assicurati che l'URL sia corretto
    this.loadPatients(token);
    this.loadDoctors(token);
    this.socket.on('patientsUpdated', () => {
      this.loadPatients(token);
    });
    this.socket.on('doctorsUpdated', () => {
      this.loadDoctors(token);
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  loadPatients(token: any) {
    this.http.get<any[]>('https://allmed-backend.onrender.com/patients/waiting', {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }).subscribe(data => {
      this.patients = data;
    });
  }

  loadDoctors(token: any) {
    this.http.get<any[]>('https://allmed-backend.onrender.com/doctors/active-doctors', {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }).subscribe(data => {
      this.doctors = data;
    });
  }

  addPatient() {
    if (!this.fullName || !this.assignedStudy) return;
    const tokenP = localStorage.getItem('token');
    if (!tokenP) {
      this.router.navigate(['/login']);
    }

    this.http.post('https://allmed-backend.onrender.com/patients', {
      full_name: this.fullName,
      assigned_study: this.assignedStudy
    }, {
      headers: {
        "Authorization": `Bearer ${tokenP}`
      }
    }).subscribe(() => {
      this.fullName = '';
      this.assignedStudy = null;
    });
  }

  removePatient(patientId: number) {
    const tokenP = localStorage.getItem('token');
    if (!tokenP) {
      this.router.navigate(['/login']);
    }
    this.http.delete(`https://allmed-backend.onrender.com/patients/${patientId}`, {
      headers: {
        "Authorization": `Bearer ${tokenP}`
      }
    }).subscribe(() => {
      this.loadPatients(tokenP);
    });
  }

  addDoctor() {
    if (!this.doctorName || !this.doctorStudy) return;
    const tokenP = localStorage.getItem('token');
    if (!tokenP) {
      this.router.navigate(['/login']);
    }
    this.http.post('https://allmed-backend.onrender.com/doctors', {
      name: this.doctorName,
      study: this.doctorStudy
    }, {
      headers: {
        "Authorization": `Bearer ${tokenP}`
      }
    }).subscribe(() => {
      this.doctorName = '';
      this.doctorStudy = NaN;
    });
  }

  removeDoctor(doctorId: number) {
    const tokenP = localStorage.getItem('token');
    if (!tokenP) {
      this.router.navigate(['/login']);
    }
    this.http.delete(`https://allmed-backend.onrender.com/doctors/${doctorId}`, {
      headers: {
        "Authorization": `Bearer ${tokenP}`
      }
    }).subscribe(() => {
      this.loadDoctors(tokenP);
    });
  }

}
