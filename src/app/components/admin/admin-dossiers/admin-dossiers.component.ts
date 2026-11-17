import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dossiers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dossiers.component.html',
  styleUrls: ['./admin-dossiers.component.scss']
})
export class AdminDossiersComponent implements OnInit {
  dossiers: any[] = [];
  selected: any = null;
  details: any = null;
  loading = false;
  busyDocumentId: number | null = null;
  error = '';
  message = '';
  motif = '';
  correctionsJson = '{}';
  promoterNote = '';

  constructor(private admin: AdminService) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.admin.dossiers().pipe(finalize(() => this.loading = false)).subscribe({
      next: items => this.dossiers = items ?? [],
      error: err => this.error = this.requestError(err, 'Impossible de charger les dossiers.')
    });
  }

  open(dossier: any): void {
    this.selected = dossier;
    this.details = null;
    this.motif = '';
    this.message = '';
    this.admin.dossier(dossier.id).subscribe({
      next: details => this.details = details,
      error: err => this.error = this.requestError(err, 'Impossible de charger le détail du dossier.')
    });
  }

  documents(): any[] { return this.details?.documents ?? []; }

  label(type: string): string {
    return ({
      CIN: 'CIN', BULLETIN_SALAIRE: 'Bulletin de salaire', RELEVE_BANCAIRE: 'Relevé bancaire',
      DEVIS_TRAVAUX: 'Devis des travaux', FACTURE_PRO_FORMA: 'Facture pro forma',
      PROMESSE_VENTE: 'Promesse de vente', CARTE_GRISE: 'Carte grise',
      JUSTIFICATIF_PROPRIETE: 'Justificatif de propriété', TITRE_FONCIER: 'Titre foncier',
      ACTE_NOTARIE: 'Acte notarié', PERMIS_BATIR: 'Permis de bâtir', DEVIS_ARCHITECTE: 'Devis d’architecte',
      EXPERTISE_IMMOBILIERE: 'Expertise immobilière', JUSTIFICATIF_AUTRES_REVENUS: 'Justificatif d’autres revenus',
      ATTESTATION_TRAVAIL: 'Attestation de travail', ATTESTATION_SALAIRE_ANNUELLE: 'Attestation annuelle de salaire'
    } as Record<string, string>)[type] ?? type;
  }

  fields(doc: any): Array<{ key: string; value: unknown }> {
    const fields = doc?.correctionsAdmin && Object.keys(doc.correctionsAdmin).length
      ? doc.correctionsAdmin : doc?.champs;
    if (!fields || typeof fields !== 'object') return [];
    return Object.entries(fields).map(([key, value]) => ({ key, value }));
  }

  openOriginal(doc: any): void {
    this.admin.documentFile(this.selected.id, doc.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.nomFichier || 'document';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.error = 'Le fichier original est introuvable.'
    });
  }

  review(doc: any, statut: 'VALIDE' | 'REJETE' | 'REMPLACEMENT_DEMANDE'): void {
    if ((statut === 'REJETE' || statut === 'REMPLACEMENT_DEMANDE') && !this.motif.trim()) {
      this.error = 'Un motif est obligatoire pour rejeter ou remplacer une pièce.';
      return;
    }
    let corrections: Record<string, unknown>;
    try {
      corrections = JSON.parse(this.correctionsJson || '{}');
      if (!corrections || Array.isArray(corrections) || typeof corrections !== 'object') throw new Error();
    } catch {
      this.error = 'Les corrections doivent être un objet JSON valide.';
      return;
    }
    this.busyDocumentId = doc.id;
    this.error = '';
    this.message = '';
    this.admin.reviewDocument(this.selected.id, doc.id, statut, this.motif, corrections)
      .pipe(finalize(() => this.busyDocumentId = null))
      .subscribe({
        next: result => {
          this.message = result.note || 'La validation documentaire a été enregistrée.';
          this.open(this.selected);
          this.load();
        },
        error: err => this.error = err.error?.message || 'La validation n’a pas pu être enregistrée.'
      });
  }

  reanalyze(doc: any): void {
    this.busyDocumentId = doc.id;
    this.admin.reanalyzeDocument(this.selected.id, doc.id)
      .pipe(finalize(() => this.busyDocumentId = null))
      .subscribe({
        next: details => { this.details = details; this.message = 'Nouvelle analyse PaddleOCR terminée.'; this.load(); },
        error: err => this.error = err.error?.message || 'La nouvelle analyse OCR a échoué.'
      });
  }

  reviewPromoter(statut: 'VERIFIE' | 'NON_VERIFIE' | 'A_VERIFIER'): void {
    if (statut !== 'A_VERIFIER' && !this.promoterNote.trim()) {
      this.error = 'Ajoutez une note indiquant comment l’agrément a été vérifié.';
      return;
    }
    this.admin.reviewPromoter(this.selected.id, statut, this.promoterNote)
      .subscribe({
        next: () => {
          this.message = 'Le contrôle manuel de l’agrément a été enregistré.';
          this.open(this.selected);
          this.load();
        },
        error: err => this.error = err.error?.message || 'Le contrôle n’a pas pu être enregistré.'
      });
  }

  statusLabel(status: string): string {
    return ({
      EN_ATTENTE_VALIDATION: 'En attente', DOCUMENTS_VALIDES: 'Documents validés', A_COMPLETER: 'À compléter',
      EN_ATTENTE_VERIFICATION_AGREMENT: 'Vérification promoteur attendue',
      AGREMENT_A_VERIFIER_MANUELLEMENT: 'Agrément à vérifier manuellement'
    } as Record<string, string>)[status] ?? status;
  }

  private requestError(err: any, fallback: string): string {
    if (err?.status === 401) return 'Votre session a expiré. Connectez-vous à nouveau avec un compte administrateur.';
    if (err?.status === 403) return 'Ce compte est client et ne dispose pas des droits administrateur.';
    if (err?.status === 0) return 'Le serveur API est indisponible sur le port 8081.';
    return err?.error?.message || fallback;
  }
}
