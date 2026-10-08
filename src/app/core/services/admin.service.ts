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
}
