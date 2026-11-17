import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = 'http://localhost:8081/api/admin';
  constructor(private http: HttpClient, private auth: AuthService) { }

  private headers(): HttpHeaders {
    const token = this.auth.getToken() || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  users(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/users`, { headers: this.headers() });
  }

  simulations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/simulations`, { headers: this.headers() });
  }

  simulation(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/simulations/${id}`, { headers: this.headers() });
  }

  stats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats`, { headers: this.headers() });
  }

  dossiers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dossiers`, { headers: this.headers() });
  }

  dossier(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/dossiers/${id}`, { headers: this.headers() });
  }

  reviewDocument(dossierId: number, documentId: number, statut: string, motif: string, corrections: Record<string, unknown>): Observable<any> {
    return this.http.patch<any>(`${this.base}/dossiers/${dossierId}/documents/${documentId}/review`,
      { statut, motif, corrections }, { headers: this.headers() });
  }

  reanalyzeDocument(dossierId: number, documentId: number): Observable<any> {
    return this.http.post<any>(`${this.base}/dossiers/${dossierId}/documents/${documentId}/reanalyze`, {}, { headers: this.headers() });
  }

  reviewPromoter(dossierId: number, statut: string, motif: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/dossiers/${dossierId}/promoteur-agrement`,
      { statut, motif }, { headers: this.headers() });
  }

  documentFile(dossierId: number, documentId: number): Observable<Blob> {
    return this.http.get(`${this.base}/dossiers/${dossierId}/documents/${documentId}/file`, {
      headers: this.headers(), responseType: 'blob'
    });
  }
}
