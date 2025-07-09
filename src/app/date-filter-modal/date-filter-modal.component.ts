import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-date-filter-modal',
  templateUrl: './date-filter-modal.component.html',
  styleUrls: ['./date-filter-modal.component.scss'],
  standalone: false,
})
export class DateFilterModalComponent implements OnInit {
  @Input() initialDate?: string;
  @Input() showTime: boolean = false;
  selected!: string;

  // presentation & format dinamici
  get presentation() {
    return this.showTime ? 'date-time' : 'date';
  }
  get displayFormat() {
    return this.showTime ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';
  }
  get pickerFormat() {
    return this.showTime ? 'DD MMM YYYY HH:mm' : 'DD MMM YYYY';
  }

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.selected = this.initialDate ?? today;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  confirm() {
    this.modalCtrl.dismiss({ date: this.selected });
  }
}
