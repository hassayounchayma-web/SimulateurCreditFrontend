
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';

import { ParametrageService } from './parametrage.service';

import {
  ParametrageResponse,
  ScenarioCode
} from '../models/parametrage.model';

export type ScenarioType =
  | 'SANS_RACHAT'
  | 'RACHAT_INTERNE'
  | 'RACHAT_EXTERNE'
  | null;

export type ProjetType =
  | 'PERSONNEL'
  | 'AUTO'
  | 'IMMO'
  | null;

export interface CreditConfig {
  maxMois: number;
  /** Décimal Excel : 0.0225 = 2,25 % */
  marge: number;
}

export interface WizardState {
  salaireMensuelMoyen: number | null;
  /** Loyers bruts saisis ; le calcul applique 50 % */
  loyersDomicilies: number;
  retenuesSed: number;
  retenuesBna: number;
  capitalRestantDu: number;
  scenario: ScenarioType;
  projet: ProjetType;
  typeCredit: string | null;
  duree: number;
  montantDemande: number;
  step: number;
}

// =====================================================
// CLASSIFICATION DES PRODUITS
// =====================================================
//
// Ces listes servent uniquement à classer les produits
// dans les catégories PERSONNEL, AUTO et IMMO.
//
// Les marges et les durées proviennent de MySQL.
// =====================================================

const PROJET_PRODUITS: Record<
  Exclude<ProjetType, null>,
  string[]
> = {

  PERSONNEL: [
    'Crédit Direct Dépenses Courantes',
    'Crédit Direct Aménagement'
  ],

  AUTO: [
    'Crédit Direct Acquisition Véhicule Neuf',
    'Crédit Direct Acquisition Véhicule Occasion'
  ],

  IMMO: [
    'Crédit Direct Aménagement Hypothécaire (Durée ≤ 7 ans)',
    'Crédit Direct Aménagement Hypothécaire (Durée > 7 ans et ≤ 12 ans)',
    'Crédit Direct Acquisition Logement (Durée ≤ 7 ans)',
    'Crédit Direct Acquisition Logement (Durée > 7 ans et ≤ 15 ans)',
    'Crédit Direct Construction (Durée ≤ 7 ans)',
    'Crédit Direct Construction (Durée > 7 ans et ≤ 15 ans)',
    'Crédit Direct Achat Terrain (Durée ≤ 7 ans)',
    'Crédit Direct Achat Terrain (Durée > 7 ans et ≤ 15 ans)'
  ]
};

type CreditGrid = Record<string, CreditConfig>;

type CatalogueDynamique = Record<
  ScenarioCode,
  CreditGrid
>;

@Injectable({
  providedIn: 'root'
})
export class WizardStateService {

  // =====================================================
  // TMM DYNAMIQUE
  // =====================================================

  /**
   * TMM exprimé en décimal.
   *
   * Exemple :
   * 7.49 % -> 0.0749
   *
   * 0 avant le chargement des paramètres.
   */
  TMM = 0;

  private catalogues: CatalogueDynamique = {
    SANS_RACHAT: {},
    RACHAT_INTERNE: {},
    RACHAT_EXTERNE: {}
  };

  private readonly parametrageChargeSubject =
    new BehaviorSubject<boolean>(false);

  readonly parametrageCharge$ =
    this.parametrageChargeSubject.asObservable();

  private readonly chargementSubject =
    new BehaviorSubject<boolean>(false);

  readonly chargement$ =
    this.chargementSubject.asObservable();

  private readonly erreurParametrageSubject =
    new BehaviorSubject<string | null>(null);

  readonly erreurParametrage$ =
    this.erreurParametrageSubject.asObservable();

  get parametrageCharge(): boolean {
    return this.parametrageChargeSubject.value;
  }

  get chargementParametrage(): boolean {
    return this.chargementSubject.value;
  }

  get erreurParametrage(): string | null {
    return this.erreurParametrageSubject.value;
  }

  // =====================================================
  // ETAT INITIAL
  // =====================================================

  private initialState(): WizardState {
    return {
      salaireMensuelMoyen: null,
      loyersDomicilies: 0,
      retenuesSed: 0,
      retenuesBna: 0,
      capitalRestantDu: 0,
      scenario: null,
      projet: null,
      typeCredit: null,
      duree: 0,
      montantDemande: 0,
      step: 1
    };
  }

  private state: WizardState = this.initialState();

  constructor(
    private readonly parametrageService: ParametrageService
  ) { }

  // =====================================================
  // CHARGEMENT DES PARAMETRES
  // =====================================================

  /**
   * GET /api/parametrage
   *
   * Charge le TMM et les marges des trois scénarios.
   */
  chargerParametrage(): Observable<void> {

    this.chargementSubject.next(true);
    this.erreurParametrageSubject.next(null);

    return this.parametrageService.getParametrage().pipe(

      tap(response => {
        this.appliquerParametrage(response);
      }),

      map(() => void 0),

      finalize(() => {
        this.chargementSubject.next(false);
      })
    );
  }

  private appliquerParametrage(
    response: ParametrageResponse
  ): void {

    if (
      !response ||
      typeof response.tmm !== 'number' ||
      !Number.isFinite(response.tmm) ||
      !Array.isArray(response.marges)
    ) {
      this.parametrageChargeSubject.next(false);

      throw new Error(
        'Réponse de paramétrage invalide'
      );
    }

    const nouveauxCatalogues: CatalogueDynamique = {
      SANS_RACHAT: {},
      RACHAT_INTERNE: {},
      RACHAT_EXTERNE: {}
    };

    for (const param of response.marges) {

      if (!this.estScenarioValide(param.scenario)) {
        continue;
      }

      if (
        !param.typeCredit ||
        !Number.isFinite(param.maxMois) ||
        param.maxMois <= 0 ||
        !Number.isFinite(param.marge)
      ) {
        continue;
      }

      nouveauxCatalogues[param.scenario][param.typeCredit] = {
        maxMois: param.maxMois,
        marge: param.marge / 100
      };
    }

    this.TMM = response.tmm / 100;
    this.catalogues = nouveauxCatalogues;

    this.parametrageChargeSubject.next(true);
    this.erreurParametrageSubject.next(null);

    // Vérifier le produit sélectionné après actualisation.

    if (
      this.state.typeCredit &&
      !this.getConfig(this.state.typeCredit)
    ) {
      this.patch({
        typeCredit: null,
        duree: 0,
        montantDemande: 0
      });
    }

    const config = this.getConfig(this.state.typeCredit);

    if (
      config &&
      this.state.duree > config.maxMois
    ) {
      this.patch({
        duree: 0
      });
    }
  }

  private estScenarioValide(
    scenario: string
  ): scenario is ScenarioCode {

    return (
      scenario === 'SANS_RACHAT' ||
      scenario === 'RACHAT_INTERNE' ||
      scenario === 'RACHAT_EXTERNE'
    );
  }

  actualiserParametrage(): Observable<void> {
    return this.chargerParametrage();
  }

  signalerErreurParametrage(
    message: string
  ): void {
    this.erreurParametrageSubject.next(message);
  }

  // =====================================================
  // GESTION DE L'ETAT
  // =====================================================

  get snapshot(): WizardState {
    return { ...this.state };
  }

  patch(p: Partial<WizardState>): void {
    this.state = {
      ...this.state,
      ...p
    };
  }

  reset(): void {
    this.state = this.initialState();
  }

  // =====================================================
  // REVENU NET
  // =====================================================

  /** Revenu net = salaire + 50 % loyers */
  get revenuNet(): number {

    return (
      (this.state.salaireMensuelMoyen ?? 0) +
      (this.state.loyersDomicilies ?? 0) * 0.5
    );
  }

  // =====================================================
  // BAREMES TXEND / GF
  // =====================================================

  /** Sans rachat & rachat interne */
  getTauxEndettement(revenu: number): number {
    if (revenu < 1000) return 0.40;
    if (revenu < 2000) return 0.50;
    if (revenu < 3000) return 0.55;
    if (revenu < 4000) return 0.60;
    return 0.65;
  }

  getGardeFou(salaire: number): number {
    if (salaire < 1000) return 0.50;
    if (salaire < 2000) return 0.60;
    if (salaire < 3000) return 0.65;
    if (salaire < 4000) return 0.70;
    return 0.75;
  }

  /** Rachat externe — null si hors barème Excel */
  getTauxEndettementExterne(
    revenu: number
  ): number | null {

    if (revenu < 1500) return null;
    if (revenu < 2000) return 0.50;
    if (revenu < 3000) return 0.55;
    if (revenu < 4000) return 0.60;
    return 0.65;
  }

  getGardeFouExterne(
    salaire: number
  ): number | null {

    if (salaire < 1500) return null;
    if (salaire < 2000) return 0.60;
    if (salaire < 3000) return 0.65;
    if (salaire < 4000) return 0.70;
    return 0.75;
  }

  // =====================================================
  // CATALOGUE DYNAMIQUE
  // =====================================================

  private grid(): CreditGrid {

    if (this.state.scenario === 'RACHAT_INTERNE') {
      return this.catalogues.RACHAT_INTERNE;
    }

    if (this.state.scenario === 'RACHAT_EXTERNE') {
      return this.catalogues.RACHAT_EXTERNE;
    }

    return this.catalogues.SANS_RACHAT;
  }

  // =====================================================
  // PROJETS DISPONIBLES
  // =====================================================

  getProjets(): {
    key: ProjetType;
    title: string;
    icon: string;
  }[] {

    if (this.state.scenario === 'RACHAT_EXTERNE') {
      return [
        {
          key: 'PERSONNEL',
          title: 'Crédit personnel',
          icon: 'person'
        }
      ];
    }

    return [
      {
        key: 'PERSONNEL',
        title: 'Crédit personnel',
        icon: 'person'
      },
      {
        key: 'AUTO',
        title: 'Crédit auto',
        icon: 'directions_car'
      },
      {
        key: 'IMMO',
        title: 'Crédit immobilier',
        icon: 'home'
      }
    ];
  }

  getProjetsDisponibles() {
    return this.getProjets();
  }

  // =====================================================
  // PRODUITS DISPONIBLES
  // =====================================================

  getProduits(): {
    nom: string;
    maxMois: number;
    marge: number;
    margePct: number;
    icon: string;
  }[] {

    const projet = this.state.projet;

    if (!projet) {
      return [];
    }

    const g = this.grid();

    const icon =
      projet === 'AUTO'
        ? 'directions_car'
        : projet === 'IMMO'
          ? 'home'
          : 'person';

    return (PROJET_PRODUITS[projet] || [])
      .filter(nom => !!g[nom])
      .map(nom => ({
        nom,
        maxMois: g[nom].maxMois,
        marge: g[nom].marge,
        margePct: g[nom].marge * 100,
        icon
      }));
  }

  getProduitsDisponibles() {
    return this.getProduits();
  }

  // =====================================================
  // CONFIGURATION DU PRODUIT
  // =====================================================

  getConfig(
    typeCredit: string | null
  ): CreditConfig | null {

    if (!typeCredit) {
      return null;
    }

    return this.grid()[typeCredit] ?? null;
  }

  getConfigProduit(
    typeCredit: string | null
  ): CreditConfig | null {

    return this.getConfig(typeCredit);
  }

  // =====================================================
  // TAUX ANNUEL DYNAMIQUE
  // =====================================================

  /**
   * Taux annuel en pourcentage.
   *
   * Exemple :
   * TMM = 7.49 %
   * Marge = 3.50 %
   * Taux annuel = 10.99 %
   */
  getTauxAnnuelPct(
    typeCredit: string | null
  ): number {

    if (!this.parametrageCharge) {
      return 0;
    }

    const config = this.getConfig(typeCredit);

    if (!config) {
      return 0;
    }

    return (this.TMM + config.marge) * 100;
  }

  // =====================================================
  // URL API SIMULATION
  // =====================================================

  apiUrl(): string {

    const base = 'http://localhost:8081/api/simulateur';

    if (this.state.scenario === 'RACHAT_INTERNE') {
      return `${base}/rachat-interne`;
    }

    if (this.state.scenario === 'RACHAT_EXTERNE') {
      return `${base}/rachat-externe`;
    }

    return `${base}/sans-rachat`;
  }
}
