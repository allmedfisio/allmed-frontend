import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-patient-modal',
  templateUrl: './edit-patient-modal.component.html',
  styleUrls: ['./edit-patient-modal.component.scss'],
  standalone: false
})
export class EditPatientModalComponent  implements OnInit {
  @Input() patientData: any;
  form!: FormGroup;

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private modalController: ModalController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      fullName: [this.patientData?.full_name || '', Validators.required],
      assignedStudy: [this.patientData?.assigned_study || '', Validators.required]
    });
   console.log(this.patientData)
  }

  dismiss() {
    this.modalController.dismiss();
  }

  editPatient () {
    if (this.form.invalid) return;
    const updatedData = {
      ...this.form.value
    };
    console.log("updatedData: " ,updatedData)
    const tokenP = localStorage.getItem('token');
    if (!tokenP) {
      this.router.navigate(['/login']);
    }
    this.http.put(`https://allmed-backend.onrender.com/patients/${this.patientData.id}`, {
    //this.http.put(`http://localhost:5000/patients/${this.patientData.id}`, {
      full_name: updatedData.fullName,
      assigned_study: updatedData.assignedStudy
    }, {
      headers: {
        "Authorization": `Bearer ${tokenP}`
      }
    }).subscribe({
      next: () => {
      this.presentToast('Paziente aggiornato con successo!', 'success');
      this.dismiss();
    },
    error: (err) => {
      console.error('Errore durante la modifica del paziente:', err);
      this.presentToast('Errore durante la modifica del paziente', 'danger');
    }
    });
  }

    async presentToast(message: string, color: 'success' | 'danger') {
      const toast = await this.toastCtrl.create({
        message,
        duration: 2000,
        color,
        position: 'bottom'
      });
      await toast.present();
    }
  }
