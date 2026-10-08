import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-simulateurs',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './simulateurs.component.html',
  styleUrls: ['./simulateurs.component.scss']
})
export class SimulateursComponent {
  simulateurs = [
    {
      title: 'Sans Rachat',
      description: 'Simulez un nouveau crédit BNA selon votre capacité d’endettement.',
      icon: 'credit_card_off',
      color: '#008037',
      route: '/dashboard/simulateurs-internes/sans-rachat',
      badge: 'Disponible'
    },
    {
      title: 'Rachat Interne',
      description: 'Regroupez vos crédits BNA existants et financez un nouveau projet.',
      icon: 'swap_horiz',
      color: '#2E7D32',
      route: '/dashboard/simulateurs-internes/rachat-interne',
      badge: 'Disponible'
    },
    {
      title: 'Rachat Externe',
      description: 'Rachetez un crédit concurrent et obturez un nouveau financement BNA.',
      icon: 'sync_alt',
      color: '#43A047',
      route: '/dashboard/simulateurs-internes/rachat-externe',
      badge: 'Disponible'
    }
  ];
}
