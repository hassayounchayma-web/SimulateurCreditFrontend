import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  hidePassword = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  onLogin(): void {
    if (!this.username?.trim() || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .login({
        username: this.username.trim(),
        password: this.password
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          // Rôle renvoyé par le backend (prioritaire) ou déjà stocké par AuthService
          const role = (
            response?.role ||
            localStorage.getItem('role') ||
            'CLIENT'
          )
            .toString()
            .trim()
            .toUpperCase()
            .replace(/^ROLE_/, '');

          if (role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null) ||
            err?.message ||
            'Identifiants incorrects';
        }
      });
  }
}
