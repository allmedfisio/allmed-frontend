import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-add-patient-modal',
  templateUrl: './add-patient-modal.component.html',
  styleUrls: ['./add-patient-modal.component.scss'],
  standalone: false
})
export class AddPatientModalComponent  implements OnInit {
  fullName: string = '';
  assignedStudy: number | null = null;

  constructor(private http: HttpClient, private router: Router, private modalController: ModalController) { }

  ngOnInit() {}

  dismiss() {
    this.modalController.dismiss();
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
    // Aggiungi il paziente nel backend o nel sistema
    console.log('Paziente Aggiunto:', this.fullName, " nello studio: ", this.assignedStudy);
    this.dismiss();
  }

}
