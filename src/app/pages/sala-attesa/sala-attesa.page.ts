import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-sala-attesa',
  templateUrl: './sala-attesa.page.html',
  styleUrls: ['./sala-attesa.page.scss'],
  standalone: false,
})
export class SalaAttesaPage implements OnInit {
  doctors: any[] = [];
  calledPatients: Set<number> = new Set();
  socket: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.socket = io('http://localhost:5000'); // Assicurati che l'URL sia corretto
    this.loadDoctors();

    this.socket.on('patientsUpdated', (data:any) => {
      this.detectNewCalls(data);
      this.doctors = data;
      //this.loadDoctors();
    });
  }

  loadDoctors() {
    this.http.get<any[]>('http://localhost:5000/doctors/active-doctors').subscribe(data => {
      this.detectNewCalls(data);
      this.doctors = data;
    });
  }

  detectNewCalls(newDoctors: any[]) {
    newDoctors.forEach(doctor => {
      if (doctor.current_patient && !this.calledPatients.has(doctor.current_patient)) {
        this.calledPatients.add(doctor.current_patient);
        this.triggerAnimation(doctor.current_patient);
      }
    });
  }

  triggerAnimation(patientNumber: number) {
    const element = document.getElementById(`patient-${patientNumber}`);
    if (element) {
      element.classList.add('flash-animation');
      setTimeout(() => element.classList.remove('flash-animation'), 4000);
    }
  }
}
