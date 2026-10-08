// src/app/components/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { WizardStateService } from '../../core/services/wizard-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  prenom = 'Client';

  constructor(
    private auth: AuthService,
    private wizard: WizardStateService
  ) { }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser?.();
    if (user?.prenom) {
      this.prenom = user.prenom;
    } else {
      this.prenom =
        localStorage.getItem('prenom') ||
        localStorage.getItem('email') ||
        'Client';
    }
  }

  /** Remet le wizard à zéro avant une nouvelle simulation */
  startSimulation(): void {
    this.wizard.reset();
  }
}
