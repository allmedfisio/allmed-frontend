import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DoctorService } from '../services/doctor.service';

@Component({
  selector: 'app-add-doctor-modal',
  templateUrl: './add-doctor-modal.component.html',
  styleUrls: ['./add-doctor-modal.component.scss'],
  standalone: false,
})
export class AddDoctorModalComponent implements OnInit {
  selectedDoctor!: string;
  assignedStudy!: number | string;
  // Se vuoi includere “Palestra” o altri
  studies: Array<number | string> = [1, 2, 3, 4, 5, 6, 'Palestra'];
  doctors: string[] = [
    'Dott. Benedetto Simone',
    'Dott.ssa Boccone Isabella',
    'Dott.ssa Boglione Arianna',
    'Dott.ssa Cagliero Daniela',
    'Dott. Canfora Amedeo',
    'Dott. Chiacchio Ferdinando',
    'Dott.ssa Delfino Caludia',
    'Dott. Giachino Corrado',
    'Dott.ssa Giraudo Isabel',
    'Dott. Martorana Stefano',
    'Dott.ssa Panero Marta',
    'Dott.ssa Paoletti Chiara',
    'Dott.ssa Perlo Cristina',
    'Dott. Piazza Giovanni',
    'Dott.ssa Pittatore Giulia',
    'D.O. Riorda Guglielmo',
    'Dott. Riorda Luca',
    'Dott. Zerbino Ezio',
    'Dott.ssa Zorzan Alessandra',
    'Dott. Zuccaro Paolo',
  ];

  constructor(
    private doctorService: DoctorService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  addDoctor() {
    if (!this.selectedDoctor || !this.assignedStudy) return;
    this.doctorService
      .addDoctor(this.selectedDoctor, this.assignedStudy)
      .subscribe({
        next: (newDoctor) => {
          this.modalCtrl.dismiss({ doctor: newDoctor });
        },
        error: (err) => console.error(err),
      });
  }
}
