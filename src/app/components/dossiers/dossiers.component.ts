import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import { ChecklistResponse, Dossier, DossierService } from '../../core/services/dossier.service';

@Component({
  selector: 'app-dossiers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './dossiers.component.html',
  styleUrls: ['./dossiers.component.scss']
})
export class DossiersComponent implements OnInit {
  dossiers: Dossier[] = [];
  selectedDossier: Dossier | null = null;
  simulationJson = '';
  simulation: any = null;
  checklist: ChecklistResponse | null = null;
  selectedFiles: Record<string, File | null> = {};
  typeVendeur: string | null = null;
  revenusSupplementairesDeclares = false;
  consent = false;
  consentReplace = false;
  loading = false;
  submitting = false;
  replacing = false;
  reanalyzing = false;
  error = '';
  success = '';

  constructor(
    private dossierService: DossierService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const state = typeof window !== 'undefined'
      ? window.history.state as { simulationJson?: string }
      : {};
    if (state?.simulationJson) {
      this.simulationJson = state.simulationJson;
      this.simulation = this.parseJson(state.simulationJson, null);
      this.refreshChecklist();
    }
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = '';
    this.dossierService.list()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (items) => {
          this.dossiers = Array.isArray(items) ? items : [];
          if (this.selectedDossier) {
            this.selectedDossier = this.dossiers.find(d => d.id === this.selectedDossier?.id) ?? null;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.status === 0
            ? 'Le serveur est indisponible.'
            : 'Impossible de charger vos dossiers.';
          this.cdr.detectChanges();
        }
      });
  }

  refreshChecklist(): void {
    if (!this.simulationJson) return;
    this.dossierService.checklist(this.simulationJson, this.typeVendeur, this.revenusSupplementairesDeclares)
      .subscribe({
        next: checklist => {
          this.checklist = checklist;
          this.cdr.detectChanges();
        },
        error: err => {
          this.checklist = null;
          this.error = err.error?.message || 'Impossible de générer la checklist de ce produit.';
          this.cdr.detectChanges();
        }
      });
  }

  onChecklistConditionChanged(): void {
    this.selectedFiles = {};
    this.refreshChecklist();
  }

  onFileSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.error = '';
    if (!file) return;
    if (!this.isValidFile(file)) {
      this.error = this.fileValidationMessage(file);
      input.value = '';
      this.selectedFiles[key] = null;
    } else this.selectedFiles[key] = file;
    this.cdr.detectChanges();
  }

  createDossier(): void {
    if (!this.simulationJson || !this.checklist) {
      this.error = 'La checklist du produit n’est pas disponible.';
      return;
    }
    const missing = this.missingUploads();
    if (missing.length) {
      this.error = `Ajoutez les pièces obligatoires : ${missing.join(', ')}.`;
      return;
    }
    if (this.checklist.typeVendeurRequis && !this.typeVendeur) {
      this.error = 'Sélectionnez le type de vendeur pour ce produit.';
      return;
    }
    if (!this.consent) {
      this.error = 'Confirmez le traitement des documents par le service OCR pour continuer.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';
    this.dossierService.create(
      this.simulationJson,
      this.selectedFiles,
      this.typeVendeur,
      this.revenusSupplementairesDeclares
    )
      .pipe(finalize(() => {
        this.submitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (dossier) => {
          this.selectedDossier = dossier;
          this.success = `Dossier ${dossier.reference} créé.`;
          this.checklist = null;
          this.simulationJson = '';
          this.simulation = null;
          this.selectedFiles = {};
          this.typeVendeur = null;
          this.revenusSupplementairesDeclares = false;
          this.consent = false;
          this.reload();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.error?.message || 'Le dossier n’a pas pu être créé. Réessayez.';
          this.cdr.detectChanges();
        }
      });
  }

  openDossier(dossier: Dossier): void {
    this.dossierService.get(dossier.id).subscribe({
      next: (detail) => {
        this.selectedDossier = detail;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger le détail de ce dossier.';
        this.cdr.detectChanges();
      }
    });
  }

  replaceUploadedDocument(doc: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file || !this.selectedDossier) return;
    if (!this.consentReplace) {
      this.error = 'Confirmez le traitement OCR avant de remplacer une pièce.';
      input.value = '';
      return;
    }
    if (!this.isValidFile(file)) {
      this.error = this.fileValidationMessage(file);
      input.value = '';
      return;
    }
    this.replacing = true;
    this.error = '';
    this.dossierService.replaceDocument(this.selectedDossier.id, doc.type, file)
      .pipe(finalize(() => {
        this.replacing = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: dossier => {
          this.selectedDossier = dossier;
          this.success = `La version ${this.latestVersion(dossier, doc.type)} de ${this.documentLabel(doc.type)} a été analysée.`;
          this.reload();
          this.cdr.detectChanges();
        },
        error: err => {
          this.error = err.error?.message || 'Le remplacement du document a échoué.';
          this.cdr.detectChanges();
        }
      });
    input.value = '';
  }

  reanalyzeDossier(): void {
    if (!this.selectedDossier || this.reanalyzing) return;
    this.reanalyzing = true;
    this.error = '';
    this.success = '';
    this.dossierService.reanalyze(this.selectedDossier.id)
      .pipe(finalize(() => {
        this.reanalyzing = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: dossier => {
          this.selectedDossier = dossier;
          this.success = 'Nouvelle analyse PaddleOCR terminée.';
          this.reload();
        },
        error: err => {
          this.error = err.error?.message || 'La nouvelle analyse OCR a échoué.';
          this.cdr.detectChanges();
        }
      });
  }

  backToSimulation(): void {
    this.router.navigate(['/dashboard/simulation']);
  }

  documents(dossier: Dossier | null): any[] {
    const parsed = this.parseJson(dossier?.documentsJson, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  analysis(dossier: Dossier | null): any {
    return this.parseJson(dossier?.analyseJson, null);
  }

  checklistFor(dossier: Dossier | null): any {
    return this.parseJson(dossier?.checklistJson, null);
  }

  fieldEntries(fields: any): Array<{ key: string; value: any }> {
    if (!fields || typeof fields !== 'object') return [];
    return Object.entries(fields)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({ key, value }));
  }

  fieldLabel(key: string): string {
    const labels: Record<string, string> = {
      cin: 'N° CIN',
      nom: 'Nom',
      prenom: 'Prénom',
      dateNaissance: 'Date de naissance',
      employeur: 'Employeur',
      salaireNet: 'Salaire net lu',
      dateDocument: 'Date du document'
    };
    return labels[key] ?? key;
  }

  documentLabel(type: string): string {
    return ({
      CIN: 'Pièce d’identité',
      BULLETIN_SALAIRE: 'Bulletin de salaire',
      RELEVE_BANCAIRE: 'Relevé bancaire',
      ATTESTATION_SALAIRE_ANNUELLE: 'Attestation annuelle de salaire',
      ATTESTATION_TRAVAIL: 'Attestation de travail',
      JUSTIFICATIF_AUTRES_REVENUS: 'Justificatif d’autres revenus',
      DEMANDE_CREDIT: 'Demande de crédit',
      DEVIS_TRAVAUX: 'Devis des travaux',
      FACTURE_PRO_FORMA: 'Facture pro forma',
      PROMESSE_VENTE: 'Promesse de vente',
      CARTE_GRISE: 'Carte grise',
      JUSTIFICATIF_PROPRIETE: 'Justificatif de propriété',
      TITRE_FONCIER: 'Titre foncier',
      ACTE_NOTARIE: 'Acte notarié',
      PERMIS_BATIR: 'Permis de bâtir',
      DEVIS_ARCHITECTE: 'Devis d’architecte',
      EXPERTISE_IMMOBILIERE: 'Expertise immobilière'
    } as Record<string, string>)[type] ?? type;
  }

  statusLabel(status: string): string {
    return ({
      EN_ATTENTE_VALIDATION: 'En attente de validation documentaire',
      DOCUMENTS_VALIDES: 'Documents validés',
      A_COMPLETER: 'À compléter',
      PRET_POUR_ETUDE: 'En attente de validation documentaire',
      A_VERIFIER: 'Pré-analyse à vérifier',
      INCOMPLET: 'Incomplet',
      ANALYSE_EN_COURS: 'Analyse en cours'
    } as Record<string, string>)[status] ?? status;
  }

  trackById(_index: number, dossier: Dossier): number {
    return dossier.id;
  }

  activeDocuments(dossier: Dossier | null): any[] {
    return this.documents(dossier).filter(doc => doc.actif !== false);
  }

  selectedFileName(code: string): string {
    return this.selectedFiles[code]?.name || '';
  }

  codeId(code: string): string { return code.toLowerCase().replace(/[^a-z0-9-]/g, '-'); }

  isCompleteToSubmit(): boolean {
    return !!this.checklist && this.missingUploads().length === 0 &&
      (!this.checklist.typeVendeurRequis || !!this.typeVendeur);
  }

  groupHasSelectedFile(codes: string[]): boolean {
    return codes.some(code => !!this.selectedFiles[code]);
  }

  activeChecklistItems(checklist: any): any[] {
    return Array.isArray(checklist?.documents) ? checklist.documents.filter((item: any) => item.actif) : [];
  }

  latestVersion(dossier: Dossier, type: string): number {
    return Math.max(0, ...this.documents(dossier).filter(doc => doc.type === type).map(doc => Number(doc.version) || 0));
  }

  private missingUploads(): string[] {
    if (!this.checklist) return [];
    const missing = this.checklist.documents
      .filter(item => item.actif && item.obligatoire && !item.genereAutomatiquement && !this.selectedFiles[item.code])
      .map(item => item.libelle);
    for (const group of this.checklist.groupesAlternatifs) {
      if (group.obligatoire && !this.groupHasSelectedFile(group.documentsAcceptes)) missing.push(group.libelle);
    }
    return missing;
  }

  private isValidFile(file: File): boolean {
    const validType = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
      /\.(pdf|jpe?g|png)$/i.test(file.name);
    return validType && file.size <= 10 * 1024 * 1024;
  }

  private fileValidationMessage(file: File): string {
    const validType = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
      /\.(pdf|jpe?g|png)$/i.test(file.name);
    return !validType ? 'Formats acceptés : PDF, JPG ou PNG.' : 'Chaque document doit faire 10 Mo maximum.';
  }

  private parseJson(value: string | undefined, fallback: any): any {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }
}
