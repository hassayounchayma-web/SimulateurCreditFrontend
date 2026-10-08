// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import 'zone.js';

console.log('🚀 Démarrage de l\'application...');

bootstrapApplication(AppComponent, appConfig)
  .then(() => console.log('✅ Application démarrée avec succès !'))
  .catch((err) => {
    console.error('❌ Erreur au démarrage:', err);
  });
