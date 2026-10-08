import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: any = null;
  error = '';
  loading = true;

  constructor(
    private admin: AdminService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.stats = null;
    this.cdr.detectChanges();

    this.admin.stats()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (s) => {
          console.log('✅ stats', s);
          this.stats = s;
        },
        error: (e) => {
          console.error('❌ stats', e);
          this.error =
            e?.status === 0
              ? 'Serveur injoignable (backend arrêté ?)'
              : e?.message || 'Impossible de charger les statistiques';
        }
      });
  }

  typeEntries(): { key: string; value: number }[] {
    if (!this.stats?.byType) return [];
    return Object.keys(this.stats.byType).map((key) => ({
      key,
      value: this.stats.byType[key]
    }));
  }
}
