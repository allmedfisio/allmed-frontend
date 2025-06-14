import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  runInInjectionContext,
} from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AddPatientModalComponent } from 'src/app/add-patient-modal/add-patient-modal.component';
import { AddDoctorModalComponent } from 'src/app/add-doctor-modal/add-doctor-modal.component';
import { EditPatientModalComponent } from 'src/app/edit-patient-modal/edit-patient-modal.component';
import { Patient, PatientService } from 'src/app/services/patient.service';
import { Observable, take, firstValueFrom, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Doctor, DoctorService } from 'src/app/services/doctor.service';
import { AuthService, UserProfile } from 'src/app/services/auth.service';
import {
  TemplateService,
  TicketTemplate,
} from 'src/app/services/template.service';

interface PatientGroup {
  study: number;
  patients: Patient[];
}

interface DoctorGroup {
  study: number;
  doctors: Doctor[];
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
    waiting: { study: number; patients: Patient[] }[];
    inVisit: { study: number; patients: Patient[] }[];
  }>;
  doctorsByStudy$!: Observable<DoctorGroup[]>;

  // memorizzo qui il template, così non userò mai più getTemplate() a runtime
  ticketTpl!: TicketTemplate;
  private tplSub?: Subscription;

  // Campi per le modali
  fullName: string = '';
  assignedStudy: number | null = null;
  doctorName: string = '';
  doctorStudy: number = NaN;

  // Dati dell'user -> Da modificare
  userName: string = 'Nome Utente';
  userImage: string = 'path-to-image.jpg';

  constructor(
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private authService: AuthService,
    private tplService: TemplateService,
    private injector: Injector
  ) {}

  ngOnInit() {
    // Sottoscrivi (via async pipe) al profilo
    this.userProfile$ = this.authService.profile$;

    // Divide i pazienti in base allo status
    this.patientsByStatus$ = this.patientService.patients$.pipe(
      map((list) => this.groupByStatus(list))
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

  // Funzioni di Doctor

  addDoctor() {
    if (!this.doctorName || isNaN(this.doctorStudy)) return;
    this.doctorService
      .addDoctor(this.doctorName, this.doctorStudy)
      .subscribe(() => {
        this.doctorName = '';
        this.doctorStudy = NaN;
      });
  }

  removeDoctor(id: string) {
    this.doctorService.removeDoctor(id).subscribe();
  }

  // ========== Grouping Helpers ==========

  private groupByStatus(list: Patient[]): {
    waiting: PatientGroup[];
    inVisit: PatientGroup[];
  } {
    const byStatus = (status: Patient['status']) => {
      // Filtro per status
      let slice = list.filter((p) => p.status === status);

      // Ordino per appointment_time crescente
      slice = slice.sort((a, b) =>
        a.appointment_time.localeCompare(b.appointment_time)
      );

      // Raggruppo per studio
      const studies = Array.from(
        new Set(slice.map((p) => p.assigned_study))
      ).sort((a, b) => a - b);
      return studies.map((study) => ({
        study,
        patients: slice.filter((p) => p.assigned_study === study),
      }));
    };
    return { waiting: byStatus('in_attesa'), inVisit: byStatus('in_visita') };
  }

  private groupByStudy(list: Doctor[]) {
    const studies = Array.from(new Set(list.map((d) => d.study)));
    return studies.map((study) => ({
      study,
      doctors: list.filter((d) => d.study === study),
    }));
  }

  // ========== trackBy ==========

  trackByStudy(index: number, group: { study: number }) {
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
    const modal = await this.modalController.create({
      component: EditPatientModalComponent,
      cssClass: 'custom-modal',
      componentProps: {
        patientData: patient,
      },
    });
    return await modal.present();
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
      font-size: 1.5rem;
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
      <div class="queue">#${num}</div>
      <p class="queue">Studio assegnato</p>
      <div class="queue">#${studio}</div>
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
