import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { KpiCardComponent } from './kpi-card/kpi-card.component';
import { ChartCardComponent } from './chart-card/chart-card.component';
import { QuillModule } from 'ngx-quill';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';

@NgModule({
  declarations: [KpiCardComponent, ChartCardComponent],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
    BaseChartDirective,
  ],
  exports: [
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
