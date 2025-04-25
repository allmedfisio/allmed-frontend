import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io } from 'socket.io-client';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddPatientModalComponent } from 'src/app/add-patient-modal/add-patient-modal.component';
import { AddDoctorModalComponent } from 'src/app/add-doctor-modal/add-doctor-modal.component';
import { EditPatientModalComponent } from 'src/app/edit-patient-modal/edit-patient-modal.component';

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
  userName: string = 'Nome Utente';
  userImage: string = 'path-to-image.jpg';

  constructor(private http: HttpClient, private router: Router, private modalController: ModalController) {}

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

  async openAddPatientModal() {
    const modal = await this.modalController.create({
      component: AddPatientModalComponent
    });
    return await modal.present();
  }

  async openAddDoctorModal() {
    const modal = await this.modalController.create({
      component: AddDoctorModalComponent
    });
    return await modal.present();
  }

  openUserMenu() {
    // Logica per mostrare un menu a discesa o popup con le opzioni di logout
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  editDoctor (doctor: any) {

  }

  async openEditPatientModal(patient: any) {
    const modal = await this.modalController.create({
      component: EditPatientModalComponent,
      componentProps: {
        patientData: patient
      }
    });
    modal.onDidDismiss().then(() => {
      const tokenP = localStorage.getItem('token');
      //this.loadPatients(tokenP);
    });
    return await modal.present();
  }

  loadPatients(token: any) {
    console.log("In load patients, token: ", token)
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
