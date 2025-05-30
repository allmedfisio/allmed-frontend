import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Patient, PatientService } from '../../services/patient.service';
import { Subscription, take } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-medico',
  templateUrl: './medico.page.html',
  styleUrls: ['./medico.page.scss'],
  standalone: false,
})
export class MedicoPage implements OnInit, OnDestroy {
  patients: Patient[] = [];
  myStudyId!: number;
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private patientService: PatientService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    //Recupera lo studio dalla route: /medico/:id
    this.myStudyId = Number(this.route.snapshot.paramMap.get('id'));

    // Unisciti alla stanza dello studio:
    this.patientService.socket.emit('joinStudio', String(this.myStudyId));

    // subscribe allo stream push e filtra per lo studio
    this.sub = this.patientService.patients$.subscribe((list) => {
      // aggiorna solo il tuo currentPatient
      this.patients = list.filter((p) => p.assigned_study === this.myStudyId);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  callPatient(patientId: string) {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    this.http
      .put(
        `${environment.apiUrl}/patients/${patientId}/call`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .pipe(take(1))
      .subscribe(() => {
        // il socket notifica il service, e la UI si aggiorna da sola
      });
  }
}
