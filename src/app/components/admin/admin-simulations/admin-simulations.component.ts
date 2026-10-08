import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-simulations',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './admin-simulations.component.html',
  styleUrls: ['./admin-simulations.component.scss']
})
export class AdminSimulationsComponent implements OnInit {
  items: any[] = [];
  loading = true;
  error = '';
  detail: any = null;
  detailInputs: any = null;
  detailResult: any = null;

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
    this.cdr.detectChanges();

    this.admin.simulations()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('✅ simulations', data);
          this.items = Array.isArray(data) ? data : [];
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('❌ simulations', e);
          this.items = [];
          this.error =
            e?.status === 0
              ? 'Serveur injoignable'
              : e?.message || 'Impossible de charger les simulations';
          this.cdr.detectChanges();
        }
      });
  }

  openDetail(s: any): void {
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
}
