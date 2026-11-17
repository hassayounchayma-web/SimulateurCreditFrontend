
import {
  Component,
  ChangeDetectorRef,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize } from 'rxjs/operators';

import {
  ParametrageService
} from '../../../core/services/parametrage.service';

import {
  ParametreMarge,
  ScenarioCode
} from '../../../core/models/parametrage.model';

@Component({
  selector: 'app-parametrage-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './parametrage-admin.component.html',
  styleUrls: ['./parametrage-admin.component.scss']
})
export class ParametrageAdminComponent implements OnInit {

  tmm = 0;
  nouveauTmm: number | null = null;

  marges: ParametreMarge[] = [];

  scenarioFiltre: ScenarioCode | 'TOUS' = 'TOUS';
  recherche = '';

  chargement = false;
  sauvegardeTmm = false;
  sauvegardeMargeId: number | null = null;

  erreur = '';
  messageTmm = '';

  editionTmm = false;
  margeEnEditionId: number | null = null;
  nouvelleMarge: number | null = null;

  readonly scenarios: {
    value: ScenarioCode | 'TOUS';
    label: string;
  }[] = [
      {
        value: 'TOUS',
        label: 'Tous les scénarios'
      },
      {
        value: 'SANS_RACHAT',
        label: 'Sans rachat'
      },
      {
        value: 'RACHAT_INTERNE',
        label: 'Rachat interne'
      },
      {
        value: 'RACHAT_EXTERNE',
        label: 'Rachat externe'
      }
    ];

  constructor(
    private readonly parametrageService: ParametrageService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.chargerParametrage();
  }

  // =====================================================
  // CHARGEMENT
  // =====================================================

  chargerParametrage(): void {
    if (this.chargement) {
      return;
    }

    this.chargement = true;
    this.erreur = '';

    this.parametrageService.getParametrage()
      .pipe(
        finalize(() => {
          this.chargement = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          if (
            !response ||
            !Number.isFinite(response.tmm) ||
            !Array.isArray(response.marges)
          ) {
            this.erreur =
              'La réponse du serveur est invalide.';
            return;
          }

          this.tmm = response.tmm;
          this.marges = response.marges;

          this.annulerEditionTmm();
          this.annulerEditionMarge();

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.erreur = this.messageErreur(err);
          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // FILTRAGE
  // =====================================================

  get margesFiltrees(): ParametreMarge[] {
    const terme = this.recherche.trim().toLowerCase();

    return this.marges.filter(marge => {
      const scenarioCorrespond =
        this.scenarioFiltre === 'TOUS' ||
        marge.scenario === this.scenarioFiltre;

      const rechercheCorrespond =
        !terme ||
        marge.typeCredit.toLowerCase().includes(terme) ||
        this.labelScenario(marge.scenario)
          .toLowerCase()
          .includes(terme);

      return scenarioCorrespond && rechercheCorrespond;
    });
  }

  get nombreProduits(): number {
    return this.marges.length;
  }

  get nombreSansRachat(): number {
    return this.marges.filter(
      m => m.scenario === 'SANS_RACHAT'
    ).length;
  }

  get nombreRachatInterne(): number {
    return this.marges.filter(
      m => m.scenario === 'RACHAT_INTERNE'
    ).length;
  }

  get nombreRachatExterne(): number {
    return this.marges.filter(
      m => m.scenario === 'RACHAT_EXTERNE'
    ).length;
  }

  labelScenario(scenario: ScenarioCode): string {
    switch (scenario) {
      case 'SANS_RACHAT':
        return 'Sans rachat';
      case 'RACHAT_INTERNE':
        return 'Rachat interne';
      case 'RACHAT_EXTERNE':
        return 'Rachat externe';
    }
  }

  // =====================================================
  // MODIFICATION DU TMM
  // =====================================================

  commencerEditionTmm(): void {
    if (this.sauvegardeTmm) {
      return;
    }

    this.editionTmm = true;
    this.nouveauTmm = this.tmm;
    this.messageTmm = '';
  }

  annulerEditionTmm(): void {
    this.editionTmm = false;
    this.nouveauTmm = null;
    this.messageTmm = '';
  }

  get tmmValide(): boolean {
    return (
      this.nouveauTmm !== null &&
      Number.isFinite(Number(this.nouveauTmm)) &&
      Number(this.nouveauTmm) >= 0 &&
      Number(this.nouveauTmm) <= 100
    );
  }

  enregistrerTmm(): void {
    if (!this.tmmValide || this.sauvegardeTmm) {
      return;
    }

    const valeur = Number(this.nouveauTmm);

    if (valeur === this.tmm) {
      this.annulerEditionTmm();
      return;
    }

    const confirmation = window.confirm(
      `Confirmer la modification du TMM de ` +
      `${this.tmm.toFixed(2)} % à ${valeur.toFixed(2)} % ?`
    );

    if (!confirmation) {
      return;
    }

    this.sauvegardeTmm = true;
    this.messageTmm = '';

    this.parametrageService.modifierTmm(valeur)
      .pipe(
        finalize(() => {
          this.sauvegardeTmm = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.tmm = valeur;
          this.annulerEditionTmm();

          this.snackBar.open(
            'TMM modifié avec succès.',
            'Fermer',
            { duration: 4000 }
          );

          // Relecture de la valeur persistée.
          this.chargerParametrage();
        },
        error: (err) => {
          this.messageTmm = this.messageErreur(err);

          this.snackBar.open(
            'Échec de la modification du TMM.',
            'Fermer',
            { duration: 5000 }
          );

          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // MODIFICATION DES MARGES
  // =====================================================

  commencerEditionMarge(marge: ParametreMarge): void {
    if (
      this.sauvegardeMargeId !== null ||
      this.sauvegardeTmm
    ) {
      return;
    }

    this.margeEnEditionId = marge.id;
    this.nouvelleMarge = marge.marge;
  }

  annulerEditionMarge(): void {
    this.margeEnEditionId = null;
    this.nouvelleMarge = null;
  }

  get margeValide(): boolean {
    return (
      this.nouvelleMarge !== null &&
      Number.isFinite(Number(this.nouvelleMarge)) &&
      Number(this.nouvelleMarge) >= 0 &&
      Number(this.nouvelleMarge) <= 100
    );
  }

  enregistrerMarge(marge: ParametreMarge): void {
    if (
      this.margeEnEditionId !== marge.id ||
      !this.margeValide ||
      this.sauvegardeMargeId !== null
    ) {
      return;
    }

    const valeur = Number(this.nouvelleMarge);

    if (valeur === marge.marge) {
      this.annulerEditionMarge();
      return;
    }

    const confirmation = window.confirm(
      `Modifier la marge du produit :\n` +
      `${marge.typeCredit}\n\n` +
      `Scénario : ${this.labelScenario(marge.scenario)}\n` +
      `Ancienne marge : ${marge.marge.toFixed(2)} %\n` +
      `Nouvelle marge : ${valeur.toFixed(2)} %`
    );

    if (!confirmation) {
      return;
    }

    this.sauvegardeMargeId = marge.id;

    this.parametrageService.modifierMarge(
      marge.id,
      valeur
    )
      .pipe(
        finalize(() => {
          this.sauvegardeMargeId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (margeMiseAJour) => {
          this.marges = this.marges.map(item =>
            item.id === marge.id
              ? {
                ...item,
                ...margeMiseAJour,
                marge: margeMiseAJour.marge
              }
              : item
          );

          this.annulerEditionMarge();

          this.snackBar.open(
            'Marge modifiée avec succès.',
            'Fermer',
            { duration: 4000 }
          );

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.snackBar.open(
            this.messageErreur(err),
            'Fermer',
            { duration: 6000 }
          );

          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // AFFICHAGE
  // =====================================================

  tauxAnnuel(marge: ParametreMarge): number {
    return this.tmm + marge.marge;
  }

  trackByMarge(
    index: number,
    marge: ParametreMarge
  ): number {
    return marge.id;
  }

  private messageErreur(err: any): string {
    if (err?.status === 0) {
      return 'Serveur inaccessible. Vérifiez Spring Boot et la connexion réseau.';
    }

    if (err?.status === 401) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }

    if (err?.status === 403) {
      return 'Accès refusé : rôle administrateur requis.';
    }

    if (err?.status === 404) {
      return 'Endpoint de paramétrage introuvable.';
    }

    return (
      err?.error?.message ||
      err?.error?.detail ||
      err?.message ||
      'Une erreur est survenue.'
    );
  }
}
