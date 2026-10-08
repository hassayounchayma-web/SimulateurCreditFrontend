import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgentService, ChatResponse } from '../../../core/services/agent.service';
import { AuthService } from '../../../core/services/auth.service';
import { Nl2brPipe } from '../../../shared/pipes/nl2br.pipe';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  action?: {
    type: string;
    data: string;
    label: string;
  };
}

@Component({
  selector: 'app-agent-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    Nl2brPipe
  ],
  templateUrl: './agent-page.component.html',
  styleUrls: ['./agent-page.component.scss']
})
export class AgentPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  messages: Message[] = [];
  userInput = '';
  isTyping = false;
  userId = 1;
  private scrollPending = false;

  quickSuggestions = [
    { label: '💰 Simuler un crédit', message: 'Je veux simuler un crédit pour mon projet' },
    { label: '🏠 Achat immobilier', message: 'Je veux acheter une maison à 150 000 DT' },
    { label: '🚗 Crédit auto', message: 'Je veux financer une voiture neuve à 50 000 DT' },
    { label: '🌾 Financement agricole', message: 'Je suis agriculteur et je veux un crédit' },
    { label: '📊 Capacité d\'emprunt', message: 'Quelle est ma capacité d\'emprunt ?' },
    { label: '🔄 Rachat de crédit', message: 'Je veux faire un rachat de crédit' },
    { label: '💼 Création d\'entreprise', message: 'Je veux créer mon entreprise' },
    { label: '📋 Conseils', message: 'Aidez-moi à choisir le meilleur financement' }
  ];

  constructor(
    private agentService: AgentService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user?.id) {
      this.userId = user.id;
    }

    this.addMessage(
      "👋 Bonjour ! Je suis votre **assistant financier BNA**.\n\n" +
      "Je mémorise votre dossier et je m’adapte à la page où vous êtes.\n\n" +
      "💡 Exemples :\n" +
      "• \"Je gagne 3500 DT\"\n" +
      "• \"Voiture neuve 45 000 DT sur 60 mois\"\n" +
      "• \"Détails du crédit auto\"",
      false
    );
  }

  ngAfterViewChecked() {
    if (this.scrollPending) {
      this.scrollToBottom();
      this.scrollPending = false;
    }
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    const text = this.userInput.trim();
    this.addMessage(text, true);
    this.userInput = '';
    this.isTyping = true;
    this.scrollPending = true;

    // ✅ Route courante pour le contexte de page
    const currentRoute = this.router.url;

    this.agentService.sendMessage(text, this.userId, currentRoute).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.addAgentResponse(response);

        if (response.suggestedAction === 'NAVIGATE' && response.actionData) {
          this.addActionButton(
            '🔗 Accéder au simulateur',
            response.actionData,
            response.simulateurInfo?.nom || 'Simulateur'
          );
        }

        this.scrollPending = true;
      },
      error: (err) => {
        console.error('❌ Erreur agent:', err);
        this.isTyping = false;
        this.addMessage(
          '❌ Désolé, problème technique. Vérifiez que le backend est démarré.',
          false
        );
        this.scrollPending = true;
      }
    });
  }

  private addMessage(text: string, isUser: boolean) {
    this.messages.push({
      id: Date.now() + Math.random(),
      text,
      isUser,
      timestamp: new Date()
    });
    this.scrollPending = true;
  }

  private addAgentResponse(response: ChatResponse) {
    let text = response.message || '';

    if (response.simulateurInfo) {
      text += `\n\n📌 **${response.simulateurInfo.nom}** : ${response.simulateurInfo.description}`;
    }

    this.addMessage(text, false);
  }

  private addActionButton(label: string, route: string, simulateurName: string) {
    setTimeout(() => {
      this.messages.push({
        id: Date.now() + Math.random(),
        text: '',
        isUser: false,
        timestamp: new Date(),
        action: {
          type: 'NAVIGATE',
          data: route,
          label: `🔗 ${simulateurName}`
        }
      });
      this.scrollPending = true;
    }, 300);
  }

  navigateTo(route: string) {
    this.router.navigateByUrl(route);
  }

  useSuggestion(message: string) {
    this.userInput = message;
    this.sendMessage();
  }

  /** Nettoie l’UI + la mémoire backend */
  clearChat() {
    this.messages = [];
    this.agentService.clearSession(this.userId).subscribe({
      next: () => {
        this.addMessage('🧹 Mémoire effacée. Comment puis-je vous aider ?', false);
      },
      error: () => {
        // Même si le DELETE échoue, on nettoie l’UI
        this.addMessage('🧹 Chat nettoyé. Comment puis-je vous aider ?', false);
      }
    });
    this.scrollPending = true;
  }

  goBack() {
    this.router.navigate(['/dashboard/categories']);
  }

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.avatar-fallback')) {
      const fallback = document.createElement('span');
      fallback.className = 'avatar-fallback';
      fallback.style.cssText = 'font-size: 28px; display:flex; align-items:center; justify-content:center;';
      fallback.textContent = '🤖';
      parent.appendChild(fallback);
    }
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer) {
        const el = this.chatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  }
}
