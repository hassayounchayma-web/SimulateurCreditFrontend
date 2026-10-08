import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { AdminService } from '../../../core/services/admin.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  loading = true;
  error = '';

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
    this.cdr.detectChanges();

    this.admin.users()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (u) => {
          console.log('✅ users', u);
          this.users = Array.isArray(u) ? u : [];
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('❌ users', e);
          this.users = [];
          this.error =
            e?.status === 0
              ? 'Serveur injoignable'
              : e?.message || 'Impossible de charger les utilisateurs';
          this.cdr.detectChanges();
        }
      });
  }
}
