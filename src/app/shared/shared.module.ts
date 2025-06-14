import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AppButtonComponent } from './app-button/app-button.component';
import { InfoCardComponent } from './info-card/info-card.component';
import { QuillModule } from 'ngx-quill';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppButtonComponent, InfoCardComponent],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
  ],
  exports: [
    AppButtonComponent,
    InfoCardComponent,
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    QuillModule,
  ],
})
export class SharedModule {}
