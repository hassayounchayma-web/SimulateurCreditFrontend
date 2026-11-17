// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8081/api/auth';
  private tokenKey = 'auth_token';
  private userKey = 'current_user';

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  register(userData: any): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/register`, userData, {
        responseType: 'text'
      })
      .pipe(catchError(this.handleError));
  }

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, {
        username: credentials.username,
        password: credentials.password
      })
      .pipe(
        tap((response) => {

          const token =
            response?.token ||
            response?.accessToken ||
            response?.jwt;

          if (token) {
            localStorage.setItem(this.tokenKey, token);
            console.log('✅ Token sauvé sous', this.tokenKey);
          } else {
            console.warn('⚠️ Pas de token dans la réponse');
          }

          const userId =
            response?.id ??
            response?.userId ??
            response?.user?.id;

          if (userId != null) {
            localStorage.setItem('userId', String(userId));
          }

          // Rôle normalisé : ADMIN | CLIENT (sans préfixe ROLE_)
          const role = this.normalizeRole(response?.role);
          localStorage.setItem('role', role);

          if (response?.email) {
            localStorage.setItem('email', response.email);
          }

          const user = {
            id: userId,
            email: response?.email ?? null,
            role,
            nom: response?.nom ?? null,
            prenom: response?.prenom ?? null
          };
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUserSubject.next(user);
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('token'); // ancienne clé éventuelle
    this.currentUserSubject.next(null);
    console.log('🚪 [AuthService] Déconnexion');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /** Rôle courant : ADMIN ou CLIENT */
  getRole(): string {
    const fromStorage = localStorage.getItem('role');
    if (fromStorage) {
      return this.normalizeRole(fromStorage);
    }
    const user = this.getCurrentUser();
    return this.normalizeRole(user?.role);
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  getCurrentUser(): any {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  getUserId(): number | null {
    const id = localStorage.getItem('userId');
    return id ? Number(id) : null;
  }

  private normalizeRole(role: any): string {
    if (role == null || String(role).trim() === '') {
      return 'CLIENT';
    }
    let r = String(role).trim().toUpperCase();
    if (r.startsWith('ROLE_')) {
      r = r.substring(5);
    }
    return r === 'ADMIN' ? 'ADMIN' : 'CLIENT';
  }

  private loadSession(): void {
    const token = this.getToken();
    const user = this.getCurrentUser();
    if (token && user) {
      // resynchronise role en storage
      if (user.role) {
        localStorage.setItem('role', this.normalizeRole(user.role));
      }
      this.currentUserSubject.next(user);
      console.log('🔄 [AuthService] Session chargée');
    }
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ [AuthService] Erreur:', error);
    let msg = 'Une erreur est survenue';
    if (error.error?.message) msg = error.error.message;
    else if (typeof error.error === 'string') msg = error.error;
    else if (error.status === 401) msg = 'Identifiants incorrects';
    else if (error.status === 403) msg = 'Accès non autorisé';
    else if (error.status === 0) msg = 'Serveur indisponible';
    return throwError(() => new Error(msg));
  }
}
