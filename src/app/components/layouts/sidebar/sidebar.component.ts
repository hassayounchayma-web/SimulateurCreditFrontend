// src/app/components/layouts/sidebar/sidebar.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  menuItems = [
    { icon: 'dashboard', label: 'Tableau de bord', route: '/dashboard/categories' },
    { icon: 'history', label: 'Historique', route: '/dashboard/historique' },
    { icon: 'smart_toy', label: 'Agent BNA', route: '/dashboard/parametres' }  // ← Remplacé
  ];
}
