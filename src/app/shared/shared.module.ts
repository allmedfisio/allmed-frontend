import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AppButtonComponent } from './app-button/app-button.component';
import { InfoCardComponent } from './info-card/info-card.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';
import { ChartCardComponent } from './chart-card/chart-card.component';
import { QuillModule } from 'ngx-quill';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';

@NgModule({
  declarations: [AppButtonComponent, InfoCardComponent, KpiCardComponent, ChartCardComponent],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
    BaseChartDirective,
  ],
  exports: [
    AppButtonComponent,
    InfoCardComponent,
    KpiCardComponent,
    ChartCardComponent,
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    QuillModule,
    BaseChartDirective,
  ],
})
export class SharedModule {}
