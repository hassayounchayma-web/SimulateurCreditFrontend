import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HistoryService, SimulationHistory } from '../../core/services/history.service';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTableModule
  ],
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.scss']
})
export class HistoriqueComponent implements OnInit {
  items: SimulationHistory[] = [];
  selected = new Set<number>();
  compareRows: SimulationHistory[] = [];
  loading = false;
  error = '';

  detail: SimulationHistory | null = null;
  detailInputs: any = null;
  detailResult: any = null;

  constructor(
    private history: HistoryService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.history.list().subscribe({
      next: (data) => {
        this.items = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Historique', err);
        this.items = [];
        this.loading = false;
        if (err.status === 401 || err.status === 403) {
          this.error = 'Accès refusé. Reconnectez-vous ou autorisez /api/history.';
        } else if (err.status === 0) {
          this.error = 'Serveur indisponible.';
        } else {
          this.error = 'Impossible de charger l’historique.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  openDetail(s: SimulationHistory): void {
    this.detail = s;
    try {
      this.detailInputs = s.inputsJson ? JSON.parse(s.inputsJson) : null;
    } catch {
      this.detailInputs = null;
    }
    try {
      this.detailResult = s.resultJson ? JSON.parse(s.resultJson) : null;
    } catch {
      this.detailResult = null;
    }
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.detail = null;
    this.detailInputs = null;
    this.detailResult = null;
    this.cdr.detectChanges();
  }

  toggle(id: number): void {
    if (this.selected.has(id)) this.selected.delete(id);
    else if (this.selected.size < 3) this.selected.add(id);
    this.cdr.detectChanges();
  }

  comparer(): void {
    const ids = Array.from(this.selected);
    if (ids.length < 2) {
      this.error = 'Sélectionnez au moins 2 simulations';
      this.cdr.detectChanges();
      return;
    }
    this.history.compare(ids).subscribe({
      next: (rows) => {
        this.compareRows = rows;
        this.error = '';
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.error = e.error?.message || 'Erreur comparaison';
        this.cdr.detectChanges();
      }
    });
  }

  supprimer(id: number): void {
    this.history.delete(id).subscribe({
      next: () => {
        this.selected.delete(id);
        this.compareRows = this.compareRows.filter(r => r.id !== id);
        if (this.detail?.id === id) this.closeDetail();
        this.reload();
      },
      error: () => {
        this.error = 'Suppression impossible';
        this.cdr.detectChanges();
      }
    });
  }
}
