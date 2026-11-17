
import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { HistoryService } from '../../core/services/history.service';

import {
  ScenarioType,
  ProjetType,
  WizardStateService
} from '../../core/services/wizard-state.service';

import {
  CreditCalculationService,
  CreditCalculationResult
} from '../../core/services/credit-calculation.service';

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatProgressBarModule
  ],
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit, OnDestroy {

  step = 1;
  formRevenus: FormGroup;
  scenario: ScenarioType = null;

  situations = [
    {
      key: 'SANS_RACHAT' as ScenarioType,
      title: 'Premier crédit',
      desc: 'Je n’ai pas de crédit en cours.',
      hint: 'Barème sans rachat',
      icon: 'person_off'
    },
    {
      key: 'RACHAT_INTERNE' as ScenarioType,
      title: 'Déjà client BNA',
      desc: 'J’ai un ou plusieurs crédits à la BNA.',
      hint: 'Barème rachat interne',
      icon: 'account_balance'
    },
    {
      key: 'RACHAT_EXTERNE' as ScenarioType,
      title: 'Crédits ailleurs',
      desc: 'J’ai un crédit en cours hors BNA.',
      hint: 'Barème rachat externe',
      icon: 'swap_horiz'
    }
  ];

  projet: ProjetType = null;
  typeCredit: string | null = null;
  duree = 0;
  montantDemande = 0;

  resultat: CreditCalculationResult | null = null;
  capaciteInsuffisante = false;

  saving = false;
  saveOk = false;
  saveMessage = '';

  // Paramétrage bancaire dynamique
  parametrageCharge = false;
  chargementParametrage = false;
  erreurParametrage = '';

  // Conservation des taux d'une simulation déjà calculée
  tauxAnnuelResultat: number | null = null;
  tmmResultat: number | null = null;
  margeResultat: number | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private wizard: WizardStateService,
    private calculation: CreditCalculationService,
    private router: Router,
    private history: HistoryService,
    private cdr: ChangeDetectorRef
  ) {
    const s = this.wizard.snapshot;

    this.step = s.step >= 1 && s.step <= 6 ? s.step : 1;
    this.scenario = s.scenario;
    this.projet = s.projet;
    this.typeCredit = s.typeCredit;
    this.duree = s.duree || 0;
    this.montantDemande = s.montantDemande || 0;

    this.formRevenus = this.fb.group({
      salaireMensuelMoyen: [
        s.salaireMensuelMoyen,
        [Validators.required, Validators.min(1)]
      ],
      loyersDomicilies: [
        s.loyersDomicilies ?? 0,
        [Validators.min(0)]
      ],
      retenuesSed: [
        s.retenuesSed ?? 0,
        [Validators.min(0)]
      ],
      retenuesBna: [
        s.retenuesBna ?? 0,
        [Validators.min(0)]
      ],
      capitalRestantDu: [
        s.capitalRestantDu ?? 0,
        [Validators.min(0)]
      ]
    });
  }

  // =====================================================
  // INITIALISATION
  // =====================================================

  ngOnInit(): void {
    this.parametrageCharge = this.wizard.parametrageCharge;
    this.chargementParametrage = this.wizard.chargementParametrage;
    this.erreurParametrage = this.wizard.erreurParametrage ?? '';

    // Si le service possède déjà un catalogue, il reste
    // possible de rafraîchir les données depuis Spring Boot.
    this.chargerParametrage();

    // Mise à jour des récapitulatifs après saisie.
    this.subscriptions.add(
      this.formRevenus.valueChanges.subscribe(() => {
        this.cdr.markForCheck();
      })
    );

    // Restauration éventuelle d'une simulation en cours.
    this.mettreAJourValidateursCapital();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  chargerParametrage(): void {
    if (this.chargementParametrage) {
      return;
    }

    this.chargementParametrage = true;
    this.erreurParametrage = '';

    const sub = this.wizard.chargerParametrage().subscribe({
      next: () => {
        this.parametrageCharge = this.wizard.parametrageCharge;
        this.chargementParametrage = false;
        this.erreurParametrage = '';

        // Le service peut invalider un ancien produit
        // lorsque celui-ci n'existe plus en base.
        const s = this.wizard.snapshot;

        this.typeCredit = s.typeCredit;
        this.duree = s.duree;
        this.montantDemande = s.montantDemande;

        // Une étape restaurée ne doit pas afficher un
        // résultat vide sans recalcul.
        if (
          this.step >= 5 &&
          this.scenario &&
          this.typeCredit &&
          this.duree > 0
        ) {
          this.calculer();
        }

        if (
          this.step === 6 &&
          (
            !this.resultat ||
            this.resultat.capaciteInsuffisante ||
            this.montantDemande <= 0 ||
            this.montantDemande > this.montantMaxCredit
          )
        ) {
          this.step = 5;
          this.wizard.patch({ step: 5 });
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.chargementParametrage = false;

        // Si un ancien catalogue valide existe déjà,
        // on peut le conserver pour l'affichage, mais
        // on avertit que l'actualisation a échoué.
        this.parametrageCharge = this.wizard.parametrageCharge;

        this.erreurParametrage =
          err?.status === 0
            ? 'Impossible de joindre le serveur bancaire. Vérifiez que Spring Boot est démarré.'
            : err?.error?.message ||
            'Impossible de charger les paramètres bancaires.';

        this.wizard.signalerErreurParametrage(
          this.erreurParametrage
        );

        this.cdr.detectChanges();
      }
    });

    this.subscriptions.add(sub);
  }

  get peutUtiliserCatalogue(): boolean {
    return (
      this.parametrageCharge &&
      !this.chargementParametrage &&
      !this.erreurParametrage
    );
  }

  // =====================================================
  // TAUX ET DONNEES FINANCIERES
  // =====================================================

  get TMM(): number {
    return this.step === 6 && this.tmmResultat !== null
      ? this.tmmResultat
      : this.wizard.TMM * 100;
  }

  get revenuNet(): number {
    const salaire =
      Number(this.formRevenus.value.salaireMensuelMoyen) || 0;
    const loyers =
      Number(this.formRevenus.value.loyersDomicilies) || 0;

    return salaire + loyers * 0.5;
  }

  get salaireMensuelMoyen(): number {
    return Number(
      this.formRevenus.value.salaireMensuelMoyen
    ) || 0;
  }

  get loyersDomicilies(): number {
    return Number(
      this.formRevenus.value.loyersDomicilies
    ) || 0;
  }

  get capitalRestantDu(): number {
    return Number(
      this.formRevenus.value.capitalRestantDu
    ) || 0;
  }

  get tauxEndettementPct(): number {
    if (this.scenario === 'RACHAT_EXTERNE') {
      const t = this.wizard.getTauxEndettementExterne(
        this.revenuNet
      );
      return t === null ? 0 : t * 100;
    }

    return this.wizard.getTauxEndettement(
      this.revenuNet
    ) * 100;
  }

  get gardeFouPct(): number {
    if (this.scenario === 'RACHAT_EXTERNE') {
      const g = this.wizard.getGardeFouExterne(
        this.salaireMensuelMoyen
      );
      return g === null ? 0 : g * 100;
    }

    return this.wizard.getGardeFou(
      this.salaireMensuelMoyen
    ) * 100;
  }

  get plafondEndettement(): number {
    return this.resultat?.plafondEndettement ?? 0;
  }

  get reliquatCapacite(): number {
    return this.resultat?.reliquatCapacite ?? 0;
  }

  get montantMaxCredit(): number {
    return this.resultat?.montantMaxCredit ?? 0;
  }

  get mensualite(): number {
    return this.resultat?.mensualiteDemande ?? 0;
  }

  get mensualiteMax(): number {
    return this.resultat?.mensualiteMax ?? 0;
  }

  get totalRetenuesFinales(): number {
    return this.resultat?.totalRetenues ?? 0;
  }

  get tauxEndettementFinal(): number {
    return (
      this.resultat?.tauxEndettementFinal ?? 0
    ) * 100;
  }

  get reliquatCreditApresRachat(): number {
    return this.resultat?.reliquatCreditApresRachat ?? 0;
  }

  get messageCalcul(): string {
    if (
      !this.resultat ||
      this.resultat.message === 'Calcul effectué.'
    ) {
      return '';
    }

    return this.resultat.message;
  }

  get calculEnCours(): boolean {
    return this.chargementParametrage;
  }

  get scenarioLabel(): string {
    return this.situations.find(
      x => x.key === this.scenario
    )?.title ?? '—';
  }

  get projetLabel(): string {
    return this.projetsDisponibles.find(
      x => x.key === this.projet
    )?.title ?? '—';
  }

  get projetsDisponibles() {
    return this.wizard.getProjetsDisponibles();
  }

  get projets() {
    return this.projetsDisponibles;
  }

  get produitsDisponibles() {
    return this.wizard.getProduitsDisponibles();
  }

  get produits() {
    return this.produitsDisponibles;
  }

  get configSelectionnee() {
    return this.wizard.getConfigProduit(
      this.typeCredit
    );
  }

  get tauxAnnuel(): number {
    if (
      this.step === 6 &&
      this.tauxAnnuelResultat !== null
    ) {
      return this.tauxAnnuelResultat;
    }

    return this.wizard.getTauxAnnuelPct(
      this.typeCredit
    );
  }

  get margePct(): number {
    if (
      this.step === 6 &&
      this.margeResultat !== null
    ) {
      return this.margeResultat;
    }

    const c = this.configSelectionnee;
    return c ? c.marge * 100 : 0;
  }

  // =====================================================
  // ETAPE 1 : REVENUS
  // =====================================================

  nextFromRevenus(): void {
    if (this.formRevenus.invalid) {
      this.formRevenus.markAllAsTouched();
      return;
    }

    const v = this.formRevenus.value;

    this.wizard.patch({
      salaireMensuelMoyen:
        Number(v.salaireMensuelMoyen),
      loyersDomicilies:
        Number(v.loyersDomicilies) || 0,
      retenuesSed:
        Number(v.retenuesSed) || 0,
      retenuesBna:
        Number(v.retenuesBna) || 0,
      capitalRestantDu:
        Number(v.capitalRestantDu) || 0,
      step: 2
    });

    this.step = 2;
    this.cdr.detectChanges();
  }

  // =====================================================
  // ETAPE 2 : SITUATION
  // =====================================================

  selectScenario(key: ScenarioType): void {
    this.scenario = key;
    this.projet = null;
    this.typeCredit = null;
    this.duree = 0;
    this.montantDemande = 0;

    this.effacerResultat();

    if (key === 'RACHAT_EXTERNE') {
      this.formRevenus.patchValue({
        retenuesBna: 0
      });
    }

    if (key === 'SANS_RACHAT') {
      this.formRevenus.patchValue({
        capitalRestantDu: 0
      });
    }

    this.mettreAJourValidateursCapital();

    this.wizard.patch({
      scenario: key,
      projet: null,
      typeCredit: null,
      duree: 0,
      montantDemande: 0,
      retenuesBna:
        key === 'RACHAT_EXTERNE'
          ? 0
          : Number(
            this.formRevenus.value.retenuesBna
          ) || 0,
      capitalRestantDu:
        key === 'RACHAT_INTERNE' ||
          key === 'RACHAT_EXTERNE'
          ? Number(
            this.formRevenus.value.capitalRestantDu
          ) || 0
          : 0,
      step: 2
    });

    this.cdr.detectChanges();
  }

  private mettreAJourValidateursCapital(): void {
    const control = this.formRevenus.get(
      'capitalRestantDu'
    );

    if (!control) {
      return;
    }

    if (
      this.scenario === 'RACHAT_INTERNE' ||
      this.scenario === 'RACHAT_EXTERNE'
    ) {
      control.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
    } else {
      control.setValidators([
        Validators.min(0)
      ]);
    }

    control.updateValueAndValidity({
      emitEvent: false
    });
  }

  onCapitalChange(): void {
    const cap = Number(
      this.formRevenus.value.capitalRestantDu
    ) || 0;

    this.wizard.patch({
      capitalRestantDu: cap
    });

    this.effacerResultat();
    this.cdr.detectChanges();
  }

  onRetenuesBnaChange(): void {
    const bna =
      this.scenario === 'RACHAT_EXTERNE'
        ? 0
        : Number(
          this.formRevenus.value.retenuesBna
        ) || 0;

    this.formRevenus.patchValue(
      { retenuesBna: bna },
      { emitEvent: false }
    );

    this.wizard.patch({
      retenuesBna: bna
    });

    this.effacerResultat();
    this.cdr.detectChanges();
  }

  nextFromSituation(): void {
    if (!this.scenario) {
      return;
    }

    const capital = Number(
      this.formRevenus.value.capitalRestantDu
    ) || 0;

    const bna =
      this.scenario === 'RACHAT_EXTERNE'
        ? 0
        : Number(
          this.formRevenus.value.retenuesBna
        ) || 0;

    if (
      (
        this.scenario === 'RACHAT_INTERNE' ||
        this.scenario === 'RACHAT_EXTERNE'
      ) &&
      capital <= 0
    ) {
      this.mettreAJourValidateursCapital();

      this.formRevenus
        .get('capitalRestantDu')
        ?.markAsTouched();

      this.cdr.detectChanges();
      return;
    }

    this.formRevenus.patchValue({
      capitalRestantDu:
        this.scenario === 'SANS_RACHAT'
          ? 0
          : capital,
      retenuesBna: bna
    });

    this.wizard.patch({
      scenario: this.scenario,
      capitalRestantDu:
        this.scenario === 'SANS_RACHAT'
          ? 0
          : capital,
      retenuesBna: bna,
      step: 3
    });

    this.step = 3;
    this.cdr.detectChanges();
  }

  get canContinueSituation(): boolean {
    if (!this.scenario) {
      return false;
    }

    if (this.scenario === 'SANS_RACHAT') {
      return true;
    }

    return (
      Number(
        this.formRevenus.value.capitalRestantDu
      ) || 0
    ) > 0;
  }

  // =====================================================
  // ETAPE 3 : PROJET
  // =====================================================

  selectProjet(projet: ProjetType): void {
    if (!this.peutUtiliserCatalogue) {
      return;
    }

    this.projet = projet;
    this.typeCredit = null;
    this.duree = 0;
    this.montantDemande = 0;

    this.effacerResultat();

    this.wizard.patch({
      projet,
      typeCredit: null,
      duree: 0,
      montantDemande: 0
    });

    this.cdr.detectChanges();
  }

  nextFromProjet(): void {
    if (!this.projet || !this.peutUtiliserCatalogue) {
      return;
    }

    this.wizard.patch({
      projet: this.projet,
      step: 4
    });

    this.step = 4;
    this.cdr.detectChanges();
  }

  // =====================================================
  // ETAPE 4 : PRODUIT
  // =====================================================

  selectProduit(produit: string): void {
    if (!this.peutUtiliserCatalogue) {
      return;
    }

    this.typeCredit = produit;
    this.duree = 0;
    this.montantDemande = 0;

    this.effacerResultat();

    this.wizard.patch({
      typeCredit: produit,
      duree: 0,
      montantDemande: 0
    });

    this.cdr.detectChanges();
  }

  nextFromProduit(): void {
    if (
      !this.typeCredit ||
      !this.configSelectionnee ||
      !this.peutUtiliserCatalogue
    ) {
      return;
    }

    this.wizard.patch({
      typeCredit: this.typeCredit,
      step: 5
    });

    this.step = 5;
    this.cdr.detectChanges();
  }

  // =====================================================
  // ETAPE 5 : SIMULATION
  // =====================================================

  onDureeChange(value: number): void {
    this.duree = Number(value) || 0;

    this.wizard.patch({
      duree: this.duree,
      montantDemande: this.montantDemande
    });

    this.effacerResultat();
    this.calculer();
  }

  onMontantChange(value: number): void {
    this.montantDemande = Number(value) || 0;

    this.wizard.patch({
      montantDemande: this.montantDemande
    });

    this.effacerResultat();
    this.calculer();
  }

  calculer(): void {
    if (
      !this.peutUtiliserCatalogue ||
      !this.scenario ||
      !this.typeCredit ||
      !this.duree ||
      this.duree <= 0
    ) {
      this.resultat = null;
      this.capaciteInsuffisante = false;
      return;
    }

    const config = this.configSelectionnee;

    if (
      !config ||
      this.duree > config.maxMois
    ) {
      this.resultat = null;
      this.capaciteInsuffisante = false;
      return;
    }

    // Synchroniser l'état utilisé par
    // CreditCalculationService.
    this.wizard.patch({
      scenario: this.scenario,
      projet: this.projet,
      typeCredit: this.typeCredit,
      duree: this.duree,
      montantDemande: this.montantDemande
    });

    const v = this.formRevenus.value;

    const result = this.calculation.calculate({
      salaireMensuelMoyen:
        Number(v.salaireMensuelMoyen) || 0,
      loyersDomicilies:
        Number(v.loyersDomicilies) || 0,
      retenuesSed:
        Number(v.retenuesSed) || 0,
      retenuesBna:
        this.scenario === 'RACHAT_EXTERNE'
          ? 0
          : Number(v.retenuesBna) || 0,
      capitalRestantDu:
        this.scenario === 'SANS_RACHAT'
          ? 0
          : Number(v.capitalRestantDu) || 0,
      montantDemande:
        Number(this.montantDemande) || 0,
      duree:
        Number(this.duree) || 0,
      tauxAnnuel:
        this.wizard.getTauxAnnuelPct(
          this.typeCredit
        ),
      scenario: this.scenario
    });

    this.resultat = result;
    this.capaciteInsuffisante =
      result.capaciteInsuffisante;

    this.cdr.detectChanges();
  }

  calculateResult(): void {
    if (!this.peutUtiliserCatalogue) {
      return;
    }

    this.calculer();

    if (
      !this.resultat ||
      this.resultat.capaciteInsuffisante
    ) {
      return;
    }

    if (
      this.montantDemande <= 0 ||
      this.montantDemande > this.montantMaxCredit
    ) {
      return;
    }

    this.saveOk = false;
    this.saveMessage = '';

    // Figement des taux utilisés pour ce résultat.
    this.tauxAnnuelResultat = this.resultat.tauxAnnuel;
    this.tmmResultat = this.wizard.TMM * 100;
    this.margeResultat =
      this.configSelectionnee?.marge != null
        ? this.configSelectionnee.marge * 100
        : null;

    this.wizard.patch({
      montantDemande: this.montantDemande,
      duree: this.duree,
      step: 6
    });

    this.step = 6;
    this.cdr.detectChanges();
  }

  afficherResultat(): void {
    this.calculateResult();
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  back(): void {
    if (this.step > 1) {
      this.step--;

      this.wizard.patch({
        step: this.step
      });

      // Retour à la simulation : les valeurs restent,
      // mais le résultat doit être recalculé si nécessaire.
      if (this.step === 5) {
        this.tauxAnnuelResultat = null;
        this.tmmResultat = null;
        this.margeResultat = null;
        this.calculer();
      }

      this.cdr.detectChanges();
      return;
    }

    this.router.navigate(['/dashboard/hub']);
  }

  // =====================================================
  // ENREGISTREMENT HISTORIQUE
  // =====================================================

  enregistrer(): void {
    if (
      !this.resultat ||
      !this.scenario ||
      !this.typeCredit
    ) {
      this.saveOk = false;
      this.saveMessage =
        'Aucun résultat à enregistrer.';

      this.cdr.detectChanges();
      return;
    }

    if (this.saving || this.saveOk) {
      return;
    }

    const userId = localStorage.getItem('userId');

    if (!userId) {
      this.saveOk = false;
      this.saveMessage =
        'Session incomplète (userId manquant). Reconnectez-vous.';

      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.saveOk = false;
    this.saveMessage = '';

    this.cdr.detectChanges();

    const v = this.formRevenus.value;

    const inputs = {
      salaireMensuelMoyen:
        Number(v.salaireMensuelMoyen) || 0,
      loyersDomicilies:
        Number(v.loyersDomicilies) || 0,
      retenuesSed:
        Number(v.retenuesSed) || 0,
      retenuesBna:
        this.scenario === 'RACHAT_EXTERNE'
          ? 0
          : Number(v.retenuesBna) || 0,
      capitalRestantDu:
        this.scenario === 'SANS_RACHAT'
          ? 0
          : Number(v.capitalRestantDu) || 0,
      scenario: this.scenario,
      scenarioLabel: this.scenarioLabel,
      projet: this.projet,
      projetLabel: this.projetLabel,
      typeCredit: this.typeCredit,
      duree: this.duree,
      montantDemande: this.montantDemande,
      tauxAnnuel:
        this.resultat.tauxAnnuel,
      tmm:
        this.tmmResultat ?? this.wizard.TMM * 100,
      margePct:
        this.margeResultat ?? this.margePct,
      revenuNet: this.revenuNet
    };

    const payload = {
      typeSimulateur: String(this.scenario),
      libelle:
        `${this.scenarioLabel} — ${this.typeCredit}`,
      inputsJson: JSON.stringify(inputs),
      resultJson: JSON.stringify(this.resultat),
      montantDemande: this.montantDemande,
      mensualite:
        this.resultat.mensualiteDemande,
      montantMax:
        this.resultat.montantMaxCredit,
      dureeMois: this.duree,
      tauxEndettement:
        this.resultat.tauxEndettementFinal != null
          ? this.resultat.tauxEndettementFinal * 100
          : undefined
    };

    this.history.save(payload)
      .pipe(
        timeout(15000),

        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
          console.log('🏁 [History] SAVE terminé');
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ [History] SAVE SUCCESS:', response);

          this.saveOk = true;
          this.saveMessage =
            'Simulation enregistrée avec succès.';

          this.cdr.detectChanges();
        },

        error: (err) => {
          console.error('❌ [History] SAVE ERROR:', err);

          this.saveOk = false;

          if (err.name === 'TimeoutError') {
            this.saveMessage =
              'Le serveur ne répond pas. Vérifiez dans l’historique avant de réessayer, car l’enregistrement a peut-être été effectué.';

          } else if (err.status === 401 || err.status === 403) {
            this.saveMessage =
              'Accès refusé. Vérifiez votre connexion.';

          } else if (err.status === 0) {
            this.saveMessage =
              'Impossible de contacter le serveur.';

          } else {
            this.saveMessage =
              err.error?.message ||
              err.message ||
              'Échec de l’enregistrement.';
          }

          this.cdr.detectChanges();
        }
      });


  }

  // =====================================================
  // CRÉATION D'UN DOSSIER DEPUIS LE RÉSULTAT
  // =====================================================

  creerDossier(): void {
    if (!this.resultat || !this.scenario || !this.typeCredit) {
      return;
    }

    const revenus = this.formRevenus.value;
    const simulation = {
      libelle: `${this.scenarioLabel} — ${this.typeCredit}`,
      typeSimulateur: this.scenario,
      simulation: {
        salaireMensuelMoyen: Number(revenus.salaireMensuelMoyen) || 0,
        loyersDomicilies: Number(revenus.loyersDomicilies) || 0,
        retenuesSed: Number(revenus.retenuesSed) || 0,
        retenuesBna: this.scenario === 'RACHAT_EXTERNE'
          ? 0
          : Number(revenus.retenuesBna) || 0,
        capitalRestantDu: this.scenario === 'SANS_RACHAT'
          ? 0
          : Number(revenus.capitalRestantDu) || 0,
        scenario: this.scenario,
        projet: this.projet,
        typeCredit: this.typeCredit,
        duree: this.duree,
        montantDemande: this.montantDemande,
        tauxAnnuel: this.resultat.tauxAnnuel,
        revenuNet: this.revenuNet
      },
      resultat: this.resultat
    };

    this.router.navigate(['/dashboard/dossiers'], {
      state: { simulationJson: JSON.stringify(simulation) }
    });
  }

  nouvelleSimulation(): void {
    this.wizard.reset();

    this.step = 1;
    this.scenario = null;
    this.projet = null;
    this.typeCredit = null;
    this.duree = 0;
    this.montantDemande = 0;

    this.effacerResultat();

    this.saving = false;

    this.formRevenus.reset({
      salaireMensuelMoyen: null,
      loyersDomicilies: 0,
      retenuesSed: 0,
      retenuesBna: 0,
      capitalRestantDu: 0
    });

    this.mettreAJourValidateursCapital();

    // Récupérer les derniers taux en cas de
    // modification administrative.
    this.chargerParametrage();

    this.cdr.detectChanges();
  }

  // =====================================================
  // NETTOYAGE DU RESULTAT
  // =====================================================

  private effacerResultat(): void {
    this.resultat = null;
    this.capaciteInsuffisante = false;

    this.tauxAnnuelResultat = null;
    this.tmmResultat = null;
    this.margeResultat = null;

    this.saveOk = false;
    this.saveMessage = '';
  }
}
