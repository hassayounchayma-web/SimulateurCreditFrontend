import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface SimulationHistory {
  id: number;
  typeSimulateur: string;
  libelle: string;
  inputsJson?: string;
  resultJson?: string;
  montantDemande?: number;
  mensualite?: number;
  montantMax?: number;
  dureeMois?: number;
  tauxEndettement?: number;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private base = 'http://localhost:8081/api/history';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) { }

  private headers(): HttpHeaders {
    // UNE seule clé token : celle utilisée par AuthService
    const token =
      this.auth.getToken() ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');

    const userId =
      this.auth.getUserId?.() ??
      localStorage.getItem('userId') ??
      '1';

    let h = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User-Id': String(userId)
    });

    if (token) {
      h = h.set('Authorization', `Bearer ${token}`);
    }

    return h;
  }

  save(payload: {
    typeSimulateur: string;
    libelle: string;
    inputsJson: string;
    resultJson: string;
    montantDemande?: number;
    mensualite?: number;
    montantMax?: number;
    dureeMois?: number;
    tauxEndettement?: number;
  }): Observable<SimulationHistory> {
    console.log('📤 [History] SAVE', payload);
    return this.http.post<SimulationHistory>(this.base, payload, {
      headers: this.headers()
    });
  }

  list(): Observable<SimulationHistory[]> {
    console.log('📥 [History] LIST userId=', localStorage.getItem('userId'));
    return this.http.get<SimulationHistory[]>(this.base, {
      headers: this.headers()
    });
  }

  compare(ids: number[]): Observable<SimulationHistory[]> {
    return this.http.post<SimulationHistory[]>(
      `${this.base}/compare`,
      { ids },
      { headers: this.headers() }
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`, {
      headers: this.headers()
    });
  }
}
