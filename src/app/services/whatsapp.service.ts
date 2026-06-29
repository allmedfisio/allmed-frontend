import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface WhatsAppSendResponse {
  success: boolean;
  patientName?: string;
  chatId?: string;
  messageId?: string | null;
  trackingId?: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Invia un messaggio WhatsApp a un paziente */
  sendMessage(
    patientName: string,
    phoneNumber: string,
    landingLink?: string,
    patientId?: string,
  ): Observable<WhatsAppSendResponse> {
    return this.http.post<WhatsAppSendResponse>(
      `${this.baseUrl}/whatsapp/send`,
      {
        phoneNumber,
        patientName,
        landingLink: landingLink || '',
        patientId: patientId || '',
      },
    );
  }

  /** Verifica lo stato della connessione WhatsApp */
  getStatus(): Observable<{
    connected: boolean;
    reason?: string;
    session?: any;
    error?: string;
  }> {
    return this.http.get<{ connected: boolean }>(
      `${this.baseUrl}/whatsapp/status`,
    );
  }
}
