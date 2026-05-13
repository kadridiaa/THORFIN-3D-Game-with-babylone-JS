/* =============================================
   game-state.js — État global du jeu
   Responsabilités :
     - Centralise les données partagées (vies, or, score, vague)
     - Met à jour le HUD à chaque changement
     - Déclenche game over / victoire
   ============================================= */

const GAME_STATE = {

  // ── DONNÉES ──────────────────────────────────────────────────────────────────
  lives:      20,    // Points de vie de la base
  gold:       100,   // Or disponible pour acheter des tourelles
  score:      0,     // Score total
  wave:       0,     // Numéro de la vague courante
  isGameOver: false,
  isVictory:  false,

  // ── MISE À JOUR DU HUD ───────────────────────────────────────────────────────

  /** Recharge tous les éléments du HUD depuis l'état courant. */
  refreshHUD() {
    document.getElementById('hud-wave').textContent  = `Vague : ${this.wave}`;
    document.getElementById('hud-gold').textContent  = `Or : ${this.gold}`;
    document.getElementById('hud-lives').textContent = `Vie base : ❤️ ${this.lives}`;
    document.getElementById('hud-score').textContent = `Score : ${this.score}`;
  },

  // ── ACTIONS ──────────────────────────────────────────────────────────────────

  /**
   * Retire des points de vie à la base.
   * Déclenche le game over si les vies tombent à 0.
   * @param {number} amount - Dégâts (défaut : 1)
   */
  loseLife(amount = 1) {
    if (this.isGameOver) return;
    this.lives = Math.max(0, this.lives - amount);
    document.getElementById('hud-lives').textContent = `Vie base : ❤️ ${this.lives}`;

    if (this.lives <= 0) {
      this.isGameOver = true;
      this._triggerGameOver();
    }
  },

  /**
   * Ajoute de l'or (récompense de kill).
   * @param {number} amount
   */
  addGold(amount) {
    this.gold += amount;
    document.getElementById('hud-gold').textContent = `Or : ${this.gold}`;
  },

  /**
   * Dépense de l'or. Renvoie false si fonds insuffisants.
   * @param {number} amount
   * @returns {boolean}
   */
  spendGold(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    document.getElementById('hud-gold').textContent = `Or : ${this.gold}`;
    return true;
  },

  /**
   * Ajoute des points de score.
   * @param {number} amount
   */
  addScore(amount) {
    this.score += amount;
    document.getElementById('hud-score').textContent = `Score : ${this.score}`;
  },

  /**
   * Passe à la vague suivante.
   * @param {number} waveNumber
   */
  setWave(waveNumber) {
    this.wave = waveNumber;
    document.getElementById('hud-wave').textContent = `Vague : ${this.wave}`;
  },

  // ── FIN DE PARTIE ────────────────────────────────────────────────────────────

  /** Affiche l'écran game over. */
  _triggerGameOver() {
    console.warn('GAME OVER — La base est détruite !');
    if (typeof AUDIO !== 'undefined') AUDIO.play('gameOver');
    if (typeof UI    !== 'undefined') UI.showGameOver();
  },

  /** Déclenche la victoire (appelé par waves.js après la dernière vague). */
  triggerVictory() {
    this.isVictory = true;
    console.log('VICTOIRE !');
    if (typeof AUDIO !== 'undefined') AUDIO.play('victory');
    if (typeof UI    !== 'undefined') UI.showVictory();
  },
};
