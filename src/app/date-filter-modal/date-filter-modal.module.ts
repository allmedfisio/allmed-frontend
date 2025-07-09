import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { DateFilterModalComponent } from './date-filter-modal.component';

@NgModule({
  declarations: [DateFilterModalComponent],
  imports: [CommonModule, FormsModule, IonicModule],
  exports: [DateFilterModalComponent],
})
export class DateFilterModalModule {}
