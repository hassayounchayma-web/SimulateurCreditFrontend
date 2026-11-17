import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ParametrageResponse,
  ParametreMarge,
  ScenarioCode,
  UpdateTmmRequest,
  UpdateMargeRequest
} from '../models/parametrage.model';

@Injectable({
  providedIn: 'root'
})
export class ParametrageService {

  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private readonly http: HttpClient
  ) { }

  getParametrage(): Observable<ParametrageResponse> {
    return this.http.get<ParametrageResponse>(
      `${this.apiBase}/parametrage`
    );
  }

  getMarges(
    scenario?: ScenarioCode
  ): Observable<ParametreMarge[]> {

    return this.http.get<ParametreMarge[]>(
      `${this.apiBase}/parametrage/marges`,
      {
        params: scenario ? { scenario } : {}
      }
    );
  }

  modifierTmm(
    valeur: number
  ): Observable<unknown> {

    const body: UpdateTmmRequest = { valeur };

    return this.http.put(
      `${this.apiBase}/admin/parametrage/tmm`,
      body
    );
  }

  modifierMarge(
    id: number,
    marge: number
  ): Observable<ParametreMarge> {

    const body: UpdateMargeRequest = { marge };

    return this.http.put<ParametreMarge>(
      `${this.apiBase}/admin/parametrage/marges/${id}`,
      body
    );
  }
}
