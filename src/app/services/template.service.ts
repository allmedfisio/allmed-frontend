import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface TicketTemplate {
  headerText: string;
  headerImageUrl: string;
  promoHtml: string;
  footerText: string;
  styleJson: {
    primaryColor: string;
  };
}

@Injectable({ providedIn: 'root' })
export class TemplateService {
  //private readonly docPath = 'ticketTemplates/default';
  private base = `${environment.apiUrl}/ticket`;
  constructor(private http: HttpClient) {}

  getTemplate(): Observable<TicketTemplate> {
    return this.http.get<TicketTemplate>(this.base);
  }

  updateTemplate(data: Partial<TicketTemplate>): Observable<TicketTemplate> {
    return this.http.put<TicketTemplate>(this.base, data);
  }

  /** Carica l’immagine sul backend Express e ritorna l’URL pubblico */
  uploadPromoImage(file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<{ url: string }>(
      `${environment.apiUrl}/ticket/promo-image`,
      form
    );
  }
}
