// src/app/core/services/simulateur.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SimulateurService {
  // ✅ URL COMPLÈTE (comme dans auth.service.ts)
  private apiUrl = 'http://localhost:8081/api/simulateur';

  constructor(private http: HttpClient) { }

  simulateSansRachat(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sans-rachat`, data).pipe(
      catchError(this.handleError)
    );
  }

  simulateRachatExterne(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rachat-externe`, data).pipe(
      catchError(this.handleError)
    );
  }

  simulateRachatInterne(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rachat-interne`, data).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ [SimulateurService] Erreur:', error);
    let errorMessage = 'Erreur lors du calcul';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.status === 0) {
      errorMessage = 'Serveur indisponible';
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = 'Session expirée, veuillez vous reconnecter';
    }

    return throwError(() => new Error(errorMessage));
  }
}
