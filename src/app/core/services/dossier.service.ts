import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Dossier {
  id: number;
  userId: number;
  reference: string;
  libelle: string;
  statut: string;
  simulationJson?: string;
  documentsJson?: string;
  analyseJson?: string;
  checklistJson?: string;
  typeVendeur?: string;
  statutVerificationPromoteur?: string;
  motifVerificationPromoteur?: string;
  revenusSupplementairesDeclares?: boolean;
  createdAt?: string;
}

export interface ChecklistItem {
  code: string;
  libelle: string;
  description: string;
  statut: string;
  obligatoire: boolean;
  actif: boolean;
  depose: boolean;
  genereAutomatiquement: boolean;
  condition?: string | null;
  regle?: string | null;
}

export interface ChecklistAlternativeGroup {
  code: string;
  libelle: string;
  obligatoire: boolean;
  satisfait: boolean;
  documentsAcceptes: string[];
  documentsDeposes: string[];
}

export interface ChecklistResponse {
  produit: string;
  produitCode: string;
  scenario: string;
  typeVendeur: string | null;
  typeVendeurRequis: boolean;
  revenusSupplementairesDeclares: boolean;
  complete: boolean;
  documents: ChecklistItem[];
  groupesAlternatifs: ChecklistAlternativeGroup[];
  documentsManquants: string[];
  reglesEnAttente: Array<{ code: string; statut: string; description: string }>;
}

@Injectable({ providedIn: 'root' })
export class DossierService {
  private readonly baseUrl = 'http://localhost:8081/api/dossiers';

  constructor(private http: HttpClient) { }

  list(): Observable<Dossier[]> {
    return this.http.get<Dossier[]>(this.baseUrl);
  }

  get(id: number): Observable<Dossier> {
    return this.http.get<Dossier>(`${this.baseUrl}/${id}`);
  }

  checklist(simulationJson: string, typeVendeur: string | null, revenusSupplementairesDeclares: boolean): Observable<ChecklistResponse> {
    return this.http.post<ChecklistResponse>(`${this.baseUrl}/checklist`, {
      simulationJson,
      typeVendeur,
      revenusSupplementairesDeclares
    });
  }

  create(
    simulationJson: string,
    documents: Record<string, File | null>,
    typeVendeur: string | null,
    revenusSupplementairesDeclares: boolean
  ): Observable<Dossier> {
    const form = new FormData();
    form.append('simulationJson', simulationJson);
    form.append('consentementTraitementOcr', 'true');
    form.append('revenusSupplementairesDeclares', String(revenusSupplementairesDeclares));
    if (typeVendeur) form.append('typeVendeur', typeVendeur);
    Object.entries(documents).forEach(([type, file]) => {
      if (!file) return;
      form.append('typeDocuments', type);
      form.append('documents', file, file.name);
    });
    return this.http.post<Dossier>(this.baseUrl, form);
  }

  replaceDocument(dossierId: number, typeDocument: string, file: File): Observable<Dossier> {
    const form = new FormData();
    form.append('typeDocument', typeDocument);
    form.append('consentementTraitementOcr', 'true');
    form.append('file', file, file.name);
    return this.http.post<Dossier>(`${this.baseUrl}/${dossierId}/documents`, form);
  }

  reanalyze(dossierId: number): Observable<Dossier> {
    return this.http.post<Dossier>(`${this.baseUrl}/${dossierId}/reanalyze`, {});
  }
}
