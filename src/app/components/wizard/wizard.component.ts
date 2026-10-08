import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
export class WizardComponent {
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
      salaireMensuelMoyen: [s.salaireMensuelMoyen, [Validators.required, Validators.min(1)]],
      loyersDomicilies: [s.loyersDomicilies ?? 0, [Validators.min(0)]],
      retenuesSed: [s.retenuesSed ?? 0, [Validators.min(0)]],
      retenuesBna: [s.retenuesBna ?? 0, [Validators.min(0)]],
      capitalRestantDu: [s.capitalRestantDu ?? 0, [Validators.min(0)]]
    });
  }

  get TMM(): number {
    return this.wizard.TMM * 100;
  }

  get revenuNet(): number {
    const salaire = Number(this.formRevenus.value.salaireMensuelMoyen) || 0;
    const loyers = Number(this.formRevenus.value.loyersDomicilies) || 0;
    return salaire + loyers * 0.5;
  }

  get salaireMensuelMoyen(): number {
    return Number(this.formRevenus.value.salaireMensuelMoyen) || 0;
  }

  get loyersDomicilies(): number {
    return Number(this.formRevenus.value.loyersDomicilies) || 0;
  }

  get capitalRestantDu(): number {
    return Number(this.formRevenus.value.capitalRestantDu) || 0;
  }

  get tauxEndettementPct(): number {
    if (this.scenario === 'RACHAT_EXTERNE') {
      const t = this.wizard.getTauxEndettementExterne(this.revenuNet);
      return t === null ? 0 : t * 100;
    }
    return this.wizard.getTauxEndettement(this.revenuNet) * 100;
  }

  get gardeFouPct(): number {
    if (this.scenario === 'RACHAT_EXTERNE') {
      const g = this.wizard.getGardeFouExterne(this.salaireMensuelMoyen);
      return g === null ? 0 : g * 100;
    }
    return this.wizard.getGardeFou(this.salaireMensuelMoyen) * 100;
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
    return (this.resultat?.tauxEndettementFinal ?? 0) * 100;
  }

  get reliquatCreditApresRachat(): number {
    return this.resultat?.reliquatCreditApresRachat ?? 0;
  }

  get messageCalcul(): string {
    if (!this.resultat || this.resultat.message === 'Calcul effectué.') return '';
    return this.resultat.message;
  }

  get calculEnCours(): boolean {
    return false;
  }

  get scenarioLabel(): string {
    return this.situations.find(x => x.key === this.scenario)?.title ?? '—';
  }

  get projetLabel(): string {
    return this.projetsDisponibles.find(x => x.key === this.projet)?.title ?? '—';
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
    return this.wizard.getConfigProduit(this.typeCredit);
  }

  get tauxAnnuel(): number {
    return this.wizard.getTauxAnnuelPct(this.typeCredit);
  }

  get margePct(): number {
    const c = this.configSelectionnee;
    return c ? c.marge * 100 : 0;
  }

  nextFromRevenus(): void {
    if (this.formRevenus.invalid) {
      this.formRevenus.markAllAsTouched();
      return;
    }
    const v = this.formRevenus.value;
    this.wizard.patch({
      salaireMensuelMoyen: Number(v.salaireMensuelMoyen),
      loyersDomicilies: Number(v.loyersDomicilies) || 0,
      retenuesSed: Number(v.retenuesSed) || 0,
      // BNA : sera ajusté à l’étape 2 selon le scénario
      retenuesBna: Number(v.retenuesBna) || 0,
      capitalRestantDu: Number(v.capitalRestantDu) || 0,
      step: 2
    });
    this.step = 2;
    this.cdr.detectChanges();
  }

  selectScenario(key: ScenarioType): void {
    this.scenario = key;
    this.projet = null;
    this.typeCredit = null;
    this.duree = 0;
    this.montantDemande = 0;
    this.resultat = null;
    this.capaciteInsuffisante = false;
    this.saveOk = false;
    this.saveMessage = '';

    // Rachat externe : pas de retenues BNA
    if (key === 'RACHAT_EXTERNE') {
      this.formRevenus.patchValue({ retenuesBna: 0 });
    }
    // Sans rachat : pas de capital à racheter
    if (key === 'SANS_RACHAT') {
      this.formRevenus.patchValue({ capitalRestantDu: 0 });
    }

    this.wizard.patch({
      scenario: key,
      projet: null,
      typeCredit: null,
      duree: 0,
      montantDemande: 0,
      retenuesBna: key === 'RACHAT_EXTERNE' ? 0 : (Number(this.formRevenus.value.retenuesBna) || 0),
      capitalRestantDu:
        key === 'RACHAT_INTERNE' || key === 'RACHAT_EXTERNE'
          ? (Number(this.formRevenus.value.capitalRestantDu) || 0)
          : 0,
      step: 2
    });
    this.cdr.detectChanges();
  }

  /** Appelé à chaque saisie capital / BNA en étape 2 */
  onCapitalChange(): void {
    const cap = Number(this.formRevenus.value.capitalRestantDu) || 0;
    this.wizard.patch({ capitalRestantDu: cap });
    this.cdr.detectChanges();
  }

  onRetenuesBnaChange(): void {
    const bna =
      this.scenario === 'RACHAT_EXTERNE'
        ? 0
        : (Number(this.formRevenus.value.retenuesBna) || 0);
    this.formRevenus.patchValue({ retenuesBna: bna }, { emitEvent: false });
    this.wizard.patch({ retenuesBna: bna });
    this.cdr.detectChanges();
  }

  nextFromSituation(): void {
    if (!this.scenario) return;

    const capital = Number(this.formRevenus.value.capitalRestantDu) || 0;
    const bna =
      this.scenario === 'RACHAT_EXTERNE'
        ? 0
        : (Number(this.formRevenus.value.retenuesBna) || 0);

    if (
      (this.scenario === 'RACHAT_INTERNE' || this.scenario === 'RACHAT_EXTERNE') &&
      capital <= 0
    ) {
      this.formRevenus.get('capitalRestantDu')?.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
      this.formRevenus.get('capitalRestantDu')?.updateValueAndValidity();
      this.formRevenus.get('capitalRestantDu')?.markAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.formRevenus.patchValue({
      capitalRestantDu: this.scenario === 'SANS_RACHAT' ? 0 : capital,
      retenuesBna: bna
    });

    this.wizard.patch({
      scenario: this.scenario,
      capitalRestantDu: this.scenario === 'SANS_RACHAT' ? 0 : capital,
      retenuesBna: bna,
      step: 3
    });
    this.step = 3;
    this.cdr.detectChanges();
  }

  get canContinueSituation(): boolean {
    if (!this.scenario) return false;
    if (this.scenario === 'SANS_RACHAT') return true;
    return (Number(this.formRevenus.value.capitalRestantDu) || 0) > 0;
  }

  selectProjet(projet: ProjetType): void {
    this.projet = projet;
    this.typeCredit = null;
    this.duree = 0;
    this.montantDemande = 0;
    this.resultat = null;
    this.capaciteInsuffisante = false;
    this.saveOk = false;
    this.saveMessage = '';
    this.wizard.patch({ projet, typeCredit: null, duree: 0, montantDemande: 0 });
    this.cdr.detectChanges();
  }

  nextFromProjet(): void {
    if (!this.projet) return;
    this.wizard.patch({ projet: this.projet, step: 4 });
    this.step = 4;
    this.cdr.detectChanges();
  }

  selectProduit(produit: string): void {
    this.typeCredit = produit;
    this.duree = 0;
    this.montantDemande = 0;
    this.resultat = null;
    this.capaciteInsuffisante = false;
    this.saveOk = false;
    this.saveMessage = '';
    this.wizard.patch({ typeCredit: produit, duree: 0, montantDemande: 0 });
    this.cdr.detectChanges();
  }

  nextFromProduit(): void {
    if (!this.typeCredit) return;
    this.wizard.patch({ typeCredit: this.typeCredit, step: 5 });
    this.step = 5;
    this.cdr.detectChanges();
  }

  onDureeChange(value: number): void {
    this.duree = Number(value) || 0;
    this.wizard.patch({ duree: this.duree, montantDemande: this.montantDemande });
    this.calculer();
  }

  onMontantChange(value: number): void {
    this.montantDemande = Number(value) || 0;
    this.wizard.patch({ montantDemande: this.montantDemande });
    this.calculer();
  }

  calculer(): void {
    if (!this.scenario || !this.typeCredit || !this.duree || this.duree <= 0) {
      this.resultat = null;
      this.capaciteInsuffisante = false;
      return;
    }
    const config = this.configSelectionnee;
    if (!config || this.duree > config.maxMois) {
      this.resultat = null;
      this.capaciteInsuffisante = false;
      return;
    }
    const v = this.formRevenus.value;
    const result = this.calculation.calculate({
      salaireMensuelMoyen: Number(v.salaireMensuelMoyen) || 0,
      loyersDomicilies: Number(v.loyersDomicilies) || 0,
      retenuesSed: Number(v.retenuesSed) || 0,
      retenuesBna: this.scenario === 'RACHAT_EXTERNE' ? 0 : (Number(v.retenuesBna) || 0),
      capitalRestantDu:
        this.scenario === 'SANS_RACHAT' ? 0 : (Number(v.capitalRestantDu) || 0),
      montantDemande: Number(this.montantDemande) || 0,
      duree: Number(this.duree) || 0,
      tauxAnnuel: this.wizard.getTauxAnnuelPct(this.typeCredit),
      scenario: this.scenario
    });
    this.resultat = result;
    this.capaciteInsuffisante = result.capaciteInsuffisante;
    this.cdr.detectChanges();
  }

  calculateResult(): void {
    this.calculer();
    if (!this.resultat || this.resultat.capaciteInsuffisante) return;
    if (this.montantDemande <= 0 || this.montantDemande > this.montantMaxCredit) return;
    this.saveOk = false;
    this.saveMessage = '';
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

  back(): void {
    if (this.step > 1) {
      this.step--;
      this.wizard.patch({ step: this.step });
      this.cdr.detectChanges();
      return;
    }
    this.router.navigate(['/dashboard/hub']);
  }

  

  

  enregistrer(): void {
    if (!this.resultat || !this.scenario || !this.typeCredit) {
      this.saveOk = false;
      this.saveMessage = 'Aucun résultat à enregistrer.';
      this.cdr.detectChanges();
      return;
    }
    if (this.saving || this.saveOk) {
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.saveOk = false;
      this.saveMessage = 'Session incomplète (userId manquant). Reconnectez-vous.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.saveOk = false;
    this.saveMessage = '';
    this.cdr.detectChanges();

    const v = this.formRevenus.value;

    const inputs = {
      salaireMensuelMoyen: Number(v.salaireMensuelMoyen) || 0,
      loyersDomicilies: Number(v.loyersDomicilies) || 0,
      retenuesSed: Number(v.retenuesSed) || 0,
      retenuesBna: Number(v.retenuesBna) || 0,
      capitalRestantDu: Number(v.capitalRestantDu) || 0,
      scenario: this.scenario,
      scenarioLabel: this.scenarioLabel,
      projet: this.projet,
      projetLabel: this.projetLabel,
      typeCredit: this.typeCredit,
      duree: this.duree,
      montantDemande: this.montantDemande,
      tauxAnnuel: this.tauxAnnuel,
      tmm: this.TMM,
      margePct: this.margePct,
      revenuNet: this.revenuNet
    };

    const payload = {
      typeSimulateur: String(this.scenario),
      libelle: `${this.scenarioLabel} — ${this.typeCredit}`,
      inputsJson: JSON.stringify(inputs),
      resultJson: JSON.stringify(this.resultat),
      montantDemande: this.montantDemande,
      mensualite: this.resultat.mensualiteDemande,
      montantMax: this.resultat.montantMaxCredit,
      dureeMois: this.duree,
      tauxEndettement:
        this.resultat.tauxEndettementFinal != null
          ? this.resultat.tauxEndettementFinal * 100
          : undefined
    };

    this.history.save(payload).subscribe({
      next: () => {
        this.saving = false;
        this.saveOk = true;
        this.saveMessage = 'Simulation enregistrée avec succès.';
        this.cdr.detectChanges();
        // pas de navigate vers historique
      },
      error: (err) => {
        this.saving = false;
        this.saveOk = false;
        if (err.status === 401 || err.status === 403) {
          this.saveMessage = 'Accès refusé. Vérifiez la connexion ou /api/history.';
        } else if (err.status === 0) {
          this.saveMessage = 'Serveur injoignable.';
        } else {
          this.saveMessage =
            err.error?.message || err.message || 'Échec de l’enregistrement.';
        }
        this.cdr.detectChanges();
      }
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
    this.resultat = null;
    this.capaciteInsuffisante = false;
    this.saving = false;
    this.saveOk = false;
    this.saveMessage = '';
    this.formRevenus.reset({
      salaireMensuelMoyen: null,
      loyersDomicilies: 0,
      retenuesSed: 0,
      retenuesBna: 0,
      capitalRestantDu: 0
    });
    this.cdr.detectChanges();
  }
}
