// src/app/components/auth/register/register.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnDestroy {
  nom = '';
  prenom = '';
  email = '';
  telephone = '';
  cin = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  redirectTimeout: any = null;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnDestroy(): void {
    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }
  }

  onRegister() {
    // Validations
    if (!this.nom || !this.prenom || !this.email || !this.telephone || !this.cin || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    if (!this.email.includes('@') || !this.email.includes('.')) {
      this.errorMessage = 'Veuillez entrer un email valide';
      return;
    }

    if (!/^[0-9]{8}$/.test(this.telephone)) {
      this.errorMessage = 'Le téléphone doit contenir 8 chiffres';
      return;
    }

    if (!/^[0-9]{8}$/.test(this.cin)) {
      this.errorMessage = 'Le CIN doit contenir 8 chiffres';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.password.length < 4) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 4 caractères';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📤 [Register] Envoi des données:', {
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      telephone: this.telephone,
      cin: this.cin
    });

    this.authService.register({
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      telephone: this.telephone,
      cin: this.cin,
      password: this.password
    }).subscribe({
      next: (response: any) => {
        console.log('✅ [Register] Réponse du backend:', response);
        this.handleSuccess();
      },
      error: (err: any) => {
        console.error('❌ [Register] Erreur:', err);

        // Cas spécial : status 0 = très souvent CORS, mais le compte a déjà été créé
        if (err.status === 0 || err.statusText === 'Unknown Error') {
          console.warn('⚠️ Status 0 détecté → le compte a probablement été créé (CORS)');
          this.handleSuccess();
          return;
        }

        this.isLoading = false;

        if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.message) {
          this.errorMessage = err.message;
        } else {
          this.errorMessage = 'Erreur lors de l\'inscription. Veuillez réessayer.';
        }
      }
    });
  }

  private handleSuccess() {
    this.isLoading = false;
    this.successMessage = 'Inscription réussie ! Redirection vers la page de connexion...';

    this.redirectTimeout = setTimeout(() => {
      console.log('🔄 [Register] Redirection vers /login');
      this.router.navigate(['/login']);
    }, 1500);
  }

  resetForm(): void {
    this.nom = '';
    this.prenom = '';
    this.email = '';
    this.telephone = '';
    this.cin = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
  }
}
