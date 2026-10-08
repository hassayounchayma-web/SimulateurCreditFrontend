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
  selector: 'app-simulateur-rachat-externe',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule,
    MatIconModule, ResultatsCardComponent
  ],
  templateUrl: './simulateur-rachat-externe.html',
  styleUrls: ['./simulateur-rachat-externe.scss']
})
export class SimulateurRachatExterne implements OnInit {
  accentColor = '#43A047';
  form: FormGroup;
  loading = false;
  error: string | null = null;
  resultData: any = null;

  pointsCles = [
    { icon: 'sync_alt', title: 'Rachat externe', desc: 'Rachat d’un crédit concurrent + nouveau financement BNA.' },
    { icon: 'credit_card', title: '2 types de crédit', desc: 'Dépenses Courantes (max 36 mois) ou Aménagement (max 60 mois).' },
    { icon: 'account_balance_wallet', title: 'Capacité restante', desc: 'Plafond après déduction des retenues SED non rachetées.' },
    { icon: 'payments', title: 'Nouveau crédit', desc: 'Montant demandé ≥ capital externe à racheter.' }
  ];

  typesCredit = [
    'Crédit Direct Dépenses Courantes',
    'Crédit Direct Aménagement'
  ];

  creditLimits: { [key: string]: number } = {
    'Crédit Direct Dépenses Courantes': 36,
    'Crédit Direct Aménagement': 60
  };

  constructor(private fb: FormBuilder, private service: SimulateurService) {
    this.form = this.fb.group({
      salaireMensuelMoyen: [null, [Validators.required, Validators.min(0)]],
      cinquantePourcentLoyers: [0, Validators.min(0)],
      retenuesSedNonRachete: [0, Validators.min(0)],
      capitalRestantExterneARacheter: [null, [Validators.required, Validators.min(1)]],
      typeCredit: [null, Validators.required],
      dureeMois: [null, [Validators.required, Validators.min(1)]],
      montantCreditDemande: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.form.get('typeCredit')?.valueChanges.subscribe(type => {
      const maxDuree = this.creditLimits[type] || 60;
      const dureeControl = this.form.get('dureeMois');
      dureeControl?.setValidators([Validators.required, Validators.min(1), Validators.max(maxDuree)]);
      dureeControl?.updateValueAndValidity();
    });
  }

  resetForm() {
    this.form.reset({
      salaireMensuelMoyen: null,
      cinquantePourcentLoyers: 0,
      retenuesSedNonRachete: 0,
      capitalRestantExterneARacheter: null,
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

    this.service.simulateRachatExterne(this.form.value).subscribe({
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
