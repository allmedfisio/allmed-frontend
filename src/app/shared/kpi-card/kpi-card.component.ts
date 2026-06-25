import { Component, Input } from '@angular/core';

@Component({
  selector: 'kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
  standalone: false,
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() delta: number | null = null;
  @Input() deltaLabel = '';
  @Input() color: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' = 'primary';
  @Input() icon = '';
  @Input() format: 'currency' | 'number' | 'percentage' | 'text' = 'text';

  get formattedValue(): string {
    if (this.value === '' || this.value === null || this.value === undefined) return '—';
    const num = typeof this.value === 'string' ? parseFloat(this.value) : this.value;
    if (isNaN(num)) return String(this.value);

    switch (this.format) {
      case 'currency':
        return '€ ' + num.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      case 'number':
        return num.toLocaleString('it-IT');
      case 'percentage':
        return num.toFixed(1) + '%';
      default:
        return String(this.value);
    }
  }

  get deltaClass(): string {
    if (this.delta === null || this.delta === undefined) return '';
    return this.delta >= 0 ? 'delta-positive' : 'delta-negative';
  }

  get deltaIcon(): string {
    if (this.delta === null || this.delta === undefined) return '';
    return this.delta >= 0 ? 'trending-up' : 'trending-down';
  }

  get deltaSign(): string {
    if (this.delta === null || this.delta === undefined) return '';
    return this.delta >= 0 ? '+' : '';
  }
}
