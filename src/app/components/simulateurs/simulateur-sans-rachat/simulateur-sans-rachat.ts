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
  selector: 'app-simulateur-sans-rachat',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule,
    MatIconModule, ResultatsCardComponent
  ],
  templateUrl: './simulateur-sans-rachat.html',
  styleUrls: ['./simulateur-sans-rachat.scss']
})
export class SimulateurSansRachat implements OnInit {
  accentColor = '#008037';
  form: FormGroup;
  resultData: any = null;
  loading = false;
  error: string | null = null;

  pointsCles = [
    { icon: 'account_balance_wallet', title: 'Capacité d’endettement', desc: 'Calculée selon le revenu net moyen et le taux d’endettement autorisé.' },
    { icon: 'percent', title: 'Plafond & GF', desc: 'Plafond mensuel limité par le garde-fou (GF) lié au salaire net.' },
    { icon: 'schedule', title: 'Durées max', desc: '36 à 180 mois selon le type de crédit BNA choisi.' },
    { icon: 'calculate', title: 'Mensualité actualisée', desc: 'Calculée avec TMM + marge du produit sélectionné.' }
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
      retenuesCreditsBna: [0, Validators.min(0)],
      typeCredit: [null, Validators.required],
      dureeMois: [null, [Validators.required, Validators.min(1)]],
      montantDemande: [null, Validators.min(0)]
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
      retenuesCreditsBna: 0,
      typeCredit: null,
      dureeMois: null,
      montantDemande: null
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

    this.service.simulateSansRachat(this.form.value).subscribe({
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
