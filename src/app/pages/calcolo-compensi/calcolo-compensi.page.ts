import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';

@Component({
  selector: 'app-calcolo-compensi',
  templateUrl: './calcolo-compensi.page.html',
  styleUrls: ['./calcolo-compensi.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  providers: [{ provide: LOCALE_ID, useValue: 'it-IT' }],
})
export class CalcoloCompensiPage {
  // --- Calcolatore 1: Trattenuta ---
  valorePrestazione: number | null = null;
  numeroSedute: number | null = null;
  percentualeTrattenuta: number | null = null;

  trattenutaCentro: number | null = null;
  compensoProfessionistaTotale: number | null = null;
  compensoPerSeduta: number | null = null;

  // --- Calcolatore 2: Compenso per sedute ---
  costoASeduta: number | null = null;
  numeroCal2: number | null = null;
  compensoTotaleCal2: number | null = null;

  constructor(private navCtrl: NavController) {}

  calcolaSpettanza() {
    if (
      this.valorePrestazione == null ||
      this.numeroSedute == null ||
      this.percentualeTrattenuta == null ||
      this.valorePrestazione <= 0 ||
      this.numeroSedute <= 0 ||
      this.percentualeTrattenuta < 0 ||
      this.percentualeTrattenuta > 100
    ) {
      this.resetCal1();
      return;
    }

    this.trattenutaCentro =
      (this.valorePrestazione * this.percentualeTrattenuta) / 100;
    this.compensoProfessionistaTotale =
      this.valorePrestazione - this.trattenutaCentro;
    this.compensoPerSeduta =
      this.compensoProfessionistaTotale / this.numeroSedute;

    // Pre-compila il secondo calcolatore con il compenso per seduta appena calcolato
    this.costoASeduta = this.compensoPerSeduta;
    this.compensoTotaleCal2 = null;
  }

  resetCal1() {
    this.trattenutaCentro = null;
    this.compensoProfessionistaTotale = null;
    this.compensoPerSeduta = null;
  }

  svuotaCal1() {
    this.valorePrestazione = null;
    this.numeroSedute = null;
    this.percentualeTrattenuta = null;
    this.resetCal1();
  }

  calcolaPerSedute() {
    if (
      this.costoASeduta == null ||
      this.numeroCal2 == null ||
      this.costoASeduta <= 0 ||
      this.numeroCal2 <= 0
    ) {
      this.compensoTotaleCal2 = null;
      return;
    }
    this.compensoTotaleCal2 = this.costoASeduta * this.numeroCal2;
  }

  svuotaCal2() {
    this.costoASeduta = null;
    this.numeroCal2 = null;
    this.compensoTotaleCal2 = null;
  }

  goBack() {
    this.navCtrl.navigateBack('/segreteria');
  }
}
