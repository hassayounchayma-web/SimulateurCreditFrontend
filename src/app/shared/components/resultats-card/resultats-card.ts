// src/app/shared/components/resultats-card/resultats-card.ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-resultats-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './resultats-card.html',
  styleUrls: ['./resultats-card.scss']
})
export class ResultatsCardComponent implements OnChanges {

  @Input() result: any = null;
  @Input() loading: boolean = false;
  @Input() simulatorType: string = 'Simulation';
  @Input() userInputData: any = {};

  userInputEntries: { key: string; value: any }[] = [];

  private readonly resultFields: { [key: string]: { label: string; icon: string; format: string; color?: string } } = {
    'totalRevenuNetMoyen': { label: 'Revenu net moyen', icon: 'payments', format: 'currency' },
    'tauxEndettement': { label: "Taux d'endettement", icon: 'percent', format: 'percentage' },
    'tauxEndettementCalcule': { label: "Taux d'endettement calculé", icon: 'percent', format: 'percentage' },
    'montantMaxCredit': { label: 'Montant max crédit', icon: 'trending_up', format: 'currency' },
    'montantNouveauCredit': { label: 'Montant nouveau crédit', icon: 'trending_up', format: 'currency' },
    'mensualite': { label: 'Mensualité', icon: 'calendar_month', format: 'currency' },
    'mensualiteNouveau': { label: 'Mensualité nouveau crédit', icon: 'calendar_month', format: 'currency' },
    'totalInterets': { label: 'Total intérêts', icon: 'calculate', format: 'currency' },
    'totalRembourse': { label: 'Total remboursé', icon: 'summarize', format: 'currency' },
    'capaciteRemboursement': { label: 'Capacité de remboursement', icon: 'verified', format: 'currency' },
    'gf': { label: 'GF (Garantie Financière)', icon: 'security', format: 'currency' },
    'plafondEndettementMensuel': { label: 'Plafond endettement mensuel', icon: 'dashboard', format: 'currency' },
    'totalRetenues': { label: 'Total retenues', icon: 'receipt', format: 'currency' },
    'availableMensualite': { label: 'Mensualité disponible', icon: 'check_circle', format: 'currency' },
    'totalEndettementMensuel': { label: "Total endettement mensuel", icon: 'trending_down', format: 'currency' }
  };

  ngOnChanges() {
    if (this.result) {
      console.log('📊 [ResultatsCard] Résultats reçus:', this.result);
    }
    
    this.userInputEntries = Object.entries(this.userInputData || {})
      .filter(([_, value]) => value !== null && value !== undefined && value !== '' && value !== 0)
      .map(([key, value]) => ({ key, value }));
  }

  getEndettementColor(): string {
    const taux = this.result?.tauxEndettementCalcule ?? this.result?.tauxEndettement ?? this.result?.tauxEndettementApres ?? 0;
    if (taux < 33) return '#4caf50';
    if (taux < 45) return '#ff9800';
    return '#f44336';
  }

  getEndettementLabel(): string {
    const taux = this.result?.tauxEndettementCalcule ?? this.result?.tauxEndettement ?? this.result?.tauxEndettementApres ?? 0;
    if (taux < 33) return 'Bon';
    if (taux < 45) return 'Modéré';
    return 'Élevé';
  }

  getFormattedKey(key: string): string {
    const field = this.resultFields[key];
    if (field) return field.label;
    
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /**
   * ✅ Formatage correct des valeurs pour l'affichage
   */
  getFormattedValue(key: string, value: any): string {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'boolean') {
      return value ? '✅ Oui' : '❌ Non';
    }
    
    const field = this.resultFields[key];
    if (field) {
      if (field.format === 'currency') {
        // ✅ Format sans espaces entre les chiffres
        return value.toFixed(2) + ' DT';
      }
      if (field.format === 'percentage') {
        return value.toFixed(2) + ' %';
      }
    }
    
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    
    return String(value);
  }

  getIcon(key: string): string {
    const field = this.resultFields[key];
    return field ? field.icon : 'info';
  }

  shouldDisplayKey(key: string): boolean {
    if (key === 'error' || key === 'userInput') return false;
    return true;
  }

  isPercentage(key: string): boolean {
    const field = this.resultFields[key];
    return field?.format === 'percentage' || key.includes('taux') || key.includes('Taux');
  }

  isCurrency(key: string): boolean {
    const field = this.resultFields[key];
    return field?.format === 'currency' || key.includes('montant') || key.includes('credit') || key.includes('revenu');
  }

  /**
   * Récupère uniquement les champs avec des valeurs valides
   */
  getResultEntries(): { key: string; value: any }[] {
    if (!this.result) return [];
    return Object.entries(this.result)
      .filter(([key, value]) => {
        if (key === 'error' || key === 'userInput') return false;
        if (value === null || value === undefined || value === '') return false;
        if (typeof value === 'number' && value === 0) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
      .map(([key, value]) => ({ key, value }));
  }

  /**
   * ✅ Génère le PDF avec formatage correct
   */
  generatePDF(): void {
    if (!this.result || this.loading || this.result.error) {
      console.warn('[PDF] Aucun résultat valide');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // === HEADER ===
    try {
      doc.addImage('assets/images/logo-bna.png', 'PNG', 15, 10, 45, 22);
    } catch (e) {}

    doc.setFontSize(22);
    doc.setTextColor(0, 128, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport de Simulation', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(0, 166, 92);
    doc.setFont('helvetica', 'normal');
    doc.text(this.simulatorType, pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const now = new Date();
    const dateStr = now.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Généré le ${dateStr}`, pageWidth / 2, 45, { align: 'center' });

    doc.setDrawColor(0, 128, 55);
    doc.setLineWidth(1);
    doc.line(15, 52, pageWidth - 15, 52);

    y = 62;

    // === DONNÉES SAISIES ===
    doc.setFontSize(16);
    doc.setTextColor(0, 128, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Données Saisies', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.setFont('helvetica', 'normal');

    const userEntries = Object.entries(this.userInputData || {})
      .filter(([_, value]) => value !== null && value !== undefined && value !== '' && value !== 0);

    for (const [key, value] of userEntries) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      const label = this.getFormattedKey(key);
      // ✅ Formatage correct sans espaces entre les chiffres
      let formattedValue = '-';
      if (typeof value === 'number') {
        formattedValue = value.toFixed(2) + ' DT';
      } else if (typeof value === 'string') {
        formattedValue = value;
      } else {
        formattedValue = String(value);
      }
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(label, 25, y);
      doc.setTextColor(0);
      doc.text(formattedValue, pageWidth - 30, y, { align: 'right' });
      y += 9;
    }

    y += 6;

    // === RÉSULTATS CALCULÉS ===
    doc.setFontSize(16);
    doc.setTextColor(0, 128, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Résultats Calculés', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');

    const resultEntries = this.getResultEntries();

    for (const { key, value } of resultEntries) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const label = this.getFormattedKey(key);
      // ✅ Formatage correct sans espaces entre les chiffres
      let formattedValue = '-';
      if (typeof value === 'number') {
        if (this.isPercentage(key) || key.includes('taux')) {
          formattedValue = value.toFixed(2) + ' %';
        } else if (this.isCurrency(key)) {
          formattedValue = value.toFixed(2) + ' DT';
        } else {
          formattedValue = value.toFixed(2);
        }
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'Oui' : 'Non';
      } else {
        formattedValue = String(value);
      }
      
      if (this.isPercentage(key) || key.includes('taux')) {
        doc.setTextColor(0, 128, 55);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, y);
        doc.text(formattedValue, pageWidth - 30, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
      } else {
        doc.text(label, 25, y);
        doc.text(formattedValue, pageWidth - 30, y, { align: 'right' });
      }
      y += 9;
    }

    // === FOOTER ===
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    const footerText = 'Document confidentiel - Généré par Simulateur Crédit BNA';
    doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

    const fileName = `simulation_${this.simulatorType.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    console.log('✅ [PDF] PDF généré avec succès :', fileName);
  }

  copyToClipboard(): void {
    if (!this.result) return;
    
    let text = `📊 Résultats de la simulation ${this.simulatorType}\n`;
    text += `${'='.repeat(40)}\n\n`;
    
    text += '📋 Données saisies :\n';
    for (const [key, value] of Object.entries(this.userInputData || {})) {
      if (value !== null && value !== undefined && value !== '') {
        text += `  ${this.getFormattedKey(key)} : ${this.getFormattedValue(key, value)}\n`;
      }
    }
    
    text += '\n📊 Résultats calculés :\n';
    for (const { key, value } of this.getResultEntries()) {
      text += `  ${this.getFormattedKey(key)} : ${this.getFormattedValue(key, value)}\n`;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ Résultats copiés dans le presse-papiers');
    }).catch(err => {
      console.error('❌ Erreur lors de la copie :', err);
    });
  }
}
