// src/app/components/agent/agent.component.ts
import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgentService, ChatResponse } from '../../core/services/agent.service';
import { AuthService } from '../../core/services/auth.service';
import { Nl2brPipe } from '../../shared/pipes/nl2br.pipe';

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
  selector: 'app-agent',
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
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.scss']
})
export class AgentComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  messages: Message[] = [];
  userInput: string = '';
  isTyping: boolean = false;
  isMinimized: boolean = true;
  userId: number = 1;
  private scrollPending: boolean = false;

  // Suggestions rapides pour l'utilisateur
  quickSuggestions = [
    { label: '💰 Simuler un crédit', message: 'Je veux simuler un crédit pour mon projet' },
    { label: '🏠 Achat immobilier', message: 'Je veux acheter une maison à 150 000 DT sur 15 ans' },
    { label: '🚗 Crédit auto', message: 'Je veux financer une voiture neuve à 50 000 DT sur 60 mois' },
    { label: '🌾 Financement agricole', message: 'Je suis agriculteur et je veux un crédit pour plantations' },
    { label: '📊 Capacité d\'emprunt', message: 'Quelle est ma capacité d\'emprunt ?' },
    { label: '🔄 Rachat de crédit', message: 'Je veux faire un rachat de crédit' },
    { label: '📋 Conseils', message: 'Aidez-moi à choisir le meilleur financement' }
  ];

  constructor(
    private agentService: AgentService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    // Récupérer l'ID utilisateur
    const user = this.authService.getCurrentUser();
    if (user?.id) {
      this.userId = user.id;
    }

    // Message de bienvenue
    this.addMessage(
      "👋 Bonjour ! Je suis votre **assistant financier BNA**.\n\n" +
      "Je suis là pour vous guider dans vos projets de financement.\n\n" +
      "💡 **Posez-moi vos questions** ou choisissez une suggestion ci-dessous.",
      false
    );
  }

  ngAfterViewChecked() {
    if (this.scrollPending) {
      this.scrollToBottom();
      this.scrollPending = false;
    }
  }

  // ✅ Gestion de l'erreur de chargement de l'image (version corrigée)
  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      let fallback = parent.querySelector('.avatar-fallback') as HTMLSpanElement;
      if (!fallback) {
        fallback = document.createElement('span');
        fallback.className = 'avatar-fallback';
        fallback.style.cssText = 'font-size: 24px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;';
        fallback.textContent = '🤖';
        parent.appendChild(fallback);
      }
    }
  }

  // ─── Envoi de message ───

  sendMessage() {
    if (!this.userInput.trim()) return;

    const text = this.userInput.trim();
    this.addMessage(text, true);
    this.userInput = '';
    this.isTyping = true;
    this.scrollPending = true;

    this.agentService.sendMessage(text, this.userId).subscribe({
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
      error: (error) => {
        this.isTyping = false;
        console.error('❌ Erreur agent:', error);
        this.addMessage(
          "❌ Désolé, j'ai rencontré un problème technique. Veuillez réessayer.",
          false
        );
        this.scrollPending = true;
      }
    });
  }

  // ─── Gestion des messages ───

  private addMessage(text: string, isUser: boolean) {
    this.messages.push({
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date()
    });
    this.scrollPending = true;
  }

  private addAgentResponse(response: ChatResponse) {
    let text = response.message;
    if (response.simulateurInfo) {
      text += `\n\n📌 **${response.simulateurInfo.nom}** : ${response.simulateurInfo.description}`;
    }
    this.addMessage(text, false);
  }

  private addActionButton(label: string, route: string, simulateurName: string) {
    setTimeout(() => {
      this.messages.push({
        id: Date.now(),
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
    }, 400);
  }

  // ─── Navigation ───

  navigateTo(route: string) {
    this.router.navigate([route]);
    setTimeout(() => {
      this.addMessage("🔍 Navigation vers le simulateur...", false);
      this.scrollPending = true;
    }, 300);
  }

  // ─── Suggestions rapides ───

  useSuggestion(message: string) {
    this.userInput = message;
    this.sendMessage();
  }

  // ─── Interface ───

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 200);
    }
  }

  clearChat() {
    this.messages = [];
    this.addMessage(
      "🧹 Chat nettoyé. Comment puis-je vous aider ?",
      false
    );
    this.scrollPending = true;
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.warn('Scroll error:', err);
    }
  }
}
