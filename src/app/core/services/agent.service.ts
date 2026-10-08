// src/app/core/services/agent.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SimulateurInfo {
  nom: string;
  route: string;
  description: string;
  champsRequis?: string[];
}

export interface ChatResponse {
  message: string;
  suggestedAction?: string;
  actionData?: string;
  simulateurInfo?: SimulateurInfo;
}

export interface ChatRequest {
  message: string;
  userId: number;
  currentRoute?: string;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  private apiUrl = 'http://localhost:8081/api/agent'; // adapte le port si besoin

  constructor(private http: HttpClient) { }

  sendMessage(message: string, userId: number, currentRoute?: string): Observable<ChatResponse> {
    const body: ChatRequest = {
      message,
      userId,
      currentRoute: currentRoute || window.location.pathname
    };
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, body);
  }

  clearSession(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/session/${userId}`);
  }
}
