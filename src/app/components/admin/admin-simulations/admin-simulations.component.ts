
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';

import { AdminService } from '../../../core/services/admin.service';

type ScenarioType =
  | 'SANS_RACHAT'
  | 'RACHAT_INTERNE'
  | 'RACHAT_EXTERNE'
  | 'AUTRE';

interface SimulationHistory {
  id?: number | string;
  userId?: number | string;
  libelle?: string;
  typeSimulateur?: string;
  createdAt?: string;
  montantDemande?: number | null;
  montantMax?: number | null;
  mensualite?: number | null;
  inputsJson?: string | Record<string, any> | null;
  resultJson?: string | Record<string, any> | null;
  [key: string]: any;
}

@Component({
  selector: 'app-admin-simulations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './admin-simulations.component.html',
  styleUrls: ['./admin-simulations.component.scss']
})
export class AdminSimulationsComponent implements OnInit {

  items: SimulationHistory[] = [];
  filteredItems: SimulationHistory[] = [];

  loading = true;
  error = '';

  searchTerm = '';
  scenarioFilter = 'TOUS';

  detail: SimulationHistory | null = null;
  detailInputs: Record<string, any> = {};
  detailResult: Record<string, any> = {};

  constructor(
    private admin: AdminService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = '';

    this.admin.simulations()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: any) => {
          this.items = Array.isArray(data) ? data : [];

          this.items.sort((a, b) => {
            const dateA = a.createdAt
              ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt
              ? new Date(b.createdAt).getTime() : 0;

            return dateB - dateA;
          });

          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (e: any) => {
          console.error('Erreur historique simulations', e);

          this.items = [];
          this.filteredItems = [];

          this.error = e?.status === 0
            ? 'Serveur injoignable.'
            : 'Impossible de charger les simulations.';

          this.cdr.detectChanges();
        }
      });
  }

  parseJson(value: unknown): Record<string, any> {
    if (!value) {
      return {};
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }

    if (typeof value !== 'string') {
      return {};
    }

    try {
      const parsed = JSON.parse(value);

      return parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  // Recherche une propriété parmi plusieurs noms possibles.
  // Ne transforme pas une valeur absente en zéro.
  field(
    source: Record<string, any> | null | undefined,
    ...keys: string[]
  ): any {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(source, key) &&
        source[key] !== null &&
        source[key] !== undefined &&
        source[key] !== ''
      ) {
        return source[key];
      }
    }

    return null;
  }

  input(...keys: string[]): any {
    return this.field(this.detailInputs, ...keys);
  }

  result(...keys: string[]): any {
    return this.field(this.detailResult, ...keys);
  }

  hasInput(...keys: string[]): boolean {
    return this.input(...keys) !== null;
  }

  hasResult(...keys: string[]): boolean {
    return this.result(...keys) !== null;
  }

  scenario(s: SimulationHistory): ScenarioType {
    const raw = String(
      s.typeSimulateur ||
      s.libelle ||
      ''
    ).toUpperCase();

    if (
      raw.includes('EXTERNE') ||
      raw.includes('RACHAT_EXTERNE')
    ) {
      return 'RACHAT_EXTERNE';
    }

    if (
      raw.includes('INTERNE') ||
      raw.includes('RACHAT_INTERNE')
    ) {
      return 'RACHAT_INTERNE';
    }

    if (
      raw.includes('SANS') ||
      raw.includes('SANS_RACHAT')
    ) {
      return 'SANS_RACHAT';
    }

    return 'AUTRE';
  }

  scenarioLabel(s: SimulationHistory): string {
    switch (this.scenario(s)) {
      case 'SANS_RACHAT':
        return 'Sans rachat';
      case 'RACHAT_INTERNE':
        return 'Rachat interne';
      case 'RACHAT_EXTERNE':
        return 'Rachat externe';
      default:
        return s.typeSimulateur || 'Non renseigné';
    }
  }

  get detailScenario(): ScenarioType {
    return this.detail ? this.scenario(this.detail) : 'AUTRE';
  }

  get isRachat(): boolean {
    return this.detailScenario === 'RACHAT_INTERNE' ||
      this.detailScenario === 'RACHAT_EXTERNE';
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredItems = this.items.filter(s => {
      const matchesScenario =
        this.scenarioFilter === 'TOUS' ||
        this.scenario(s) === this.scenarioFilter;

      const searchText = [
        s.id,
        s.userId,
        s.libelle,
        s.typeSimulateur,
        s.createdAt
      ]
        .filter(value => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();

      return matchesScenario &&
        (!term || searchText.includes(term));
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.scenarioFilter = 'TOUS';
    this.applyFilters();
  }

  openDetail(s: any): void {
    this.detail = s;

    this.detailInputs = this.parseJson(s.inputsJson);
    this.detailResult = this.parseJson(s.resultJson);

    console.log('===== SIMULATION HISTORIQUE =====');
    console.log('Objet historique :', s);
    console.log('Entrées enregistrées :', this.detailInputs);
    console.log('Résultats enregistrés :', this.detailResult);
    console.log('================================');

    this.cdr.detectChanges();
  }
  closeDetail(): void {
    this.detail = null;
    this.detailInputs = {};
    this.detailResult = {};

    this.cdr.detectChanges();
  }

  get totalSimulations(): number {
    return this.items.length;
  }

  get totalSansRachat(): number {
    return this.items.filter(
      s => this.scenario(s) === 'SANS_RACHAT'
    ).length;
  }

  get totalRachatInterne(): number {
    return this.items.filter(
      s => this.scenario(s) === 'RACHAT_INTERNE'
    ).length;
  }

  get totalRachatExterne(): number {
    return this.items.filter(
      s => this.scenario(s) === 'RACHAT_EXTERNE'
    ).length;
  }

  get mensualiteMoyenne(): number | null {
    const valeurs = this.items
      .map(s => this.historyMensualite(s))
      .filter((v): v is number => v !== null);

    if (!valeurs.length) {
      return null;
    }

    return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
  }

  historyMensualite(s: SimulationHistory): number | null {
    const value = this.field(
      s as Record<string, any>,
      'mensualite'
    );

    const result = this.parseJson(s.resultJson);

    return this.asNumber(
      value !== null
        ? value
        : this.field(result, 'mensualite')
    );
  }

  historyMontantDemande(s: SimulationHistory): number | null {
    const value = this.field(
      s as Record<string, any>,
      'montantDemande'
    );

    if (value !== null) {
      return this.asNumber(value);
    }

    const inputs = this.parseJson(s.inputsJson);

    return this.asNumber(
      this.field(
        inputs,
        'montantCreditDemande',
        'montantDemande'
      )
    );
  }

  historyMontantMax(s: SimulationHistory): number | null {
    const value = this.field(
      s as Record<string, any>,
      'montantMax'
    );

    if (value !== null) {
      return this.asNumber(value);
    }

    const result = this.parseJson(s.resultJson);

    return this.asNumber(
      this.field(
        result,
        'montantMaxCredit',
        'montantMax'
      )
    );
  }

  asNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  money(value: any): string {
    const amount = this.asNumber(value);

    if (amount === null) {
      return '—';
    }

    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DT';
  }

  percent(value: any): string {
    const amount = this.asNumber(value);

    if (amount === null) {
      return '—';
    }

    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 2
    }).format(amount) + ' %';
  }

  display(value: any): string {
    return value === null ||
      value === undefined ||
      value === ''
      ? '—'
      : String(value);
  }

  detailMontantDemande(): number | null {
    if (!this.detail) {
      return null;
    }

    return this.historyMontantDemande(this.detail);
  }

  detailMontantMax(): number | null {
    if (!this.detail) {
      return null;
    }

    return this.historyMontantMax(this.detail);
  }

  detailMensualite(): number | null {
    if (!this.detail) {
      return null;
    }

    return this.historyMensualite(this.detail);
  }

  detailTypeCredit(): string {
    return this.display(
      this.input('typeCredit', 'produitCredit') ||
      this.detail?.libelle
    );
  }

  detailDuree(): any {
    return this.result('duree', 'dureeMois') ??
      this.input('dureeMois', 'duree');
  }

  detailTotalEngagements(): any {
    return this.result(
      'totalEndettementMensuel',
      'totalRetenues'
    );
  }

  trackBySimulation(
    index: number,
    item: SimulationHistory
  ): string | number {
    return item.id ?? index;
  }
  resultValue(key: string): any {
    const aliases: Record<string, string[]> = {
      totalRevenuNetMoyen: [
        'totalRevenuNetMoyen',
        'revenuNetMoyen'
      ],
      gf: [
        'gf',
        'gardeFou'
      ],
      plafondEndettementMensuel: [
        'plafondEndettementMensuel',
        'plafondEndettement'
      ],
      availableMensualite: [
        'availableMensualite',
        'reliquatCapacite'
      ],
      montantMaxCredit: [
        'montantMaxCredit',
        'montantMax'
      ],
      mensualite: [
        'mensualiteDemande',
        'mensualite'
      ],
      tauxEndettementCalcule: [
        'tauxEndettementCalcule',
        'tauxEndettementFinal'
      ],
      capitalRestantDu: [
        'capitalRestantDu',
        'capitalRestantARacheter'
      ],
      totalRetenues: [
        'totalRetenues'
      ],
      reliquatCreditApresRachat: [
        'reliquatCreditApresRachat'
      ]
    };

    return this.result(...(aliases[key] || [key]));
  }

  percentageValue(key: string): string {
    const value = this.resultValue(key);
    const numberValue = this.asNumber(value);

    if (numberValue === null) {
      return '—';
    }

    // Les résultats Angular utilisent des ratios pour
    // ces champs ; le backend Java utilise des %.
    const isAngularResult =
      this.detailResult?.['revenuNetMoyen'] !== undefined ||
      this.detailResult?.['gardeFou'] !== undefined ||
      this.detailResult?.['mensualiteDemande'] !== undefined;

    const ratioFields = [
      'tauxEndettement',
      'gf',
      'tauxEndettementCalcule'
    ];

    const normalized =
      isAngularResult && ratioFields.includes(key)
        ? numberValue * 100
        : numberValue;

    return this.percent(normalized);
  }

  detailLoyersRetenus(): number | null {
    const valeur = this.input('loyersDomicilies');

    if (valeur === null || valeur === undefined || valeur === '') {
      return null;
    }

    const loyers = Number(valeur);

    if (!Number.isFinite(loyers)) {
      return null;
    }

    return Math.round(loyers * 0.5 * 100) / 100;
  }
}
