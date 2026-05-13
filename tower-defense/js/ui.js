/* =============================================
   ui.js — Étape 7 : Interface utilisateur complète
   Responsabilités :
     - Notifications de vague (début / fin / countdown)
     - Niveau d'IA ennemi dans le HUD
     - Overlay Game Over + Victoire
     - Bouton "Lancer vague"
   ============================================= */

const UI = {

  // Références aux éléments DOM (remplis dans init())
  _notif:         null,
  _notifTimer:    null,
  _aiBar:         null,
  _aiLabel:       null,
  _nextWaveBtn:   null,
  _nextWaveNum:   null,
  _waveTimerSpan: null,
  _overlayGO:     null,
  _overlayVic:    null,
  _goScore:       null,
  _goWave:        null,
  _vicScore:      null,

  // ── INIT ──────────────────────────────────────────────────────────────────────

  init() {
    UI._notif         = document.getElementById('wave-notif');
    UI._aiBar         = document.getElementById('ai-bar-fill');
    UI._aiLabel       = document.getElementById('ai-level-label');
    UI._nextWaveBtn   = document.getElementById('next-wave-btn');
    UI._nextWaveNum   = document.getElementById('next-wave-num');
    UI._waveTimerSpan = document.getElementById('wave-timer');
    UI._overlayGO     = document.getElementById('overlay-gameover');
    UI._overlayVic    = document.getElementById('overlay-victory');
    UI._goScore       = document.getElementById('go-score');
    UI._goWave        = document.getElementById('go-wave');
    UI._vicScore      = document.getElementById('vic-score');

    UI.updateAILevel(0);   // Niveau initial
    UI.showNextWaveBtn(1); // Premier bouton affiché
  },

  // ── NOTIFICATIONS DE VAGUE ───────────────────────────────────────────────────

  /**
   * Affiche une notification centrée temporaire (ex. "VAGUE 3").
   * @param {string} text  - Texte à afficher
   * @param {string} type  - 'start' | 'complete' | 'info'
   * @param {number} duration - Durée d'affichage en ms (défaut : 2500)
   */
  showNotif(text, type = 'start', duration = 2500) {
    if (!UI._notif) return;

    // Réinitialise l'animation précédente
    clearTimeout(UI._notifTimer);
    UI._notif.className = '';
    void UI._notif.offsetWidth; // force reflow

    UI._notif.textContent = text;
    UI._notif.classList.add('visible', `notif-${type}`);

    UI._notifTimer = setTimeout(() => {
      UI._notif.classList.remove('visible');
    }, duration);
  },

  /** Affiche le panneau de décompte avant vague avec le bouton "Lancer". */
  showNextWaveBtn(nextWaveNumber) {
    if (!UI._nextWaveBtn) return;
    UI._nextWaveNum.textContent  = nextWaveNumber;
    UI._nextWaveBtn.style.display = 'flex';
  },

  /** Cache le bouton "Lancer vague" pendant la vague active. */
  hideNextWaveBtn() {
    if (!UI._nextWaveBtn) return;
    UI._nextWaveBtn.style.display = 'none';
  },

  /** Met à jour le compte à rebours affiché sur le bouton. */
  updateWaveTimer(seconds) {
    if (!UI._waveTimerSpan) return;
    UI._waveTimerSpan.textContent = seconds > 0 ? `dans ${seconds}s` : 'PRET !';
  },

  // ── NIVEAU D'IA ───────────────────────────────────────────────────────────────

  /**
   * Met à jour la barre de progression du "niveau d'IA ennemie".
   * Appelée à chaque début de vague.
   * @param {number} waveNum - Numéro de vague courante (0-10)
   */
  updateAILevel(waveNum) {
    const MAX   = 10;
    const level = Math.min(waveNum, MAX);
    const pct   = (level / MAX) * 100;

    const tier = level <= 2 ? 1 : level <= 5 ? 2 : level <= 8 ? 3 : 4;
    const tierNames = ['', 'Basique', 'Avancée', 'Critique', 'MAXIMALE'];
    const tierColors = {
      1: '#64b5f6',  // bleu
      2: '#ffd54f',  // jaune
      3: '#ff8a65',  // orange
      4: '#ef5350',  // rouge
    };

    if (UI._aiBar) {
      UI._aiBar.style.width       = `${pct}%`;
      UI._aiBar.style.background  = tierColors[tier] ||
        `linear-gradient(90deg, #ef5350, #ce93d8)`;
    }
    if (UI._aiLabel) {
      UI._aiLabel.textContent = `IA : ${tierNames[tier]}`;
      UI._aiLabel.style.color = tierColors[tier];
    }
  },

  // ── GAME OVER ─────────────────────────────────────────────────────────────────

  showGameOver() {
    if (!UI._overlayGO) return;
    if (UI._goScore) UI._goScore.textContent = `Score final : ${GAME_STATE.score}`;
    if (UI._goWave)  UI._goWave.textContent  = `Vague atteinte : ${GAME_STATE.wave}`;
    UI._overlayGO.classList.remove('hidden');
    // Légère animation d'entrée
    requestAnimationFrame(() => UI._overlayGO.classList.add('visible'));
  },

  // ── VICTOIRE ──────────────────────────────────────────────────────────────────

  showVictory() {
    if (!UI._overlayVic) return;
    if (UI._vicScore) UI._vicScore.textContent = `Score final : ${GAME_STATE.score}`;
    UI._overlayVic.classList.remove('hidden');
    requestAnimationFrame(() => UI._overlayVic.classList.add('visible'));
  },
};
