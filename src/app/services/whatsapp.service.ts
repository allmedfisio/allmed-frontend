import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Invia un messaggio WhatsApp a un paziente */
  sendMessage(
    patientName: string,
    phoneNumber: string,
    landingLink?: string,
  ): Observable<{
    success: boolean;
    patientName?: string;
    chatId?: string;
    messageId?: string | null;
  }> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/whatsapp/send`,
      {
        phoneNumber,
        patientName,
        landingLink: landingLink || '',
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
