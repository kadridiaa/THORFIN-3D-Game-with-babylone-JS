/* =============================================
   audio.js — Étape 8 : Sons synthétiques
   Responsabilités :
     - Web Audio API uniquement (aucun fichier externe)
     - Sons générés par synthèse (oscillateurs)
     - Initialisation paresseuse au premier geste utilisateur
       (obligatoire depuis Chrome 66+ pour éviter l'avertissement autoplay)
   ============================================= */

const AUDIO = {

  _ctx:     null,    // AudioContext (créé au premier clic)
  enabled:  true,    // Peut être basculé via une touche M

  // ── INIT ──────────────────────────────────────────────────────────────────────

  init() {
    // Crée l'AudioContext au premier événement utilisateur (politique navigateur)
    const startCtx = () => {
      if (!AUDIO._ctx) {
        try {
          AUDIO._ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          console.warn('Web Audio API non disponible :', e);
        }
      }
      // Réactive si suspendu (Chrome suspend parfois après silence)
      if (AUDIO._ctx && AUDIO._ctx.state === 'suspended') {
        AUDIO._ctx.resume();
      }
    };

    window.addEventListener('click',   startCtx, { once: false });
    window.addEventListener('keydown', startCtx, { once: false });

    // Touche M = mute/unmute
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        AUDIO.enabled = !AUDIO.enabled;
        console.log('Audio :', AUDIO.enabled ? 'activé' : 'coupé');
      }
    });
  },

  // ── LECTURE DES SONS ──────────────────────────────────────────────────────────

  /**
   * Joue un son prédéfini par son identifiant.
   * @param {string} id - Identifiant du son
   */
  play(id) {
    if (!AUDIO.enabled || !AUDIO._ctx) return;

    switch (id) {
      // Tir d'une tourelle standard
      case 'shoot':
        AUDIO._tone(440, 0.06, 0.06, 'square');
        break;

      // Tir sniper (grave et long)
      case 'shoot_sniper':
        AUDIO._tone(220, 0.10, 0.12, 'sawtooth');
        break;

      // Tir mitrailleuse (aigu et court)
      case 'shoot_rapid':
        AUDIO._tone(660, 0.04, 0.04, 'square');
        break;

      // Projectile touche un ennemi
      case 'hit':
        AUDIO._tone(280, 0.04, 0.08, 'sawtooth');
        break;

      // Mort d'un ennemi
      case 'enemyDeath':
        AUDIO._tone(160, 0.12, 0.25, 'sawtooth');
        AUDIO._tone(100, 0.06, 0.30, 'sine');
        break;

      // Ennemi atteint la base (dégât)
      case 'baseDamage':
        AUDIO._tone(80,  0.25, 0.50, 'sine');
        AUDIO._tone(60,  0.15, 0.70, 'sine');
        break;

      // Pose d'une tourelle
      case 'place':
        AUDIO._tone(550, 0.10, 0.15, 'sine');
        AUDIO._tone(700, 0.07, 0.10, 'sine');
        break;

      // Début de vague
      case 'waveStart':
        AUDIO._tone(330, 0.12, 0.15, 'sine');
        setTimeout(() => AUDIO._tone(440, 0.12, 0.20, 'sine'), 120);
        setTimeout(() => AUDIO._tone(550, 0.15, 0.30, 'sine'), 250);
        break;

      // Fin de vague (victoire intermédiaire)
      case 'waveComplete':
        AUDIO._tone(523, 0.12, 0.20, 'sine');
        setTimeout(() => AUDIO._tone(659, 0.10, 0.25, 'sine'), 100);
        setTimeout(() => AUDIO._tone(784, 0.10, 0.30, 'sine'), 220);
        break;

      // Game Over
      case 'gameOver':
        AUDIO._tone(220, 0.20, 0.50, 'sawtooth');
        setTimeout(() => AUDIO._tone(180, 0.20, 0.60, 'sawtooth'), 400);
        setTimeout(() => AUDIO._tone(120, 0.25, 0.80, 'sine'),     800);
        break;

      // Victoire finale
      case 'victory':
        [0, 100, 200, 350].forEach((delay, i) => {
          const freqs = [523, 659, 784, 1047];
          setTimeout(() => AUDIO._tone(freqs[i], 0.15, 0.45, 'sine'), delay);
        });
        break;

      // Erreur (or insuffisant)
      case 'error':
        AUDIO._tone(150, 0.12, 0.15, 'square');
        break;
    }
  },

  // ── SYNTHÈSE ─────────────────────────────────────────────────────────────────

  /**
   * Génère une tonalité simple avec enveloppe en décroissance exponentielle.
   * @param {number} freq     - Fréquence en Hz
   * @param {number} vol      - Volume initial (0-1)
   * @param {number} duration - Durée en secondes
   * @param {string} type     - Type d'oscillateur ('sine','square','sawtooth','triangle')
   */
  _tone(freq, vol, duration, type = 'sine') {
    if (!AUDIO._ctx) return;
    const ctx  = AUDIO._ctx;
    const now  = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type          = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(vol, now);
    // Décroissance exponentielle pour un son naturel
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  },
};
