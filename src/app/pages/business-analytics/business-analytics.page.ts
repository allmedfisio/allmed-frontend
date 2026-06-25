import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  BusinessAnalyticsService,
  PeriodType,
  OverviewResponse,
  RevenueTrendResponse,
  ByBranchResponse,
  PerformanceResponse,
  RetentionResponse,
  PatientFlowResponse,
  CycleAnalysisResponse,
  ForecastResponse,
  ProfessionalCompensation,
} from 'src/app/services/business-analytics.service';
import { DoctorService } from 'src/app/services/doctor.service';
import { ChartData, ChartOptions } from 'chart.js';
import * as XLSX from 'xlsx';

/* ── Period helpers ── */
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/* ── Chart colors ── */
const PRIMARY = '#0a3d66';
const SECONDARY = '#40a8e0';
const SUCCESS = '#2e7d32';
const CHART_COLORS = [PRIMARY, SECONDARY, SUCCESS, '#ffc409', '#c62828', '#6a1b9a', '#00838f', '#e65100'];

@Component({
  selector: 'app-business-analytics',
  templateUrl: './business-analytics.page.html',
  styleUrls: ['./business-analytics.page.scss'],
  standalone: false,
})
export class BusinessAnalyticsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /* ── Tab state ── */
  activeTab = 'dashboard';
  tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
    { id: 'revenue', label: 'Fatturato', icon: 'cash-outline' },
    { id: 'branches', label: 'Prestazioni & Branche', icon: 'business-outline' },
    { id: 'professionals', label: 'Professionisti', icon: 'people-outline' },
    { id: 'patients', label: 'Pazienti', icon: 'person-outline' },
    { id: 'cycles', label: 'Cicli', icon: 'repeat-outline' },
    { id: 'forecast', label: 'Forecast', icon: 'trending-up-outline' },
    { id: 'data', label: 'Dati', icon: 'cloud-upload-outline' },
  ];

  /* ── Filter state ── */
  period: PeriodType = 'year';
  selectedYear = currentYear;
  selectedMonth = currentMonth;
  selectedQuarter = Math.floor((currentMonth - 1) / 3) + 1;
  years: number[] = [];
  showYoY = false;
  loading = false;

  /* ── Forecast filters ── */
  forecastHorizon = 12;
  forecastBranch = '';
  forecastMultiplier = 1;

  /* ── Cycle filters ── */
  cycleBranchFilter = '';
  cycleProfessionalFilter = '';

  /* ── Chart config ── */
  lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v: any) => '€' + (v / 1000).toFixed(0) + 'k' } } },
  };
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } },
  };
  barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
    scales: { y: { beginAtZero: true } },
  };

  scatterOptions: ChartOptions<'scatter'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Ticket Medio (€)' } },
      y: { beginAtZero: true, title: { display: true, text: 'N. Pazienti' } },
    },
  };

  /* ── Tab data ── */
  overview: OverviewResponse | null = null;
  revenueTrend: RevenueTrendResponse | null = null;
  byBranch: ByBranchResponse | null = null;
  performance: PerformanceResponse | null = null;
  retention: RetentionResponse | null = null;
  patientFlow: PatientFlowResponse | null = null;
  cycleAnalysis: CycleAnalysisResponse | null = null;
  forecast: ForecastResponse | null = null;
  compensations: ProfessionalCompensation[] = [];

  /* ── Chart data ── */
  dashRevenueChart: ChartData<'line'> | null = null;
  dashBranchChart: ChartData<'doughnut'> | null = null;
  dashProfChart: ChartData<'bar'> | null = null;
  revenueLineChart: ChartData<'line'> | null = null;
  revenueYoYChart: ChartData<'bar'> | null = null;
  branchBarChart: ChartData<'bar'> | null = null;
  branchTrendChart: ChartData<'line'> | null = null;
  branchDoughnutChart: ChartData<'doughnut'> | null = null;
  profBarChart: ChartData<'bar'> | null = null;
  profScatterChart: ChartData<'scatter'> | null = null;
  patientFlowChart: ChartData<'bar'> | null = null;
  patientFreqChart: ChartData<'doughnut'> | null = null;
  cycleMonthlyChart: ChartData<'bar'> | null = null;
  cycleDurationChart: ChartData<'bar'> | null = null;
  forecastChart: ChartData<'line'> | null = null;

  /* ── Import state ── */
  importFile: File | null = null;
  importPreview: any[] = [];
  importSummary = { valid: 0, errors: 0, ambiguous: 0, decisions: 0 };
  importing = false;
  importDecisions: { index: number; row: any; sessionMode: 'single' | 'multiple' }[] = [];

  /* ── Manual entry ── */
  manualForm = {
    type: 'single' as 'single' | 'cycle',
    patient_name: '', professional_name: '', service_name: '', branch: 'Altro',
    amount: 0, n_sessions: 1, professional_pct: 0,
    date: new Date().toISOString().split('T')[0], register_contract: true,
  };
  manualSubmitting = false;
  branchOptions = ['Fisioterapia', 'Ortopedia', 'Osteopatia', 'Neurologia', 'Riabilitazione', 'Posturologia', 'Ecografia', 'Podologia', 'Nutrizione', 'Psicomotricità', 'Ginecologia', 'Psicologia', "Onde d'urto", 'Logopedia', 'TNPEE', 'Fisiatria', 'Altro'];

  /* ── Professional → Branch mapping ── */
  professionalBranches: Map<string, string> = new Map();

  /* ── Compensation modal ── */
  compensationModalOpen = false;
  compensationForm = {
    professional_name: '', compensation_pct: 0,
    effective_from: new Date().toISOString().split('T')[0],
  };
  editingCompensation: ProfessionalCompensation | null = null;

  constructor(
    private analyticsService: BusinessAnalyticsService,
    private doctorService: DoctorService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
  ) {
    for (let y = currentYear; y >= currentYear - 5; y--) this.years.push(y);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  ngOnInit() {
    this.doctorService.getDoctorListBranches().subscribe((list) => {
      list.forEach((d) => {
        if (d.branch) this.professionalBranches.set(d.name, d.branch);
      });
    });
  }

  goBack() { this.navCtrl.back(); }

  /* ═══════════════════════════ TAB SWITCHING ═══════════════════════════ */
  switchTab(tabId: string | number | undefined | null) { this.activeTab = String(tabId || 'dashboard'); this.loadCurrentTab(); }

  loadCurrentTab() {
    switch (this.activeTab) {
      case 'dashboard': this.loadDashboard(); break;
      case 'revenue': this.loadRevenueTrend(); break;
      case 'branches': this.loadByBranch(); break;
      case 'professionals': this.loadProfessionals(); break;
      case 'patients': this.loadPatientFlow(); break;
      case 'cycles': this.loadCycleAnalysis(); break;
      case 'forecast': this.loadForecast(); break;
    }
  }

  onPeriodChange() { this.loadCurrentTab(); }

  /* ═══════════════════════════ DASHBOARD ═══════════════════════════ */
  loadDashboard() {
    this.loading = true;
    forkJoin({
      overview: this.analyticsService.getOverview(this.period, this.selectedYear, this.selectedMonth, this.selectedQuarter),
      revenue: this.analyticsService.getRevenueTrend(this.selectedYear, false),
    }).pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: ({ overview, revenue }) => {
          this.overview = overview;
          this.revenueTrend = revenue;
          this.buildDashboardCharts();
        },
        error: () => this.toast('Errore caricamento dashboard', 'danger'),
      });
  }

  buildDashboardCharts() {
    if (!this.overview) return;
    if (this.revenueTrend) {
      this.dashRevenueChart = {
        labels: this.revenueTrend.trend.map(t => MONTH_NAMES[parseInt(t.month.slice(5), 10) - 1]),
        datasets: [
          { label: 'Realizzato', data: this.revenueTrend.trend.map(t => t.realized), borderColor: SECONDARY, backgroundColor: SECONDARY + '30', fill: true, tension: 0.4, pointRadius: 2 },
          { label: 'Contratti', data: this.revenueTrend.trend.map(t => t.contract), borderColor: PRIMARY, borderDash: [4, 4], tension: 0.4, pointRadius: 2 },
        ],
      };
    }
    if (this.overview.topServices.length) {
      this.dashBranchChart = {
        labels: this.overview.topServices.map(s => s.name),
        datasets: [{ data: this.overview.topServices.map(s => s.revenue), backgroundColor: CHART_COLORS }],
      };
    }
    if (this.overview.topProfessionals.length) {
      this.dashProfChart = {
        labels: this.overview.topProfessionals.map(p => p.name),
        datasets: [{ label: 'Fatturato', data: this.overview.topProfessionals.map(p => p.revenue), backgroundColor: SECONDARY }],
      };
    }
  }

  /* ═══════════════════════════ FATTURATO ═══════════════════════════ */
  loadRevenueTrend() {
    this.loading = true;
    this.analyticsService.getRevenueTrend(this.selectedYear, this.showYoY)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (data) => { this.revenueTrend = data; this.buildRevenueCharts(); },
        error: () => this.toast('Errore caricamento fatturato', 'danger'),
      });
  }

  buildRevenueCharts() {
    if (!this.revenueTrend) return;
    const labels = this.revenueTrend.trend.map(t => MONTH_NAMES[parseInt(t.month.slice(5), 10) - 1]);
    this.revenueLineChart = {
      labels,
      datasets: [
        { label: 'Realizzato', data: this.revenueTrend.trend.map(t => t.realized), borderColor: SECONDARY, backgroundColor: SECONDARY + '20', fill: true, tension: 0.4 },
        { label: 'Contratti', data: this.revenueTrend.trend.map(t => t.contract), borderColor: PRIMARY, borderDash: [6, 3], tension: 0.4 },
      ],
    };
    if (this.revenueTrend.prevYear && this.showYoY) {
      const prevMap: Record<string, number> = {};
      this.revenueTrend.prevYear.forEach(p => prevMap[p.month.slice(5)] = p.revenue);
      this.revenueYoYChart = {
        labels,
        datasets: [
          { label: `${this.selectedYear}`, data: this.revenueTrend.trend.map(t => t.total), backgroundColor: SECONDARY },
          { label: `${this.selectedYear - 1}`, data: labels.map((_, i) => prevMap[String(i + 1).padStart(2, '0')] || 0), backgroundColor: '#aaa' },
        ],
      };
    } else { this.revenueYoYChart = null; }
  }

  /* ═══════════════════════════ BRANCHE ═══════════════════════════ */
  loadByBranch() {
    this.loading = true;
    this.analyticsService.getByBranch(this.period, this.selectedYear, this.selectedMonth, this.selectedQuarter)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (data) => { this.byBranch = data; this.buildBranchCharts(); },
        error: () => this.toast('Errore caricamento branche', 'danger'),
      });
  }

  buildBranchCharts() {
    if (!this.byBranch) return;
    this.branchBarChart = {
      labels: this.byBranch.rows.map(r => r.name),
      datasets: [{ label: 'Fatturato', data: this.byBranch.rows.map(r => r.revenue), backgroundColor: CHART_COLORS }],
    };
    this.branchDoughnutChart = {
      labels: this.byBranch.rows.map(r => r.name),
      datasets: [{ data: this.byBranch.rows.map(r => r.revenue), backgroundColor: CHART_COLORS }],
    };
    const trends = this.byBranch.monthlyTrend;
    const colors = [...CHART_COLORS];
    const first = Object.values(trends)[0];
    this.branchTrendChart = {
      labels: first ? first.map(t => t.month.slice(5)) : [],
      datasets: Object.entries(trends).map(([name, pts]) => ({
        label: name, data: pts.map(p => p.revenue),
        borderColor: colors.shift() || '#999', tension: 0.4, pointRadius: 2,
      })),
    };
  }

  /* ═══════════════════════════ PROFESSIONISTI ═══════════════════════════ */
  loadProfessionals() {
    this.loading = true;
    forkJoin({
      perf: this.analyticsService.getPerformance(this.period, this.selectedYear, this.selectedMonth, this.selectedQuarter),
      comp: this.analyticsService.getCompensations(),
    }).pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: ({ perf, comp }) => { this.performance = perf; this.compensations = comp; this.buildProfCharts(); },
        error: () => this.toast('Errore caricamento professionisti', 'danger'),
      });
  }

  buildProfCharts() {
    if (!this.performance || !this.performance.rows.length) return;
    this.profBarChart = {
      labels: this.performance.rows.map(r => r.name),
      datasets: [{ label: 'Fatturato', data: this.performance.rows.map(r => r.revenue), backgroundColor: SECONDARY }],
    };
    this.profScatterChart = {
      datasets: [{
        label: 'Medici', data: this.performance.rows.map(r => ({ x: r.avgTicket, y: r.patients })),
        backgroundColor: PRIMARY, pointRadius: 6,
      }],
    };
  }

  getCompensationFor(name: string): number | null {
    const needle = name.trim().toLowerCase();
    const c = this.compensations.find(
      c => c.professional_name.trim().toLowerCase() === needle,
    );
    return c ? c.compensation_pct : null;
  }

  getBranchForProfessional(name: string): string | null {
    const needle = name.trim();
    // Cerca corrispondenza esatta (case-insensitive)
    for (const [profName, branch] of this.professionalBranches.entries()) {
      if (profName.toLowerCase() === needle.toLowerCase()) return branch;
    }
    // Prova rimuovendo il prefisso "Dott." / "Dott.ssa"
    const stripped = needle.replace(/^(Dott\.|Dott\.ssa)\s+/i, "").trim();
    if (stripped !== needle) {
      for (const [profName, branch] of this.professionalBranches.entries()) {
        if (profName.toLowerCase() === stripped.toLowerCase()) return branch;
      }
    }
    return null;
  }

  openCompensationModal() {
    this.compensationModalOpen = true;
    this.editingCompensation = null;
    this.compensationForm = { professional_name: '', compensation_pct: 0, effective_from: new Date().toISOString().split('T')[0] };
  }

  closeCompensationModal() { this.compensationModalOpen = false; }

  editCompensation(comp: ProfessionalCompensation) {
    this.editingCompensation = comp;
    this.compensationForm = { professional_name: comp.professional_name, compensation_pct: comp.compensation_pct, effective_from: comp.effective_from || new Date().toISOString().split('T')[0] };
    this.compensationModalOpen = true;
  }

  saveCompensation() {
    if (!this.compensationForm.professional_name.trim()) {
      this.toast('Inserire il nome del professionista', 'warning'); return;
    }
    const pct = Number(this.compensationForm.compensation_pct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      this.toast('La percentuale deve essere tra 0 e 100', 'warning'); return;
    }
    const data = { professional_name: this.compensationForm.professional_name.trim(), compensation_pct: pct, effective_from: this.compensationForm.effective_from };
    const req = this.editingCompensation
      ? this.analyticsService.updateCompensation(this.editingCompensation.id, data)
      : this.analyticsService.createCompensation(data);
    req.subscribe({
      next: () => { this.toast('Compenso salvato', 'success'); this.closeCompensationModal(); this.loadProfessionals(); },
      error: () => this.toast('Errore salvataggio', 'danger'),
    });
  }

  deleteCompensation(comp: ProfessionalCompensation) {
    this.analyticsService.deleteCompensation(comp.id).subscribe({
      next: () => { this.toast('Compenso rimosso', 'success'); this.loadProfessionals(); },
      error: () => this.toast('Errore eliminazione', 'danger'),
    });
  }

  /* ═══════════════════════════ PAZIENTI ═══════════════════════════ */
  loadPatientFlow() {
    this.loading = true;
    this.analyticsService.getPatientFlow(this.period, this.selectedYear, this.selectedMonth, this.selectedQuarter)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (data) => { this.patientFlow = data; this.buildPatientCharts(); },
        error: () => this.toast('Errore caricamento pazienti', 'danger'),
      });
  }

  buildPatientCharts() {
    if (!this.patientFlow) return;
    const labels = this.patientFlow.monthlyFlow.map(m => MONTH_NAMES[parseInt(m.month.slice(5), 10) - 1]);
    this.patientFlowChart = {
      labels,
      datasets: [
        { label: 'Nuovi', data: this.patientFlow.monthlyFlow.map(m => m.newPx), backgroundColor: SECONDARY },
        { label: 'Di ritorno', data: this.patientFlow.monthlyFlow.map(m => m.returning), backgroundColor: PRIMARY },
      ],
    };
    const f = this.patientFlow.freqDistribution;
    this.patientFreqChart = {
      labels: ['1 visita', '2-3', '4-6', '7-10', '10+'],
      datasets: [{ data: [f['1'], f['2-3'], f['4-6'], f['7-10'], f['10+']], backgroundColor: CHART_COLORS }],
    };
  }

  /* ═══════════════════════════ CICLI ═══════════════════════════ */
  loadCycleAnalysis() {
    this.loading = true;
    this.analyticsService.getCycleAnalysis(
      this.period, this.selectedYear,
      this.cycleBranchFilter || undefined, this.cycleProfessionalFilter || undefined,
    ).pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (data) => { this.cycleAnalysis = data; this.buildCycleCharts(); },
        error: () => this.toast('Errore caricamento cicli', 'danger'),
      });
  }

  buildCycleCharts() {
    if (!this.cycleAnalysis) return;
    const mcLabels = this.cycleAnalysis.monthlyCycles.map(m => MONTH_NAMES[parseInt(m.month.slice(5), 10) - 1]);
    this.cycleMonthlyChart = {
      labels: mcLabels,
      datasets: [
        { label: 'Venduti', data: this.cycleAnalysis.monthlyCycles.map(m => m.sold), backgroundColor: PRIMARY },
        { label: 'Completati', data: this.cycleAnalysis.monthlyCycles.map(m => m.completed), backgroundColor: SECONDARY },
      ],
    };
    const d = this.cycleAnalysis.durationDistribution;
    this.cycleDurationChart = {
      labels: ['0-30 gg', '31-60', '61-90', '91-120', '120+'],
      datasets: [{ label: 'Cicli', data: [d['0-30'], d['31-60'], d['61-90'], d['91-120'], d['120+']], backgroundColor: SECONDARY }],
    };
  }

  /* ═══════════════════════════ FORECAST ═══════════════════════════ */
  loadForecast() {
    this.loading = true;
    this.analyticsService.getForecast(this.forecastHorizon, this.forecastMultiplier, this.forecastBranch || undefined)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (data) => { this.forecast = data; this.buildForecastChart(); },
        error: () => this.toast('Errore caricamento forecast', 'danger'),
      });
  }

  buildForecastChart() {
    if (!this.forecast || !this.forecast.forecast.length) return;
    const histL = this.forecast.history.map(h => h.month);
    const fcL = this.forecast.forecast.map(f => f.month);
    const histD = this.forecast.history.map(h => h.revenue);
    const fcB = this.forecast.forecast.map(f => f.base);
    const fcU = this.forecast.forecast.map(f => f.upper);
    const fcLo = this.forecast.forecast.map(f => f.lower);
    const nulls = (n: number) => Array(n).fill(null);

    this.forecastChart = {
      labels: [...histL, ...fcL],
      datasets: [
        { label: 'Storico', data: [...histD, ...nulls(fcL.length)], borderColor: PRIMARY, tension: 0.4, pointRadius: 2 },
        { label: 'Forecast', data: [...nulls(histL.length), ...fcB], borderColor: SECONDARY, borderDash: [5, 5], tension: 0.4, pointRadius: 3 },
        { label: 'Upper 95%', data: [...nulls(histL.length), ...fcU], borderColor: 'transparent', backgroundColor: SECONDARY + '15', fill: false, pointRadius: 0 },
        { label: 'Lower 95%', data: [...nulls(histL.length), ...fcLo], borderColor: 'transparent', backgroundColor: SECONDARY + '15', fill: '-1', pointRadius: 0 },
      ],
    };
  }

  /* ═══════════════════════════ IMPORT ═══════════════════════════ */
  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    this.importFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      this.processImportPreview(XLSX.utils.sheet_to_json(sheet, { defval: '' }));
    };
    reader.readAsBinaryString(file);
  }

  processImportPreview(raw: any[]) {
    this.importDecisions = [];
    let valid = 0, errors = 0, ambiguous = 0;
    this.importPreview = raw.map((row: any, idx: number) => {
      const prof = row.Professionista || row.professionista || '';
      const pat = row.Paziente || row.paziente || '';
      const date = this.parseExcelDate(row.Mese || row.mese || row.Data || row.data || '');
      const nSessions = parseInt(row.n_sedute || row.N_sedute || '1', 10) || 1;
      // Deriva la branca dal professionista se non presente nella riga
      const rowBranch = row.Branca || row.branca || '';
      const derivedBranch = rowBranch || this.getBranchForProfessional(prof) || '';
      if (!prof || !pat) { errors++; return { ...row, _valid: false, _error: 'Dati mancanti' }; }
      valid++;
      if (nSessions > 1) { ambiguous++; this.importDecisions.push({ index: idx, row, sessionMode: 'single' }); }
      return { ...row, Professionista: prof, Paziente: pat, Mese: date, Branca: derivedBranch, _valid: true, _needsDecision: nSessions > 1 };
    });
    this.importSummary = { valid, errors, ambiguous, decisions: this.importDecisions.length };
  }

  parseExcelDate(value: any): string {
    if (!value) return '';
    if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().split('T')[0];
    if (typeof value === 'number') {
      const d = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const raw = String(value).trim();
    if (raw.includes('/')) { const p = raw.split('/'); if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`; }
    if (raw.includes('-') && raw.length >= 10) return raw.slice(0, 10);
    return raw;
  }

  setDecision(index: number, mode: 'single' | 'multiple') {
    const d = this.importDecisions.find(d => d.index === index);
    if (d) d.sessionMode = mode;
    this.importSummary.decisions = this.importDecisions.filter(d => !d.sessionMode).length;
  }

  isDecisionPending(): boolean { return this.importDecisions.some(d => !d.sessionMode); }

  confirmImport() {
    if (this.isDecisionPending()) return;
    this.importDecisions.forEach(d => { this.importPreview[d.index]._sessionMode = d.sessionMode; });
    const expanded = this.expandRows(this.importPreview.filter(r => r._valid));
    this.importing = true;
    this.analyticsService.importData(expanded).pipe(finalize(() => this.importing = false))
      .subscribe({
        next: (res) => {
          this.toast(`Importati ${res.imported} record`, 'success');
          this.importFile = null; this.importPreview = []; this.importDecisions = [];
          this.importSummary = { valid: 0, errors: 0, ambiguous: 0, decisions: 0 };
        },
        error: () => this.toast('Errore importazione', 'danger'),
      });
  }

  expandRows(rows: any[]): any[] {
    const result: any[] = [];
    rows.forEach(row => {
      const n = parseInt(row.n_sedute || row.N_sedute || '1', 10) || 1;
      if (n > 1 && row._sessionMode === 'multiple') {
        for (let s = 1; s <= n; s++) {
          result.push({ ...row, n_sedute: 1, Prezzo: row.Prezzo ? parseFloat(row.Prezzo) / n : row.prezzo_unit || 0, import_source: 'import' });
        }
      } else {
        result.push({ ...row, import_source: 'import' });
      }
    });
    return result;
  }

  cancelImport() {
    this.importFile = null; this.importPreview = []; this.importDecisions = [];
    this.importSummary = { valid: 0, errors: 0, ambiguous: 0, decisions: 0 };
  }

  /* ═══════════════════════════ MANUAL ENTRY ═══════════════════════════ */
  onManualTypeChange() { if (this.manualForm.type === 'single') this.manualForm.n_sessions = 1; }

  onProfessionalSelect() {
    const pct = this.getCompensationFor(this.manualForm.professional_name);
    if (pct !== null) this.manualForm.professional_pct = pct;
    const branch = this.getBranchForProfessional(this.manualForm.professional_name);
    if (branch) this.manualForm.branch = branch;
  }

  submitManualEntry() {
    if (!this.manualForm.patient_name || !this.manualForm.professional_name || !this.manualForm.amount) {
      this.toast('Compila tutti i campi obbligatori', 'warning'); return;
    }
    this.manualSubmitting = true;
    this.analyticsService.manualEntry({
      patient_name: this.manualForm.patient_name,
      professional_name: this.manualForm.professional_name,
      service_name: this.manualForm.service_name,
      branch: this.manualForm.branch,
      amount: this.manualForm.amount,
      n_sessions: this.manualForm.n_sessions,
      professional_pct: this.manualForm.professional_pct,
      date: this.manualForm.date,
    }).pipe(finalize(() => this.manualSubmitting = false))
      .subscribe({
        next: (res) => {
          this.toast(`${res.created} record creati`, 'success');
          this.manualForm.patient_name = ''; this.manualForm.service_name = ''; this.manualForm.amount = 0; this.manualForm.n_sessions = 1;
        },
        error: () => this.toast('Errore inserimento', 'danger'),
      });
  }

  /* ═══════════════════════════ UTILITY ═══════════════════════════ */
  private async toast(message: string, color: string = 'dark') {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }

  fc(value: number): string {
    if (value == null || isNaN(value)) return '—';
    return '€ ' + value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  fp(value: number): string {
    if (value == null || isNaN(value)) return '—';
    return value.toFixed(1) + '%';
  }
}
