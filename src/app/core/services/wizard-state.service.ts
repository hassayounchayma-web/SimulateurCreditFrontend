import { Injectable } from '@angular/core';

export type ScenarioType = 'SANS_RACHAT' | 'RACHAT_INTERNE' | 'RACHAT_EXTERNE' | null;
export type ProjetType = 'PERSONNEL' | 'AUTO' | 'IMMO' | null;

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

const SANS_RACHAT: Record<string, CreditConfig> = {
  'Crédit Direct Dépenses Courantes': { maxMois: 36, marge: 0.0225 },
  'Crédit Direct Aménagement': { maxMois: 60, marge: 0.025 },
  'Crédit Direct Acquisition Véhicule Neuf': { maxMois: 84, marge: 0.02 },
  'Crédit Direct Acquisition Véhicule Occasion': { maxMois: 60, marge: 0.02 },
  'Crédit Direct Aménagement Hypothécaire (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.02 },
  'Crédit Direct Aménagement Hypothécaire (Durée > 7 ans et ≤ 12 ans)': { maxMois: 144, marge: 0.0225 },
  'Crédit Direct Acquisition Logement (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.02 },
  'Crédit Direct Acquisition Logement (Durée > 7 ans et ≤ 15 ans)': { maxMois: 180, marge: 0.0225 },
  'Crédit Direct Construction (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.02 },
  'Crédit Direct Construction (Durée > 7 ans et ≤ 15 ans)': { maxMois: 180, marge: 0.0225 },
  'Crédit Direct Achat Terrain (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.02 },
  'Crédit Direct Achat Terrain (Durée > 7 ans et ≤ 15 ans)': { maxMois: 180, marge: 0.0225 }
};

const RACHAT_INTERNE: Record<string, CreditConfig> = {
  'Crédit Direct Dépenses Courantes': { maxMois: 36, marge: 0.035 },
  'Crédit Direct Aménagement': { maxMois: 60, marge: 0.0375 },
  'Crédit Direct Acquisition Véhicule Neuf': { maxMois: 84, marge: 0.03 },
  'Crédit Direct Acquisition Véhicule Occasion': { maxMois: 60, marge: 0.03 },
  'Crédit Direct Aménagement Hypothécaire (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.03 },
  'Crédit Direct Aménagement Hypothécaire (Durée > 7 ans et ≤ 12 ans)': { maxMois: 144, marge: 0.0325 },
  'Crédit Direct Acquisition Logement (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.03 },
  'Crédit Direct Acquisition Logement (Durée > 7 ans et ≤ 15 ans)': { maxMois: 180, marge: 0.0325 },
  'Crédit Direct Construction (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.03 },
  'Crédit Direct Construction (Durée > 7 ans et ≤ 15 ans)': { maxMois: 180, marge: 0.0325 },
  'Crédit Direct Achat Terrain (Durée ≤ 7 ans)': { maxMois: 84, marge: 0.03 },
  'Crédit Direct Achat Terrain (Durée > 7 ans et ≤ 15 ans)': { maxMois: 180, marge: 0.0325 }
};

const RACHAT_EXTERNE: Record<string, CreditConfig> = {
  'Crédit Direct Dépenses Courantes': { maxMois: 36, marge: 0.0225 },
  'Crédit Direct Aménagement': { maxMois: 60, marge: 0.025 }
};

const PROJET_PRODUITS: Record<Exclude<ProjetType, null>, string[]> = {
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

@Injectable({ providedIn: 'root' })
export class WizardStateService {

  /** TMM Excel = 7,49 % (décimal) */
  readonly TMM = 0.0749;

  private state: WizardState = {
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

  get snapshot(): WizardState {
    return { ...this.state };
  }

  patch(p: Partial<WizardState>): void {
    this.state = { ...this.state, ...p };
  }

  reset(): void {
    this.state = {
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

  /** Revenu net = salaire + 50 % loyers */
  get revenuNet(): number {
    return (this.state.salaireMensuelMoyen ?? 0) + (this.state.loyersDomicilies ?? 0) * 0.5;
  }

  // ---------- Barèmes TxEnd / GF ----------

  /** Sans rachat & rachat interne — décimal */
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
  getTauxEndettementExterne(revenu: number): number | null {
    if (revenu < 1500) return null;
    if (revenu < 2000) return 0.50;
    if (revenu < 3000) return 0.55;
    if (revenu < 4000) return 0.60;
    return 0.65;
  }

  getGardeFouExterne(salaire: number): number | null {
    if (salaire < 1500) return null;
    if (salaire < 2000) return 0.60;
    if (salaire < 3000) return 0.65;
    if (salaire < 4000) return 0.70;
    return 0.75;
  }

  // ---------- Produits / projets ----------

  private grid(): Record<string, CreditConfig> {
    if (this.state.scenario === 'RACHAT_INTERNE') return RACHAT_INTERNE;
    if (this.state.scenario === 'RACHAT_EXTERNE') return RACHAT_EXTERNE;
    return SANS_RACHAT;
  }

  getProjets(): { key: ProjetType; title: string; icon: string }[] {
    if (this.state.scenario === 'RACHAT_EXTERNE') {
      return [{ key: 'PERSONNEL', title: 'Crédit personnel', icon: 'person' }];
    }
    return [
      { key: 'PERSONNEL', title: 'Crédit personnel', icon: 'person' },
      { key: 'AUTO', title: 'Crédit auto', icon: 'directions_car' },
      { key: 'IMMO', title: 'Crédit immobilier', icon: 'home' }
    ];
  }

  getProjetsDisponibles() {
    return this.getProjets();
  }

  getProduits(): {
    nom: string;
    maxMois: number;
    marge: number;
    margePct: number;
    icon: string;
  }[] {
    const projet = this.state.projet;
    if (!projet) return [];

    const g = this.grid();
    const icon =
      projet === 'AUTO' ? 'directions_car' :
        projet === 'IMMO' ? 'home' : 'person';

    return (PROJET_PRODUITS[projet] || [])
      .filter(n => !!g[n])
      .map(n => ({
        nom: n,
        maxMois: g[n].maxMois,
        marge: g[n].marge,
        margePct: g[n].marge * 100,
        icon
      }));
  }

  getProduitsDisponibles() {
    return this.getProduits();
  }

  getConfig(typeCredit: string | null): CreditConfig | null {
    if (!typeCredit) return null;
    return this.grid()[typeCredit] ?? null;
  }

  getConfigProduit(typeCredit: string | null): CreditConfig | null {
    return this.getConfig(typeCredit);
  }

  /**
   * Taux annuel en % pour VA / VPM
   * Exemple : TMM 7,49 + marge 3,5 → 10,99
   */
  getTauxAnnuelPct(typeCredit: string | null): number {
    const c = this.getConfig(typeCredit);
    if (!c) return 0;
    return (this.TMM + c.marge) * 100;
  }

  apiUrl(): string {
    const base = 'http://localhost:8081/api/simulateur';
    if (this.state.scenario === 'RACHAT_INTERNE') return `${base}/rachat-interne`;
    if (this.state.scenario === 'RACHAT_EXTERNE') return `${base}/rachat-externe`;
    return `${base}/sans-rachat`;
  }
}
