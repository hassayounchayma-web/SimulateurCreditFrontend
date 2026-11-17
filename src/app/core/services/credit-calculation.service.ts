
import { Injectable } from '@angular/core';

import {
  ScenarioType,
  WizardStateService
} from './wizard-state.service';

export interface CreditCalculationInput {
  salaireMensuelMoyen: number;

  /** Loyers bruts ; 50 % appliqués ici */
  loyersDomicilies: number;

  retenuesSed: number;
  retenuesBna: number;
  capitalRestantDu: number;
  montantDemande: number;
  duree: number;

  /** Taux annuel en % (ex. 10.99) */
  tauxAnnuel: number;

  scenario: ScenarioType;
}

export interface CreditCalculationResult {
  scenario: ScenarioType;
  revenuNetMoyen: number;
  tauxEndettement: number | null;
  gardeFou: number | null;
  plafondEndettement: number;
  reliquatCapacite: number;
  tauxAnnuel: number;
  tauxMensuel: number;
  montantMaxCredit: number;
  capaciteInsuffisante: boolean;
  mensualiteMax: number;
  mensualiteDemande: number;
  montantDemande: number;
  capitalRestantDu: number;
  reliquatCreditApresRachat: number;
  totalRetenues: number;
  tauxEndettementFinal: number | null;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreditCalculationService {

  constructor(
    private readonly wizard: WizardStateService
  ) { }

  // =====================================================
  // FORMULE VA
  // =====================================================

  private valeurActuelle(
    tauxAnnuelPct: number,
    duree: number,
    mensualite: number
  ): number {

    if (duree <= 0 || mensualite <= 0) {
      return 0;
    }

    const r = tauxAnnuelPct / 100 / 12;

    if (Math.abs(r) < 1e-12) {
      return mensualite * duree;
    }

    return (
      mensualite *
      (1 - Math.pow(1 + r, -duree))
    ) / r;
  }

  // =====================================================
  // FORMULE VPM
  // =====================================================

  private vpm(
    tauxAnnuelPct: number,
    duree: number,
    capital: number
  ): number {

    if (duree <= 0 || capital <= 0) {
      return 0;
    }

    const r = tauxAnnuelPct / 100 / 12;

    if (Math.abs(r) < 1e-12) {
      return capital / duree;
    }

    return (
      capital *
      r *
      Math.pow(1 + r, duree)
    ) / (
        Math.pow(1 + r, duree) - 1
      );
  }

  private round2(x: number): number {
    return Math.round(x * 100) / 100;
  }

  // =====================================================
  // CALCUL PRINCIPAL
  // =====================================================

  calculate(
    input: CreditCalculationInput
  ): CreditCalculationResult {

    const salaire =
      Number(input.salaireMensuelMoyen) || 0;

    const loyers =
      Number(input.loyersDomicilies) || 0;

    const retenuesSed =
      Number(input.retenuesSed) || 0;

    const retenuesBna =
      Number(input.retenuesBna) || 0;

    const capitalRestantDu =
      Number(input.capitalRestantDu) || 0;

    const montantDemande =
      Number(input.montantDemande) || 0;

    const duree =
      Number(input.duree) || 0;

    const scenario = input.scenario;

    const revenuNetMoyen =
      salaire + loyers * 0.5;

    // ===================================================
    // VERIFICATION DU PARAMETRAGE
    // ===================================================

    if (!this.wizard.parametrageCharge) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        0,
        'Les paramètres bancaires ne sont pas encore chargés.'
      );
    }

    // Le taux doit être récupéré depuis le service
    // dynamique, en utilisant le produit sélectionné.

    const typeCredit = this.wizard.snapshot.typeCredit;

    if (!typeCredit) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        0,
        'Veuillez sélectionner un type de crédit.'
      );
    }

    const config = this.wizard.getConfig(typeCredit);

    if (!config) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        0,
        'Le produit sélectionné ne possède pas de configuration bancaire.'
      );
    }

    const tauxAnnuel =
      this.wizard.getTauxAnnuelPct(typeCredit);

    if (
      !Number.isFinite(tauxAnnuel) ||
      tauxAnnuel < 0
    ) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        0,
        'Taux annuel invalide.'
      );
    }

    // ===================================================
    // VERIFICATION DE LA DUREE
    // ===================================================

    if (
      duree <= 0 ||
      !Number.isInteger(duree) ||
      duree > config.maxMois
    ) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        tauxAnnuel,
        `Durée invalide. Maximum autorisé : ${config.maxMois} mois.`
      );
    }

    // ===================================================
    // VERIFICATION DU SALAIRE
    // ===================================================

    if (
      scenario !== 'RACHAT_EXTERNE' &&
      salaire < 1000
    ) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        tauxAnnuel,
        'Client non éligible au crédit pour un salaire inférieur à 1 000 DT.'
      );
    }

    // ===================================================
    // TAUX ENDETTEMENT ET GARDE-FOU
    // ===================================================

    let tauxEndettement: number | null;
    let gardeFou: number | null;

    if (scenario === 'RACHAT_EXTERNE') {

      tauxEndettement =
        this.wizard.getTauxEndettementExterne(
          revenuNetMoyen
        );

      gardeFou =
        this.wizard.getGardeFouExterne(
          salaire
        );

    } else {

      tauxEndettement =
        this.wizard.getTauxEndettement(
          revenuNetMoyen
        );

      gardeFou =
        this.wizard.getGardeFou(
          salaire
        );
    }

    if (
      tauxEndettement === null ||
      gardeFou === null
    ) {

      return this.emptyResult(
        input,
        revenuNetMoyen,
        tauxAnnuel,
        'Barème non défini pour ce niveau de revenu ou de salaire.'
      );
    }

    // ===================================================
    // PLAFOND D'ENDETTEMENT
    // ===================================================

    const plafondEndettement = Math.min(
      tauxEndettement * revenuNetMoyen,
      salaire * gardeFou
    );

    // ===================================================
    // RELIQUAT DE CAPACITE
    // ===================================================

    let reliquatCapacite = 0;

    if (scenario === 'RACHAT_EXTERNE') {

      reliquatCapacite =
        plafondEndettement - retenuesSed;

    } else {

      reliquatCapacite =
        plafondEndettement -
        retenuesSed -
        retenuesBna;
    }

    const mensualiteDisponible = Math.max(
      0,
      reliquatCapacite
    );

    // ===================================================
    // MONTANT MAXIMAL
    // ===================================================

    let montantMaxCredit = 0;
    let capaciteInsuffisante = false;

    if (
      duree > 0 &&
      mensualiteDisponible > 0
    ) {

      const va = this.valeurActuelle(
        tauxAnnuel,
        duree,
        mensualiteDisponible
      );

      if (scenario === 'SANS_RACHAT') {

        montantMaxCredit = va;

      } else if (
        scenario === 'RACHAT_INTERNE' ||
        scenario === 'RACHAT_EXTERNE'
      ) {

        if (va < capitalRestantDu) {

          capaciteInsuffisante = true;
          montantMaxCredit = 0;

        } else {

          montantMaxCredit = va;
        }
      }
    }

    if (mensualiteDisponible <= 0) {

      montantMaxCredit = 0;

      if (
        (
          scenario === 'RACHAT_INTERNE' ||
          scenario === 'RACHAT_EXTERNE'
        ) &&
        capitalRestantDu > 0
      ) {

        capaciteInsuffisante = true;
      }
    }

    // ===================================================
    // MENSUALITES
    // ===================================================

    const mensualiteMax =
      capaciteInsuffisante
        ? 0
        : mensualiteDisponible;

    const mensualiteDemande = this.vpm(
      tauxAnnuel,
      duree,
      montantDemande
    );

    // ===================================================
    // RELIQUAT APRES RACHAT
    // ===================================================

    let reliquatCreditApresRachat = 0;

    if (
      scenario === 'RACHAT_INTERNE' ||
      scenario === 'RACHAT_EXTERNE'
    ) {

      reliquatCreditApresRachat =
        montantDemande === 0
          ? 0
          : montantDemande - capitalRestantDu;
    }

    // ===================================================
    // TOTAL RETENUES
    // ===================================================

    const totalRetenues =
      scenario === 'RACHAT_EXTERNE'
        ? retenuesSed + mensualiteDemande
        : retenuesSed +
        retenuesBna +
        mensualiteDemande;

    // ===================================================
    // TAUX D'ENDETTEMENT FINAL
    // ===================================================

    const tauxEndettementFinal =
      revenuNetMoyen === 0
        ? null
        : totalRetenues / revenuNetMoyen;

    // ===================================================
    // MESSAGE
    // ===================================================

    let message = 'Calcul effectué.';

    if (capaciteInsuffisante) {

      message =
        'Capacité insuffisante pour refinancer le capital restant dû.';

    } else if (
      montantDemande > 0 &&
      montantDemande > montantMaxCredit
    ) {

      message =
        'Le montant demandé dépasse le montant maximal calculé.';
    }

    // ===================================================
    // RESULTAT
    // ===================================================

    return {
      scenario,

      revenuNetMoyen:
        this.round2(revenuNetMoyen),

      tauxEndettement,
      gardeFou,

      plafondEndettement:
        this.round2(plafondEndettement),

      reliquatCapacite:
        this.round2(reliquatCapacite),

      tauxAnnuel,

      tauxMensuel:
        tauxAnnuel / 100 / 12,

      montantMaxCredit:
        this.round2(montantMaxCredit),

      capaciteInsuffisante,

      mensualiteMax:
        this.round2(mensualiteMax),

      mensualiteDemande:
        this.round2(mensualiteDemande),

      montantDemande,
      capitalRestantDu,

      reliquatCreditApresRachat:
        this.round2(reliquatCreditApresRachat),

      totalRetenues:
        this.round2(totalRetenues),

      tauxEndettementFinal,
      message
    };
  }

  // =====================================================
  // RESULTAT VIDE / ERREUR
  // =====================================================

  private emptyResult(
    input: CreditCalculationInput,
    revenuNetMoyen: number,
    tauxAnnuel: number,
    message: string
  ): CreditCalculationResult {

    return {
      scenario: input.scenario,

      revenuNetMoyen:
        this.round2(revenuNetMoyen),

      tauxEndettement: null,
      gardeFou: null,

      plafondEndettement: 0,
      reliquatCapacite: 0,

      tauxAnnuel,

      tauxMensuel:
        tauxAnnuel / 100 / 12,

      montantMaxCredit: 0,
      capaciteInsuffisante: true,

      mensualiteMax: 0,
      mensualiteDemande: 0,

      montantDemande:
        Number(input.montantDemande) || 0,

      capitalRestantDu:
        Number(input.capitalRestantDu) || 0,

      reliquatCreditApresRachat: 0,
      totalRetenues: 0,
      tauxEndettementFinal: null,

      message
    };
  }
}
