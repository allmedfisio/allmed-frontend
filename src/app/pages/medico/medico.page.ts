import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-medico',
  templateUrl: './medico.page.html',
  styleUrls: ['./medico.page.scss'],
  standalone: false,
})
export class MedicoPage implements OnInit {
  patients: any[] = [];
  doctorStudy: number | null = null; // Studio del medico
  socket: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.socket = io('http://localhost:5000'); // Assicurati che l'URL sia corretto
    this.loadPatients();

    this.socket.on('patientsUpdated', () => {
      this.loadPatients();
    });
  }

  loadPatients() {
    if (!this.doctorStudy) return;
    this.http.get<any[]>(`http://localhost:5000/patients/study/${this.doctorStudy}`).subscribe(data => {
      this.patients = data;
    });
  }

  callPatient(patientId: number) {
    this.http.put(`http://localhost:5000/patients/${patientId}/call`, {}).subscribe(() => {
      console.log("Paziente chiamato!");
    });
  }
}
