/* =============================================
   waves.js — Étape 6 : Système de vagues
   Responsabilités :
     - Gère les 10 vagues d'ennemis
     - Difficulté croissante (HP +20%/vague, vitesse +6%/vague)
     - Timer inter-vague (8 s) + bouton "lancer maintenant"
     - Composition dynamique (BASIC / FAST / TANK selon la vague)
     - Déclenche victoire après la vague 10
     - Affiche le "niveau d'IA" dans le HUD
   ============================================= */

const WAVES = {

  MAX_WAVES:          10,
  BETWEEN_DELAY:       8,   // secondes entre les vagues

  current:            0,    // Vague en cours (0 = pas encore commencée)
  _waveActive:        false,
  _betweenTimer:      4,    // Countdown avant la 1ʳᵉ vague (démarrage plus rapide)
  _spawnQueue:        [],   // Liste des types à spawner dans la vague courante
  _spawnInterval:     1.2,  // Intervalle entre deux spawns (en secondes)
  _spawnTimer:        0,    // Compteur courant
  _scene:             null,

  // ── INIT ──────────────────────────────────────────────────────────────────────

  init(scene) {
    WAVES._scene = scene;

    scene.registerBeforeRender(() => {
      if (GAME_STATE.isGameOver || GAME_STATE.isVictory) return;
      const dt = scene.getEngine().getDeltaTime() / 1000;
      WAVES._update(dt);
    });

    // Prépare le bouton "Lancer" pour la vague 1
    UI.showNextWaveBtn(1);
    UI.updateWaveTimer(Math.ceil(WAVES._betweenTimer));
  },

  // ── BOUCLE ───────────────────────────────────────────────────────────────────

  _update(dt) {

    if (WAVES._waveActive) {
      // ── SPAWN en cours ────────────────────────────────────────────────────
      if (WAVES._spawnQueue.length > 0) {
        WAVES._spawnTimer -= dt;
        if (WAVES._spawnTimer <= 0) {
          const type = WAVES._spawnQueue.shift();
          ENEMIES.spawn(type, {
            hpMult:    WAVES.getHpMultiplier(),
            speedMult: WAVES.getSpeedMultiplier(),
          });
          WAVES._spawnTimer = WAVES._spawnInterval;
        }
      }
      // ── Fin de vague : plus d'ennemis en vie ni en spawn ─────────────────
      else if (ENEMIES.list.length === 0) {
        WAVES._waveActive = false;
        WAVES._onWaveComplete();
      }
    } else {
      // ── Décompte inter-vague ─────────────────────────────────────────────
      WAVES._betweenTimer -= dt;
      UI.updateWaveTimer(Math.max(0, Math.ceil(WAVES._betweenTimer)));

      if (WAVES._betweenTimer <= 0) {
        WAVES.launchNext();
      }
    }
  },

  // ── LANCEMENT ────────────────────────────────────────────────────────────────

  /**
   * Lance la vague suivante.
   * Peut être appelé manuellement (bouton "Lancer") ou automatiquement.
   */
  launchNext() {
    if (WAVES._waveActive) return;
    if (GAME_STATE.isGameOver || GAME_STATE.isVictory) return;

    WAVES.current++;

    if (WAVES.current > WAVES.MAX_WAVES) {
      GAME_STATE.triggerVictory();
      return;
    }

    GAME_STATE.setWave(WAVES.current);
    UI.updateAILevel(WAVES.current);
    UI.hideNextWaveBtn();

    WAVES._spawnQueue    = WAVES._buildQueue(WAVES.current);
    WAVES._spawnInterval = WAVES._calcSpawnInterval();
    WAVES._spawnTimer    = 0;          // premier spawn immédiat
    WAVES._waveActive    = true;

    UI.showNotif(`VAGUE  ${WAVES.current}  /  ${WAVES.MAX_WAVES}`, 'start', 2200);
    AUDIO.play('waveStart');

    console.log(
      `Vague ${WAVES.current} : ${WAVES._spawnQueue.length} ennemis`,
      `| HP×${WAVES.getHpMultiplier().toFixed(2)}`,
      `| SPD×${WAVES.getSpeedMultiplier().toFixed(2)}`
    );
  },

  /** Appelé quand tous les ennemis d'une vague sont éliminés. */
  _onWaveComplete() {
    if (WAVES.current >= WAVES.MAX_WAVES) {
      GAME_STATE.triggerVictory();
      return;
    }

    UI.showNotif(`Vague ${WAVES.current} repoussée !`, 'complete', 2000);
    AUDIO.play('waveComplete');

    // Bonus d'or en fin de vague
    const bonus = 20 + WAVES.current * 5;
    GAME_STATE.addGold(bonus);
    UI.showNotif(`+ ${bonus} or de récompense`, 'info', 1800);

    WAVES._betweenTimer = WAVES.BETWEEN_DELAY;
    UI.showNextWaveBtn(WAVES.current + 1);
  },

  // ── COMPOSITION DES VAGUES ───────────────────────────────────────────────────

  /**
   * Construit la liste ordonnée des types d'ennemis pour la vague N.
   * Vague spéciale 10 = assaut final avec beaucoup de tanks.
   */
  _buildQueue(wave) {
    let basic = 2 + wave;
    let fast  = Math.max(0, wave - 1);
    let tank  = Math.max(0, Math.floor((wave - 2) / 2));

    // Vague 10 : assaut final renforcé
    if (wave === 10) {
      basic = 8; fast = 6; tank = 4;
    }

    const queue = [
      ...Array(basic).fill('BASIC'),
      ...Array(fast).fill('FAST'),
      ...Array(tank).fill('TANK'),
    ];

    // Mélange aléatoire (Fisher-Yates)
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
  },

  /** Intervalle de spawn (diminue avec les vagues → attaque plus rapide). */
  _calcSpawnInterval() {
    return Math.max(0.50, 1.40 - WAVES.current * 0.09);
  },

  // ── MULTIPLICATEURS (utilisés par ENEMIES.spawn) ─────────────────────────────

  /** Multiplicateur de HP (croissance de +20% par vague). */
  getHpMultiplier() {
    return 1 + (WAVES.current - 1) * 0.20;
  },

  /** Multiplicateur de vitesse (croissance de +6% par vague). */
  getSpeedMultiplier() {
    return 1 + (WAVES.current - 1) * 0.06;
  },
};
