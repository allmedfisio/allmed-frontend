import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AppButtonComponent } from './app-button/app-button.component';
import { InfoCardComponent } from './info-card/info-card.component';

@NgModule({
  declarations: [AppButtonComponent, InfoCardComponent],
  imports: [CommonModule, IonicModule],
  exports: [AppButtonComponent, InfoCardComponent],
})
export class SharedModule {}
