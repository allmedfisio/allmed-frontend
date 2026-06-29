import { Component, OnInit } from '@angular/core';
import {
  MarketingAnalyticsService,
  MarketingStats,
} from 'src/app/services/marketing-analytics.service';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-analisi-marketing',
  templateUrl: './analisi-marketing.page.html',
  styleUrls: ['./analisi-marketing.page.scss'],
  standalone: false,
})
export class AnalisiMarketingPage implements OnInit {
  loading = true;
  stats: MarketingStats | null = null;
  selectedDays: number = 30;

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  constructor(private marketingService: MarketingAnalyticsService) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading = true;
    this.marketingService.getStats(this.selectedDays).subscribe({
      next: (data) => {
        this.stats = data;
        this.buildChart(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Errore caricamento statistiche marketing:', err);
        this.loading = false;
      },
    });
  }

  onDaysChange() {
    this.loadStats();
  }

  private buildChart(data: MarketingStats) {
    this.chartData = {
      labels: data.by_day.map((d) => {
        const [y, m, day] = d.date.split('-');
        return `${day}/${m}`;
      }),
      datasets: [
        {
          label: 'Inviati',
          data: data.by_day.map((d) => d.sent),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Click',
          data: data.by_day.map((d) => d.clicked),
          backgroundColor: 'rgba(37, 211, 102, 0.6)',
          borderColor: 'rgba(37, 211, 102, 1)',
          borderWidth: 1,
        },
      ],
    };
  }
}
