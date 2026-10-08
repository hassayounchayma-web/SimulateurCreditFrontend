import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { SimulateurService } from '../../../core/services/simulateur.service';
import { ResultatsCardComponent } from '../../../shared/components/resultats-card/resultats-card';

@Component({
  selector: 'app-simulateur-rachat-interne',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule,
    MatIconModule, ResultatsCardComponent
  ],
  templateUrl: './simulateur-rachat-interne.html',
  styleUrls: ['./simulateur-rachat-interne.scss']
})
export class SimulateurRachatInterne implements OnInit {
  accentColor = '#2E7D32';
  form: FormGroup;
  loading = false;
  error: string | null = null;
  resultData: any = null;

  pointsCles = [
    { icon: 'swap_horiz', title: 'Rachat interne BNA', desc: 'Regroupement des crédits BNA existants en un seul nouveau crédit.' },
    { icon: 'account_balance', title: 'Capital à racheter', desc: 'Saisissez le capital restant dû des crédits BNA à regrouper.' },
    { icon: 'trending_up', title: 'Nouveau financement', desc: 'Possibilité d’ajouter un montant supplémentaire selon la capacité.' },
    { icon: 'schedule', title: 'Durées selon produit', desc: 'Limites de durée identiques aux crédits directs BNA.' }
  ];

  typesCredit = [
    'Crédit Direct Dépenses Courantes',
    'Crédit Direct Aménagement',
    'Crédit Direct Acquisition Véhicule Neuf',
    'Crédit Direct Acquisition Véhicule Occasion',
    'Crédit Direct Aménagement Hypothécaire (Durée ≤ 7 ans)',
    'Crédit Direct Aménagement Hypothécaire (Durée > 7 ans et ≤ 12 ans)',
    'Crédit Direct Acquisition Logement (Durée ≤ 7 ans)',
    'Crédit Direct Acquisition Logement (Durée > 7 ans et ≤ 15 ans)',
    'Crédit Direct Construction (Durée ≤ 7 ans)',
    'Crédit Direct Construction (Durée > 7 ans et ≤ 15 ans)',
    'Crédit Direct Achat Terrain (Durée ≤ 7 ans)',
    'Crédit Direct Achat Terrain (Durée > 7 ans et ≤ 15 ans)'
  ];

  private creditLimits: { [key: string]: number } = {
    'Crédit Direct Dépenses Courantes': 36,
    'Crédit Direct Aménagement': 60,
    'Crédit Direct Acquisition Véhicule Neuf': 84,
    'Crédit Direct Acquisition Véhicule Occasion': 60,
    'Crédit Direct Aménagement Hypothécaire (Durée ≤ 7 ans)': 84,
    'Crédit Direct Aménagement Hypothécaire (Durée > 7 ans et ≤ 12 ans)': 144,
    'Crédit Direct Acquisition Logement (Durée ≤ 7 ans)': 84,
    'Crédit Direct Acquisition Logement (Durée > 7 ans et ≤ 15 ans)': 180,
    'Crédit Direct Construction (Durée ≤ 7 ans)': 84,
    'Crédit Direct Construction (Durée > 7 ans et ≤ 15 ans)': 180,
    'Crédit Direct Achat Terrain (Durée ≤ 7 ans)': 84,
    'Crédit Direct Achat Terrain (Durée > 7 ans et ≤ 15 ans)': 180
  };

  constructor(private fb: FormBuilder, private service: SimulateurService) {
    this.form = this.fb.group({
      salaireMensuelMoyen: [null, [Validators.required, Validators.min(0)]],
      cinquantePourcentLoyers: [0, Validators.min(0)],
      retenuesSed: [0, Validators.min(0)],
      retenuesCreditsBnaNonRachete: [0, Validators.min(0)],
      capitalRestantARacheter: [null, [Validators.required, Validators.min(1)]],
      typeCredit: [null, Validators.required],
      dureeMois: [null, [Validators.required, Validators.min(1)]],
      montantCreditDemande: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.form.get('typeCredit')?.valueChanges.subscribe(type => {
      const maxDuree = this.creditLimits[type] || 180;
      const dureeControl = this.form.get('dureeMois');
      dureeControl?.setValidators([Validators.required, Validators.min(1), Validators.max(maxDuree)]);
      dureeControl?.updateValueAndValidity();
    });
  }

  resetForm() {
    this.form.reset({
      salaireMensuelMoyen: null,
      cinquantePourcentLoyers: 0,
      retenuesSed: 0,
      retenuesCreditsBnaNonRachete: 0,
      capitalRestantARacheter: null,
      typeCredit: null,
      dureeMois: null,
      montantCreditDemande: null
    });
    this.error = null;
    this.resultData = null;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.error = 'Veuillez remplir tous les champs obligatoires.';
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = null;
    this.resultData = null;

    this.service.simulateRachatInterne(this.form.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.resultData = res;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || err.error?.error || 'Erreur lors du calcul';
      }
    });
  }
}
