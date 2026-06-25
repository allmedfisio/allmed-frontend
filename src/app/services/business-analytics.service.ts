import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type PeriodType = 'month' | 'quarter' | 'year';

/* ──────────────────────────────────────────
   Modelli Dati
   ────────────────────────────────────────── */

export interface OverviewResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  kpi: {
    totalRevenue: number;
    contractRevenue: number;
    realizedRevenue: number;
    totalClinicRevenue: number;
    totalProfessionalFees: number;
    totalVisits: number;
    uniquePatients: number;
    avgTicket: number;
    marginPct: number;
    deltaRevenue: number | null;
    deltaPatients: number | null;
    deltaTicket: number | null;
  };
  topServices: { name: string; revenue: number; visits: number }[];
  topProfessionals: { name: string; revenue: number; visits: number }[];
  strengths: {
    top: { name: string; revenue: number; visits: number; avgTicket: number; margin: number }[];
    bottom: { name: string; revenue: number; visits: number; avgTicket: number; margin: number }[];
  };
}

export interface MixItem {
  name: string;
  revenue: number;
  visits: number;
  share: number;
}

export interface MixResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  byService: MixItem[];
  byBranch: MixItem[];
  byProfessional: MixItem[];
}

export interface PerformanceRow {
  name: string;
  revenue: number;
  visits: number;
  patients: number;
  avgTicket: number;
  marginPct: number;
}

export interface PerformanceResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  rows: PerformanceRow[];
}

export interface RetentionResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  totalPatients: number;
  returningPatients: number;
  returnRate: number;
  avgVisits: number;
  avgRevenuePerPatient: number;
}

export interface ForecastPoint {
  month: string;
  base: number;
  upper: number;
  lower: number;
  seasonalFactor: number;
}

export interface ForecastResponse {
  history: { month: string; revenue: number }[];
  smoothedHistory: { month: string; revenue: number }[];
  forecast: ForecastPoint[];
  seasonality: Record<string, number>;
  target: { baselineTotal: number; targetTotal: number; gap: number };
  kpi: {
    projectedGrowth: number;
    peakMonth: string | null;
    peakValue: number;
    lastYearRevenue: number;
    forecastYearRevenue: number;
  };
  branch: string | null;
}

export interface RevenueTrendResponse {
  year: number;
  trend: {
    month: string;
    contract: number;
    realized: number;
    total: number;
    visits: number;
    uniquePatients: number;
    clinicRevenue: number;
    avgTicket: number;
    marginPct: number;
  }[];
  totals: {
    contract: number;
    realized: number;
    total: number;
    visits: number;
    clinicRevenue: number;
    avgMonthly: number;
  };
  prevYear: { month: string; revenue: number }[] | null;
}

export interface BranchRow {
  name: string;
  revenue: number;
  visits: number;
  clinicRevenue: number;
  share: number;
  avgTicket: number;
  marginPct: number;
}

export interface ByBranchResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  rows: BranchRow[];
  monthlyTrend: Record<string, { month: string; revenue: number }[]>;
}

export interface PatientFlowResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  totalPatients: number;
  newPatients: number;
  returningPatients: number;
  returnRate: number;
  avgVisitsPerPatient: number;
  multiServicePatients: number;
  multiServiceRate: number;
  freqDistribution: {
    '1': number;
    '2-3': number;
    '4-6': number;
    '7-10': number;
    '10+': number;
  };
  monthlyFlow: { month: string; newPx: number; returning: number }[];
  topByRevenue: { name: string; revenue: number }[];
  topByVisits: { name: string; visits: number }[];
}

export interface CycleKpi {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  completionRate: number;
  avgDurationDays: number;
  avgSessions: number;
  totalContractValue: number;
  totalRealized: number;
  gap: number;
}

export interface CycleAnalysisResponse {
  period: { startDate: string; endDate: string; type: PeriodType };
  kpi: CycleKpi;
  durationDistribution: { '0-30': number; '31-60': number; '61-90': number; '91-120': number; '120+': number };
  monthlyCycles: { month: string; sold: number; completed: number }[];
  byBranch: { name: string; cycles: number; contractValue: number }[];
  cycles: {
    id: string;
    patient_name: string;
    professional_name: string;
    branch: string;
    total_sessions: number;
    completed_sessions: number;
    total_amount: number;
    status: string;
    start_date: string;
    end_date: string | null;
    professionals?: string[];
    session_professionals?: { session_number: number; professional_name: string }[];
  }[];
}

export interface ProfessionalCompensation {
  id: string;
  professional_name: string;
  compensation_pct: number;
  effective_from: string;
  effective_to?: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class BusinessAnalyticsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /* ── Period helpers ── */
  private buildParams(period: PeriodType, year?: number, month?: number, quarter?: number): HttpParams {
    let params = new HttpParams().set('period', period);
    if (year) params = params.set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    if (quarter) params = params.set('quarter', quarter.toString());
    return params;
  }

  /* ── Existing endpoints ── */
  getOverview(period: PeriodType, year?: number, month?: number, quarter?: number): Observable<OverviewResponse> {
    return this.http.get<OverviewResponse>(`${this.baseUrl}/business-analytics/overview`, {
      params: this.buildParams(period, year, month, quarter),
    });
  }

  getMix(period: PeriodType, year?: number, month?: number, quarter?: number): Observable<MixResponse> {
    return this.http.get<MixResponse>(`${this.baseUrl}/business-analytics/mix`, {
      params: this.buildParams(period, year, month, quarter),
    });
  }

  getPerformance(period: PeriodType, year?: number, month?: number, quarter?: number): Observable<PerformanceResponse> {
    return this.http.get<PerformanceResponse>(`${this.baseUrl}/business-analytics/performance`, {
      params: this.buildParams(period, year, month, quarter),
    });
  }

  getRetention(period: PeriodType, year?: number, month?: number, quarter?: number): Observable<RetentionResponse> {
    return this.http.get<RetentionResponse>(`${this.baseUrl}/business-analytics/retention`, {
      params: this.buildParams(period, year, month, quarter),
    });
  }

  getForecast(months = 12, targetMultiplier = 1, branch?: string): Observable<ForecastResponse> {
    let params = new HttpParams().set('months', months.toString());
    if (targetMultiplier) params = params.set('targetMultiplier', targetMultiplier.toString());
    if (branch) params = params.set('branch', branch);
    return this.http.get<ForecastResponse>(`${this.baseUrl}/business-analytics/forecast`, { params });
  }

  importData(data: any[]): Observable<{ imported: number }> {
    return this.http.post<{ imported: number }>(`${this.baseUrl}/business-analytics/import`, { data });
  }

  /* ── New endpoints ── */
  getRevenueTrend(year?: number, compareYoY = false): Observable<RevenueTrendResponse> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (compareYoY) params = params.set('compareYoY', 'true');
    return this.http.get<RevenueTrendResponse>(`${this.baseUrl}/business-analytics/revenue-trend`, { params });
  }

  getByBranch(period: PeriodType, year?: number, month?: number, quarter?: number): Observable<ByBranchResponse> {
    return this.http.get<ByBranchResponse>(`${this.baseUrl}/business-analytics/by-branch`, {
      params: this.buildParams(period, year, month, quarter),
    });
  }

  getPatientFlow(period: PeriodType, year?: number, month?: number, quarter?: number): Observable<PatientFlowResponse> {
    return this.http.get<PatientFlowResponse>(`${this.baseUrl}/business-analytics/patient-flow`, {
      params: this.buildParams(period, year, month, quarter),
    });
  }

  getCycleAnalysis(
    period: PeriodType,
    year?: number,
    branch?: string,
    professional?: string,
  ): Observable<CycleAnalysisResponse> {
    let params = this.buildParams(period, year);
    if (branch) params = params.set('branch', branch);
    if (professional) params = params.set('professional', professional);
    return this.http.get<CycleAnalysisResponse>(`${this.baseUrl}/business-analytics/cycle-analysis`, { params });
  }

  manualEntry(data: any): Observable<{ created: number; visits: any[] }> {
    return this.http.post<{ created: number; visits: any[] }>(
      `${this.baseUrl}/business-analytics/manual-entry`,
      data,
    );
  }

  createCycle(data: any): Observable<{ cycle_id: string }> {
    return this.http.post<{ cycle_id: string }>(`${this.baseUrl}/business-analytics/cycle`, data);
  }

  completeSession(cycleId: string, sessionNumber: number, date?: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/business-analytics/cycle/${cycleId}/session`, {
      session_number: sessionNumber,
      date: date || new Date().toISOString().split('T')[0],
    });
  }

  /* ── Compensations ── */
  getCompensations(): Observable<ProfessionalCompensation[]> {
    return this.http.get<ProfessionalCompensation[]>(`${this.baseUrl}/professional-compensations`);
  }

  getCompensationHistory(name: string): Observable<ProfessionalCompensation[]> {
    return this.http.get<ProfessionalCompensation[]>(`${this.baseUrl}/professional-compensations/${encodeURIComponent(name)}`);
  }

  createCompensation(data: {
    professional_name: string;
    compensation_pct: number;
    effective_from?: string;
  }): Observable<ProfessionalCompensation> {
    return this.http.post<ProfessionalCompensation>(`${this.baseUrl}/professional-compensations`, data);
  }

  updateCompensation(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/professional-compensations/${id}`, data);
  }

  deleteCompensation(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/professional-compensations/${id}`);
  }
}
