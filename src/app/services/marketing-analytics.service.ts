import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MarketingStats {
  total_sent: number;
  total_clicked: number;
  click_rate: number;
  by_day: Array<{ date: string; sent: number; clicked: number }>;
  recent: Array<{
    patient_name: string;
    phone: string;
    sent_at: string;
    clicked_at: string | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class MarketingAnalyticsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStats(days: number = 30): Observable<MarketingStats> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<MarketingStats>(`${this.baseUrl}/marketing/stats`, {
      params,
    });
  }
}
