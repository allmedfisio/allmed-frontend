import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Injector,
  OnInit,
  runInInjectionContext,
} from '@angular/core';
import {
  ModalController,
  ToastController,
  LoadingController,
  AlertController,
  MenuController,
} from '@ionic/angular';
import { AddPatientModalComponent } from 'src/app/add-patient-modal/add-patient-modal.component';
import { AddDoctorModalComponent } from 'src/app/add-doctor-modal/add-doctor-modal.component';
import { EditPatientModalComponent } from 'src/app/edit-patient-modal/edit-patient-modal.component';
import { Patient, PatientService } from 'src/app/services/patient.service';
import {
  Observable,
  take,
  firstValueFrom,
  Subscription,
  BehaviorSubject,
  combineLatest,
} from 'rxjs';
import { map, tap, filter } from 'rxjs/operators';
import { Doctor, DoctorService } from 'src/app/services/doctor.service';
import { AuthService, UserProfile } from 'src/app/services/auth.service';
import {
  TemplateService,
  TicketTemplate,
} from 'src/app/services/template.service';
import { VersionService } from 'src/app/services/version.service';
import * as XLSX from 'xlsx';
import { DateFilterModalComponent } from 'src/app/date-filter-modal/date-filter-modal.component';

interface PatientGroup {
  study: number | string;
  patients: Patient[];
}

interface DoctorGroup {
  study: number | string;
  doctors: Doctor[];
}

interface DateGroup {
  date: string; // 'YYYY-MM-DD'
  groups: PatientGroup[]; // i gruppi per studio in quel giorno
}

@Component({
  selector: 'app-segreteria',
  templateUrl: './segreteria.page.html',
  styleUrls: ['./segreteria.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegreteriaPage implements OnInit {
  userProfile$!: Observable<UserProfile>;
  patientsByStatus$!: Observable<{
    booked: PatientGroup[];
    waiting: PatientGroup[];
    inVisit: PatientGroup[];
    completed: PatientGroup[];
    bookedByDate: DateGroup[];
  }>;
  doctorsByStudy$!: Observable<DoctorGroup[]>;
  followUpCount$!: Observable<number>;

  // Filtro data per i prenotati
  filterDatePrenotati: string = new Date().toISOString().split('T')[0];
  private filterDatePrenotati$ = new BehaviorSubject<string>(
    this.filterDatePrenotati,
  );
  segment: 'in_attesa' | 'prenotato' | 'completato' = 'in_attesa';

  // memorizzo qui il template, così non userò mai più getTemplate() a runtime
  ticketTpl!: TicketTemplate;
  private tplSub?: Subscription;

  // Campi per le modali
  fullName: string = '';
  assignedStudy: number | null = null;
  doctorName: string = '';
  doctorStudy: number = NaN;
  smsSent: Set<string> = new Set();

  // File per upload excel
  file: File | null = null;

  // Dati dell'user -> Da modificare
  userName: string = 'Nome Utente';
  userImage: string = 'path-to-image.jpg';
  appVersion: string = '';

  constructor(
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private menuCtrl: MenuController,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private authService: AuthService,
    private tplService: TemplateService,
    private injector: Injector,
    private cdr: ChangeDetectorRef,
    private versionService: VersionService,
  ) {
    this.appVersion = this.versionService.getVersion();
  }

  ngOnInit() {
    // Sottoscrivi (via async pipe) al profilo
    this.userProfile$ = this.authService.profile$;

    /* Divide i pazienti in base allo status
    this.patientsByStatus$ = this.patientService.patients$.pipe(
      tap((list) => console.log('PatientBystatus', list)),
      map((list) => this.groupByStatus(list))
    ); */

    this.patientsByStatus$ = combineLatest([
      this.patientService.patients$,
      this.doctorService.doctors$,
      this.filterDatePrenotati$.asObservable(),
    ]).pipe(
      map(([list, doctors, filterDate]) => {
        // 1) ottieni i quattro gruppi base
        const { waiting, inVisit, booked, completed } = this.groupByStatus(
          list,
          doctors,
          filterDate,
        );

        // 2) se non c’è filtro data, costruiamo bookedByDate
        let bookedByDate: { date: string; groups: PatientGroup[] }[] = [];
        if (!filterDate) {
          // estrai le date uniche dai prenotati
          const prenotatiAll = list.filter((p) => p.status === 'prenotato');
          const dates = Array.from(
            new Set(prenotatiAll.map((p) => p.appointment_time.split('T')[0])),
          ).sort();
          bookedByDate = dates.map((date) => {
            // raggruppa i prenotati di quel giorno senza etichetta "Tutti i prenotati"
            const slice = prenotatiAll.filter((p) =>
              p.appointment_time.startsWith(date),
            );
            return {
              date,
              groups: [
                {
                  study: '',
                  patients: slice.sort((a, b) =>
                    a.appointment_time.localeCompare(b.appointment_time),
                  ),
                },
              ],
            };
          });
        }

        // 3) ritorno l’oggetto con tutte e cinque le proprietà
        return { waiting, inVisit, booked, completed, bookedByDate };
      }),
    );

    // Carica i medici attivi solo una volta
    this.doctorsByStudy$ = this.doctorService.doctors$.pipe(
      map((list) => this.groupByStudy(list)),
    );

    // Precarico il template del ticket
    runInInjectionContext(this.injector, () => {
      this.tplSub = this.tplService.getTemplate().subscribe((tpl) => {
        this.ticketTpl = tpl;
      });
    });

    // Conta i pazienti in follow-up (in_archivio e data > 3 mesi fa)
    this.followUpCount$ = this.patientService.patients$.pipe(
      map((list) => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return list.filter(
          (p) =>
            p.status === 'in_archivio' &&
            !!p.last_visit_date &&
            new Date(p.last_visit_date) <= threeMonthsAgo,
        ).length;
      }),
    );
  }

  ngOnDestroy() {
    this.tplSub?.unsubscribe();
  }

  // Funzioni di Patient

  removePatient(patientId: string) {
    this.patientService.removePatient(patientId).subscribe();
  }

  async callPatient(patient: Patient): Promise<void> {
    // Usa assigned_doctor_id per pazienti in visita, o il nome per prenotati
    const doctorId = patient.assigned_doctor_id;
    if (!doctorId) {
      this.presentToast(`Paziente senza medico assegnato`, 'danger');
      return;
    }

    try {
      // Chiama il paziente
      await firstValueFrom(
        this.patientService.callPatient(patient.id).pipe(take(1)),
      );
      // Aggiorna il paziente in visita del medico
      await firstValueFrom(
        this.doctorService
          .updateLastPatient(doctorId, patient.full_name)
          .pipe(take(1)),
      );

      // Recupera il nome del medico per il messaggio
      const doctors = await firstValueFrom(this.doctorService.doctors$);
      const doc = doctors.find((d) => d.id === doctorId);
      const doctorName = doc?.name || 'medico';

      this.presentToast(
        `Paziente ${patient.full_name} chiamato dal dott. ${doctorName}`,
        'success',
      );
    } catch (err: any) {
      this.presentToast(`Errore: ${err.message}`, 'danger');
    }
  }

  async patientArrived(patient: Patient): Promise<void> {
    try {
      // Ora segna il paziente come arrivato
      // Il backend gestisce la conversione da assigned_doctor_name a assigned_doctor_id
      await firstValueFrom(
        this.patientService.markArrived(patient.id).pipe(take(1)),
      );

      this.presentToast(
        `✓ ${patient.full_name} è ora in sala d'attesa`,
        'success',
      );
    } catch (err: any) {
      console.error('Errore patientArrived:', err);
      // Gestisce gli errori dal backend con messaggi chiari
      const errorMsg =
        err?.error?.error || err?.message || 'Errore sconosciuto';

      if (errorMsg.includes('non è attualmente attivo')) {
        this.presentToast(
          `⚠ ${patient.assigned_doctor_name} non è disponibile al momento. Attivalo prima di segnare l'arrivo`,
          'danger',
        );
      } else if (errorMsg.includes('Nessun medico')) {
        this.presentToast(
          `⚠ ${patient.full_name} non ha un medico assegnato`,
          'danger',
        );
      } else {
        this.presentToast(
          `⚠ Impossibile segnare l'arrivo: ${errorMsg}`,
          'danger',
        );
      }
    }
  }

  // Funzioni di Doctor

  removeDoctor(id: string) {
    this.doctorService.removeDoctor(id).subscribe();
  }

  // Funzioni per upload e parsing documento excel pazienti
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files && input.files.length ? input.files[0] : null;
    this.importPatients();
  }

  async importPatients() {
    if (!this.file) return;
    // ① Presenta lo spinner
    const loading = await this.loadingCtrl.create({
      message: 'Caricamento pazienti…',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      // Estrai righe da XLS
      const buffer = await this.file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
      });

      // Trova indici delle colonne
      const headers = rows[0] as string[];
      const idxDate = headers.indexOf('Data Ora');
      const idxName = headers.indexOf('Paziente');
      const idxDoctor = headers.indexOf('Medico');
      // Cerca la colonna del telefono con nomi diversi
      let idxPhone = headers.indexOf('Telefono');
      if (idxPhone < 0) idxPhone = headers.indexOf('Phone');
      if (idxPhone < 0) idxPhone = headers.indexOf('Cellulare');

      if (idxDate < 0 || idxName < 0 || idxDoctor < 0) {
        console.error('Colonne mancanti:', headers);
        throw new Error(
          'Assicurati che gli header siano esattamente "Data Ora", "Paziente", "Medico"',
        );
      }

      // Ottieni la lista di tutti i nomi dalla doctor-list per la validazione
      const doctorList = await firstValueFrom(
        this.doctorService.getDoctorList(),
      );

      // Ottieni i medici attivi per ottenere gli ID (opzionale)
      const activeDoctors = await firstValueFrom(this.doctorService.doctors$);

      // Crea una mappa per il matching flessibile: nome normalizzato -> nome originale dalla doctor-list
      const doctorNameMap = new Map<string, string>();
      doctorList.forEach((doctorName) => {
        const normalized = this.normalizeDoctorName(doctorName);
        doctorNameMap.set(normalized, doctorName);
      });

      // Crea una mappa per gli ID attivi: nome normalizzato -> ID attivo (se esiste)
      const activeDoctorIdMap = new Map<string, string>();
      activeDoctors.forEach((activeDoc) => {
        const normalized = this.normalizeDoctorName(activeDoc.name);
        activeDoctorIdMap.set(normalized, activeDoc.id);
      });

      // Filtra e mappa i pazienti
      const dataRows = rows
        .slice(1)
        // rimuovo righe incomplete
        .filter((r) => r[idxDate] != null && r[idxName] && r[idxDoctor]);

      const patients = dataRows.map((r) => {
        // Parsing Data/Ora
        const rawDate = r[idxDate];
        let dt: Date;

        if (typeof rawDate === 'number') {
          // seriale Excel
          const d = XLSX.SSF.parse_date_code(rawDate);
          dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
        } else {
          // stringa “11/06/2025 18:00:00” (anche con doppio spazio)
          const txt = String(rawDate).trim().replace(/\s+/g, ' ');
          const [datePart, timePart] = txt.split(' ');
          const [day, month, year] = datePart.split('/').map((n) => +n);
          const [hour, minute, second] = timePart.split(':').map((n) => +n);
          dt = new Date(year, month - 1, day, hour, minute, second);
        }

        if (isNaN(dt.getTime())) {
          throw new Error(`Data non valida: ${rawDate}`);
        }

        // Parsing medico: cerchiamo l'ID del medico dal nome
        const rawDoctor = String(r[idxDoctor]).trim();

        // Normalizza il nome del medico per il matching flessibile
        const normalizedInput = this.normalizeDoctorName(rawDoctor);

        // Validazione: verifica che il medico esista nella doctor-list e trova il nome corretto
        let matchedDoctorName = null;
        for (const [
          normalizedDbName,
          originalName,
        ] of doctorNameMap.entries()) {
          if (this.isDoctorMatch(normalizedInput, normalizedDbName)) {
            matchedDoctorName = originalName;
            break;
          }
        }

        if (!matchedDoctorName) {
          throw new Error(
            `Medico "${rawDoctor}" non trovato. Verificare che il nome sia corretto. Sono accettate anche forme abbreviate come "Delfino" per "dott.ssa Delfino Claudia".`,
          );
        }

        // Camel Case nome
        const rawName = String(r[idxName]).trim();
        const full_name = this.toCamelCase(rawName);

        // crea una ISO senza 'Z', es. "2025-06-11T18:30:00"
        const localIso = dt.toISOString().slice(0, 19);

        const phoneVal =
          idxPhone >= 0 && r[idxPhone] != null
            ? String(r[idxPhone]).trim()
            : undefined;

        return {
          full_name,
          assigned_doctor: matchedDoctorName,
          appointment_time: localIso,
          status: 'prenotato',
          ...(phoneVal ? { phone: phoneVal } : {}),
        };
      });

      if (!patients.length) {
        console.warn('Nessun paziente valido trovato.');
        return;
      }

      // Invio al backend
      await this.patientService.bulkCreate(patients).toPromise();

      // Success toast
      const toast = await this.toastCtrl.create({
        message: `✓ Importati ${patients.length} pazienti con successo`,
        duration: 3000,
        color: 'success',
      });
      await toast.present();

      this.file = null;
    } catch (err: any) {
      console.error(err);
      const toast = await this.toastCtrl.create({
        message: `⚠ Errore durante l'importazione: ${err.message || 'Verifica il file Excel'}`,
        duration: 4000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      // ⑦ Nascondi spinner
      await loading.dismiss();
    }
  }

  // ========== Helpers ==========

  private groupByStatus(
    list: Patient[],
    doctors: Doctor[],
    filterDatePrenotati: string,
  ): {
    booked: PatientGroup[];
    waiting: PatientGroup[];
    inVisit: PatientGroup[];
    completed: PatientGroup[];
  } {
    // Data odierna
    const todayStr = new Date().toISOString().split('T')[0];

    const byStatus = (status: Patient['status']) => {
      // Filtro per status
      let slice = list.filter((p) => p.status === status);

      // applichiamo il filtro "oggi" su in_attesa
      if (status === 'in_attesa') {
        // solo quelli di oggi
        slice = slice.filter((p) => p.appointment_time?.startsWith(todayStr));
      }

      // applichiamo il filtro data selezionata su prenotato
      if (status === 'prenotato' && filterDatePrenotati) {
        slice = slice.filter((p) => {
          const appt = p.appointment_time;
          if (!appt || !filterDatePrenotati) {
            return true;
          }
          // estrai "YYYY-MM-DD" dal campo ISO completo
          const apptDate = appt.split('T')[0];
          return apptDate === filterDatePrenotati.split('T')[0];
        });
      }

      // Ordino per appointment_time crescente
      slice = slice.sort((a, b) =>
        a.appointment_time.localeCompare(b.appointment_time),
      );

      // Per i pazienti prenotati e completati, mostra sempre tutti in una lista singola senza raggruppamento per studio
      if (status === 'prenotato') {
        return [
          {
            study: 'Tutti i prenotati',
            patients: slice,
          },
        ];
      }

      if (status === 'completato') {
        return [
          {
            study: 'Visite Completate',
            patients: slice,
          },
        ];
      }

      // Per gli altri status, raggruppa per studio
      // Prima, crea una mappa medico -> studio per lookup veloce
      const doctorToStudyMap = new Map<string, number | string>();
      doctors.forEach((d) => {
        doctorToStudyMap.set(d.id, d.study);
      });

      // Estrai gli studi unici dai pazienti tramite i loro medici assegnati
      const studies = Array.from(
        new Set(
          slice
            .map((p) => {
              // Prova assigned_doctor_id prima, poi assigned_study come fallback
              if (p.assigned_doctor_id) {
                return doctorToStudyMap.get(p.assigned_doctor_id);
              }
              return p.assigned_study;
            })
            .filter((study): study is number | string => study !== undefined),
        ),
      ).sort((a, b) => {
        const aIsNum = typeof a === 'number';
        const bIsNum = typeof b === 'number';

        if (aIsNum && bIsNum) {
          // entrambi numeri: ordina numericamente
          return (a as number) - (b as number);
        } else if (aIsNum) {
          // a numero, b stringa: a prima
          return -1;
        } else if (bIsNum) {
          // b numero, a stringa: b prima
          return 1;
        } else {
          // entrambi stringhe: ordina alfabeticamente
          return String(a).localeCompare(String(b));
        }
      });

      return studies.map((study) => ({
        study,
        patients: slice.filter((p) => {
          // Controlla se il paziente appartiene a questo studio
          if (p.assigned_doctor_id) {
            const docStudy = doctorToStudyMap.get(p.assigned_doctor_id);
            return docStudy === study;
          }
          // Fallback su assigned_study per retrocompatibilità
          return p.assigned_study === study;
        }),
      }));
    };
    return {
      booked: byStatus('prenotato'),
      waiting: byStatus('in_attesa'),
      inVisit: byStatus('in_visita'),
      completed: (() => {
        // Raggruppa i pazienti completati per medico (doctor name)
        const completedPatients = list
          .filter((p) => p.status === 'completato')
          .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

        // Crea una mappa medico -> pazienti
        const doctorToStudyMap = new Map<string, number | string>();
        doctors.forEach((d) => {
          doctorToStudyMap.set(d.id, d.study);
        });

        // Estrai i medici unici (usando assigned_doctor_name)
        const uniqueDoctors = Array.from(
          new Set(
            completedPatients
              .map((p) => p.assigned_doctor_name)
              .filter(
                (name): name is string => name !== undefined && name !== '',
              ),
          ),
        ).sort();

        // Raggruppa per medico
        return uniqueDoctors.map((doctorName) => ({
          study: doctorName,
          patients: completedPatients.filter(
            (p) => p.assigned_doctor_name === doctorName,
          ),
        }));
      })(),
    };
  }

  private groupByStudy(list: Doctor[]) {
    // Estrai i valori unici di study
    const uniqueStudies = Array.from(new Set(list.map((d) => d.study)));

    // Ordina: prima i numeri, poi le stringhe
    uniqueStudies.sort((a, b) => {
      const aIsNum = typeof a === 'number';
      const bIsNum = typeof b === 'number';

      if (aIsNum && bIsNum) {
        // entrambi numeri
        return (a as number) - (b as number);
      } else if (aIsNum) {
        // a numero, b stringa -> a prima
        return -1;
      } else if (bIsNum) {
        // b numero, a stringa -> b prima
        return 1;
      } else {
        // entrambi stringhe -> ordine alfabetico
        return String(a).localeCompare(String(b));
      }
    });

    // Mappa ai gruppi ordinati
    return uniqueStudies.map((study) => ({
      study,
      doctors: list.filter((d) => d.study === study),
    }));
  }

  // helper che raggruppa SOLO prenotati per studio e opzionalmente data
  // DEPRECATO: non usato più, mantenuto per retrocompatibilità
  private groupByStudyStatus(
    list: Patient[],
    dateFilter?: string,
  ): PatientGroup[] {
    let slice = dateFilter
      ? list.filter((p) => p.appointment_time.startsWith(dateFilter))
      : [...list];
    // ordino per appointment_time
    slice.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    // NOTA: questa funzione è deprecata, usa assigned_doctor tramite groupByStatus
    // Mantenuta solo per retrocompatibilità
    // Filtra solo pazienti con assigned_study valido (per retrocompatibilità)
    const studies = Array.from(
      new Set(
        slice
          .map((p) => p.assigned_study)
          .filter((s): s is number | string => s !== undefined),
      ),
    ).sort((a, b) => {
      const na = typeof a === 'number',
        nb = typeof b === 'number';
      if (na && nb) return (a as number) - (b as number);
      if (na) return -1;
      if (nb) return 1;
      return String(a).localeCompare(String(b));
    });
    return studies.map((study) => ({
      study,
      patients: slice.filter((p) => p.assigned_study === study),
    }));
  }

  isNumber(value: any): boolean {
    // Per fare in modo di mostrare Studio se numero o solo la stringa se stringa
    // prova a convertirlo in numero e verifica che non sia NaN
    return !isNaN(Number(value));
  }

  // Convertire i nomi dei pazienti caricati in CamelCase
  private toCamelCase(name: string): string {
    return name
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // Normalizza il nome di un medico per il matching flessibile
  // Rimuove prefissi, converte in lowercase e trimma
  private normalizeDoctorName(name: string): string {
    return name
      .toLowerCase()
      .replace(/^(dott\.?\s*ssa\.?|dott\.?|dr\.?|prof\.?|d\.o\.)\s*/i, '') // Rimuove prefissi completi
      .trim();
  }

  // Verifica se due nomi di medici corrispondono in modo flessibile ma preciso
  // Richiede che almeno il cognome corrisponda esattamente
  private isDoctorMatch(input: string, dbName: string): boolean {
    // Se l'input corrisponde esattamente al nome normalizzato del database
    if (input === dbName) {
      return true;
    }

    // Dividi entrambi i nomi in parti (nome, cognome, titoli, etc.)
    const inputParts = input.split(/\s+/);
    const dbParts = dbName.split(/\s+/);

    // Estrai il cognome (ultima parte significativa, ignorando titoli)
    const getLastName = (parts: string[]) => {
      // Filtra parti che sembrano titoli
      const filtered = parts.filter(
        (part) => !/^(dott\.?|dr\.?|prof\.?)$/i.test(part),
      );
      return filtered.length > 0 ? filtered[filtered.length - 1] : '';
    };

    const inputLastName = getLastName(inputParts);
    const dbLastName = getLastName(dbParts);

    // Il cognome deve corrispondere esattamente (case-insensitive)
    if (
      inputLastName &&
      dbLastName &&
      inputLastName.toLowerCase() === dbLastName.toLowerCase()
    ) {
      return true;
    }

    // Fallback: se una parte dell'input corrisponde esattamente a una parte del db
    return inputParts.some((inputPart) =>
      dbParts.some(
        (dbPart) => inputPart.toLowerCase() === dbPart.toLowerCase(),
      ),
    );
  }

  // Verifica se una stringa è un UUID valido
  private isValidUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  resetFilterDate() {
    this.filterDatePrenotati = '';
    this.filterDatePrenotati$.next('');
  }

  // ========== trackBy ==========

  trackByStudy(index: number, group: { study: number | string }) {
    return group.study;
  }

  trackByPatientId(index: number, item: Patient) {
    return item.id;
  }

  trackByDoctorId(index: number, item: Doctor) {
    return item.id;
  }

  // Modali

  async openAddPatientModal() {
    const modal = await this.modalController.create({
      component: AddPatientModalComponent,
      cssClass: 'custom-modal',
    });
    return await modal.present();
  }

  async openAddDoctorModal() {
    const modal = await this.modalController.create({
      component: AddDoctorModalComponent,
      cssClass: 'custom-modal',
    });
    return await modal.present();
  }

  async openEditPatientModal(patient: any) {
    console.log('openModale: ' + JSON.stringify(patient));
    const modal = await this.modalController.create({
      component: EditPatientModalComponent,
      cssClass: 'custom-modal',
      componentProps: {
        patientData: patient,
      },
    });
    return await modal.present();
  }

  async openDateFilter() {
    const modal = await this.modalController.create({
      component: DateFilterModalComponent,
      componentProps: {
        initialDate: this.filterDatePrenotati,
        showTime: false,
      },
      cssClass: 'custom-modal',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ date?: string }>();
    if (data?.date !== undefined) {
      // se l'utente ha premuto Conferma (anche con date = '')
      this.filterDatePrenotati = data.date;
      this.filterDatePrenotati$.next(data.date);
    }
  }

  // Menù
  openAppMenu() {
    this.menuCtrl.open('segreteria-menu');
  }

  // Print del ticket
  async printTicket(patient: Patient) {
    //if (!this.lastCreatedPatient) return;
    if (!this.ticketTpl) return;

    // 1) Leggo template
    const tpl = this.ticketTpl;
    //const num = this.lastCreatedPatient.assigned_number;
    const num = patient.assigned_number;

    // Recupera lo studio dal medico assegnato
    let studio: number | string = patient.assigned_study || 'N/A'; // fallback
    if (patient.assigned_doctor_id) {
      const doctors = await firstValueFrom(this.doctorService.doctors$);
      const doctor = doctors.find((d) => d.id === patient.assigned_doctor_id);
      if (doctor) {
        studio = doctor.study;
      }
    }

    // Definisco stili CSS
    const styles = `
  <style>
    @page {
      size: auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .ticket {
      padding: 1rem;
      box-sizing: border-box;
      text-align: center;
      font-family: Poppins, sans-serif
    }
    .header-image {
      max-width: 100%;
      max-height: 150px;        /* altezza massima header */
      object-fit: contain;
      display: block;
      margin: 0 auto .5rem;
    }
    .queue {
      font-size: 1.8rem;
      margin:1rem 0;
      color: #1f2b54;
    }
    .promo {
      display: flex;                   /* usa flex */
      justify-content: center;         /* centra orizzontalmente */
      align-items: center; 
      width: 100%;
      height: 300px;            /* altezza massima promo */
      overflow: hidden;
    }
    .promo-content {
      transform-origin: center center;
    }
  </style>`;

    // 2) Costruisco HTML
    const html = `
  <div class="ticket">
    <img src="${tpl.headerImageUrl}" class="header-image" />
    <h2 style="color:${tpl.styleJson.primaryColor}; margin:.5rem 0;">
      ${tpl.headerText}
    </h2>
    <p class="queue">Numero di coda</p>
      <div class="queue">${num}</div>
      <p class="queue">Studio assegnato</p>
      <div class="queue">${studio}</div>
    <div class="promo">
      <div class="promo-content">
        ${tpl.promoHtml}
      </div>
    </div>
    <footer style="margin-top:1rem; font-size:1rem;">
      ${tpl.footerText}
    </footer>
  </div>`;

    // Script per ridimensionamento automatico
    const script = `
  <script>
    window.addEventListener('load', () => {
      const promo = document.querySelector('.promo');
      const content = document.querySelector('.promo-content');
      if (promo && content) {
        const scaleX = promo.clientWidth  / content.scrollWidth;
        const scaleY = promo.clientHeight / content.scrollHeight;
        const scale  = Math.min(scaleX, scaleY, 1);
        content.style.transform = 'scale(' + scale + ')';
      }
      window.print();
      window.close();
    });
  </script>`;

    // 3) Apro popup e stampo
    const popup = window.open('', '_blank', 'width=400,height=600');
    popup!.document.write(`
    <html>
      <head>
        <title>Ticket AllMed</title>
          ${styles}
      </head>
      <body>
        ${html}
        ${script}
      </body>
    </html>`);
    popup!.document.close();
  }

  // Toast

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // Funzioni per pazienti completati

  async sendSmsMessage(patient: Patient) {
    // Invia SMS tramite webhook Macrodroid
    if (!patient.phone) {
      this.presentToast(
        `${patient.full_name} non ha un numero di telefono registrato`,
        'danger',
      );
      return;
    }

    const baseWebhook =
      'https://trigger.macrodroid.com/d8ce5146-3a3d-4523-96af-60eccbfcbca8/sms_pazienti';
    const landingBase = 'https://www.allmedfisio.it/recensione/';

    // Rimuove la data di nascita dal nome: es. "Paolo Zuccaro (30/10/1992)" -> "Paolo Zuccaro"
    const cleanedName = patient.full_name
      .replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)\s*$/, '')
      .trim();

    const encodedName = encodeURIComponent(cleanedName);
    const landingLink = `${landingBase}?n=${encodedName}`;
    const webhookUrl = `${baseWebhook}?nome=${encodedName}&numero=${encodeURIComponent(patient.phone)}&link=${encodeURIComponent(landingLink)}`;

    console.log('Webhook SMS URL:', webhookUrl);
    console.log('Landing link generato:', landingLink);

    try {
      const res = await fetch(webhookUrl, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Webhook ha risposto con status ${res.status}`);
      }

      this.presentToast(`SMS a ${patient.full_name} inviato!`, 'success');

      // segna come inviato per colorare il bottone
      const next = new Set(this.smsSent);
      next.add(patient.id);
      this.smsSent = next;

      // OnPush: forza rilettura del template
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Errore invio SMS:', err);
      this.presentToast(
        `Impossibile inviare SMS a ${patient.full_name}`,
        'danger',
      );
    }
  }

  isSmsSent(patientId: string): boolean {
    return this.smsSent.has(patientId);
  }

  completeCycle(patient: Patient) {
    // Archivia il paziente e registra la data di fine ciclo
    this.patientService.archivePatient(patient.id).subscribe(
      () => {
        this.presentToast(
          `Ciclo completato per ${patient.full_name}`,
          'success',
        );
      },
      (error) => {
        console.error('Errore archiviazione:', error);
        this.presentToast(
          `Errore nell'archiviazione di ${patient.full_name}`,
          'danger',
        );
      },
    );
  }

  // Logout

  logout() {
    this.authService.logout();
  }
}
