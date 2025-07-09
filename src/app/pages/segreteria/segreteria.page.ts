import {
  ChangeDetectionStrategy,
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
import { map, tap } from 'rxjs/operators';
import { Doctor, DoctorService } from 'src/app/services/doctor.service';
import { AuthService, UserProfile } from 'src/app/services/auth.service';
import {
  TemplateService,
  TicketTemplate,
} from 'src/app/services/template.service';
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
    booked: { study: number | string; patients: Patient[] }[];
    waiting: { study: number | string; patients: Patient[] }[];
    inVisit: { study: number | string; patients: Patient[] }[];
    bookedByDate: DateGroup[];
  }>;
  doctorsByStudy$!: Observable<DoctorGroup[]>;

  // Filtro data per i prenotati
  filterDatePrenotati: string = new Date().toISOString().split('T')[0];
  private filterDatePrenotati$ = new BehaviorSubject<string>(
    this.filterDatePrenotati
  );
  segment: 'in_attesa' | 'prenotato' = 'in_attesa';

  // memorizzo qui il template, così non userò mai più getTemplate() a runtime
  ticketTpl!: TicketTemplate;
  private tplSub?: Subscription;

  // Campi per le modali
  fullName: string = '';
  assignedStudy: number | null = null;
  doctorName: string = '';
  doctorStudy: number = NaN;

  // File per upload excel
  file: File | null = null;

  // Dati dell'user -> Da modificare
  userName: string = 'Nome Utente';
  userImage: string = 'path-to-image.jpg';

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
    private injector: Injector
  ) {}

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
      this.filterDatePrenotati$.asObservable(),
    ]).pipe(
      map(([list, filterDate]) => {
        // 1) ottieni i tre gruppi base
        const { waiting, inVisit, booked } = this.groupByStatus(
          list,
          filterDate
        );

        // 2) se non c’è filtro data, costruiamo bookedByDate
        let bookedByDate: { date: string; groups: PatientGroup[] }[] = [];
        if (!filterDate) {
          // estrai le date uniche dai prenotati
          const prenotatiAll = list.filter((p) => p.status === 'prenotato');
          const dates = Array.from(
            new Set(prenotatiAll.map((p) => p.appointment_time.split('T')[0]))
          ).sort();
          bookedByDate = dates.map((date) => {
            // raggruppa per studio i prenotati di quel giorno
            const slice = prenotatiAll.filter((p) =>
              p.appointment_time.startsWith(date)
            );
            return {
              date,
              groups: this.groupByStatus(slice, date).booked,
            };
          });
        }

        // 3) ritorno l’oggetto con tutte e quattro le proprietà
        return { waiting, inVisit, booked, bookedByDate };
      })
    );

    // Carica i medici attivi solo una volta
    this.doctorsByStudy$ = this.doctorService.doctors$.pipe(
      tap((list) => console.log('SegreteriaPage: nuovi medici ricevuti', list)),
      map((list) => this.groupByStudy(list))
    );

    // Precarico il template del ticket
    runInInjectionContext(this.injector, () => {
      this.tplSub = this.tplService.getTemplate().subscribe((tpl) => {
        this.ticketTpl = tpl;
      });
    });
  }

  ngOnDestroy() {
    this.tplSub?.unsubscribe();
  }

  // Funzioni di Patient

  removePatient(patientId: string) {
    this.patientService.removePatient(patientId).subscribe();
  }

  async callPatient(patient: Patient): Promise<void> {
    // Preleva lista dei gruppi di medici
    const groups = await firstValueFrom(this.doctorsByStudy$);
    // Cerca il gruppo giusto e il primo medico
    const group = groups.find((g) => g.study === patient.assigned_study);
    const doc = group?.doctors[0];

    if (!doc) {
      this.presentToast(
        `Nessun medico per lo studio ${patient.assigned_study}`,
        'danger'
      );
      return;
    }

    try {
      // Esiste: chiamiamo il paziente
      await firstValueFrom(
        this.patientService.callPatient(patient.id).pipe(take(1))
      );
      // Aggiorna il paziente in visita del medico
      await firstValueFrom(
        this.doctorService
          .updateLastPatient(doc.id, patient.full_name)
          .pipe(take(1))
      );
      this.presentToast(
        `Paziente ${patient.full_name} chiamato dallo studio ${patient.assigned_study}`,
        'success'
      );
    } catch (err: any) {
      this.presentToast(`Errore: ${err.message}`, 'danger');
    }
  }

  async patientArrived(patient: Patient): Promise<void> {
    try {
      await firstValueFrom(
        this.patientService.markArrived(patient.id).pipe(take(1))
      );
      this.presentToast(`Paziente passato in attesa`, 'success');
    } catch (err: any) {
      this.presentToast(`Errore: ${err.message}`, 'danger');
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
      const idxRoom = headers.indexOf('Stanza');
      if (idxDate < 0 || idxName < 0 || idxRoom < 0) {
        console.error('Colonne mancanti:', headers);
        throw new Error(
          'Assicurati che gli header siano esattamente "Data Ora", "Paziente", "Stanza"'
        );
      }

      // Filtra e mappa i pazienti
      const dataRows = rows
        .slice(1)
        // rimuovo righe incomplete
        .filter((r) => r[idxDate] != null && r[idxName] && r[idxRoom]);

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

        // Parsing room: numeric or text (Studio X or Palestra)
        const rawRoom = String(r[idxRoom]).trim();
        const match = rawRoom.match(/\d+/);
        // Se match esiste (es. “Studio 4”), uso il numero
        // Altrimenti (es. “Palestra”), mantengo tutta la stringa
        const assignedStudy = match ? Number(match[0]) : rawRoom;

        // Camel Case nome
        const rawName = String(r[idxName]).trim();
        const full_name = this.toCamelCase(rawName);

        // crea una ISO senza 'Z', es. "2025-06-11T18:30:00"
        const localIso = dt.toISOString().slice(0, 19);

        return {
          full_name,
          assigned_study: assignedStudy,
          appointment_time: localIso,
        };
      });

      if (!patients.length) {
        console.warn('Nessun paziente valido trovato.');
        return;
      }

      // Invio al backend
      this.patientService.bulkCreate(patients).toPromise();

      // Success toast
      const toast = await this.toastCtrl.create({
        message: 'Import dei pazienti riuscito!',
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      this.file = null;
    } catch (err: any) {
      console.error(err);
      const toast = await this.toastCtrl.create({
        message: 'Errore import: ' + err.message,
        duration: 3000,
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
    filterDatePrenotati: string
  ): {
    booked: PatientGroup[];
    waiting: PatientGroup[];
    inVisit: PatientGroup[];
  } {
    // Data odierna
    const todayStr = new Date().toISOString().split('T')[0];

    const byStatus = (status: Patient['status']) => {
      // Filtro per status
      let slice = list.filter((p) => p.status === status);

      // applichiamo il filtro “oggi” su in_attesa
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
        a.appointment_time.localeCompare(b.appointment_time)
      );

      // Raggruppo per studio
      const studies = Array.from(
        new Set(slice.map((p) => p.assigned_study))
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
        patients: slice.filter((p) => p.assigned_study === study),
      }));
    };
    return {
      booked: byStatus('prenotato'),
      waiting: byStatus('in_attesa'),
      inVisit: byStatus('in_visita'),
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
  private groupByStudyStatus(
    list: Patient[],
    dateFilter?: string
  ): PatientGroup[] {
    let slice = dateFilter
      ? list.filter((p) => p.appointment_time.startsWith(dateFilter))
      : [...list];
    // ordino per appointment_time
    slice.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    // raggruppo per studio (riusa la logica del tuo groupByStatus)
    const studies = Array.from(
      new Set(slice.map((p) => p.assigned_study))
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
    const studio = patient.assigned_study;

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

  // Logout

  logout() {
    this.authService.logout();
  }
}
