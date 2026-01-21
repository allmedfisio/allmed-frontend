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
  // Se vuoi includere "Palestra" o altri
  studies: Array<number | string> = [1, 2, 3, 4, 5, 6, 'Palestra'];
  doctors: string[] = [];

  constructor(
    private doctorService: DoctorService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    // Carica la lista dei nomi dei medici dal database
    this.doctorService.getDoctorList().subscribe({
      next: (names) => {
        // Ordina per cognome (ignorando i prefissi)
        this.doctors = this.sortByLastName(names);
      },
      error: (err) => {
        console.error('Errore caricamento lista medici:', err);
        // Fallback: se c'è un errore, usa una lista vuota
        this.doctors = [];
      }
    });
  }

  /**
   * Estrae il cognome da un nome completo (la prima parola dopo il prefisso)
   * Es: "Dott. Zuccaro Paolo" -> "Zuccaro"
   * Es: "Dott.ssa Boccone Isabella" -> "Boccone"
   */
  private extractLastName(fullName: string): string {
    // Rimuove i prefissi comuni (Dott., Dott.ssa, D.O., ecc.)
    const withoutPrefix = fullName
      .replace(/^(Dott\.|Dott\.ssa|D\.O\.|Dottore|Dottoressa)\s+/i, '')
      .trim();
    
    // Prende la prima parola dopo il prefisso come cognome
    const parts = withoutPrefix.split(/\s+/);
    return parts[0] || fullName;
  }

  /**
   * Ordina un array di nomi per cognome (ignorando prefissi)
   */
  private sortByLastName(names: string[]): string[] {
    return [...names].sort((a, b) => {
      const lastNameA = this.extractLastName(a);
      const lastNameB = this.extractLastName(b);
      return lastNameA.localeCompare(lastNameB, 'it', { sensitivity: 'base' });
    });
  }

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
