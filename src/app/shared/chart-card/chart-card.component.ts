import { Component, Input } from '@angular/core';

@Component({
  selector: 'chart-card',
  templateUrl: './chart-card.component.html',
  styleUrls: ['./chart-card.component.scss'],
  standalone: false,
})
export class ChartCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() height = '300px';
}
