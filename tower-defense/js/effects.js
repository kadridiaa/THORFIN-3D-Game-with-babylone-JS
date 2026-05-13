/* =============================================
   effects.js — Étape 8 : Effets visuels
   Responsabilités :
     - Explosions de particules à l'impact et à la mort
     - Flash d'apparition de tourelle (géré dans towers.js)
   ============================================= */

const EFFECTS = {

  _scene:          null,
  _particleTex:    null,  // Texture circulaire partagée par tous les systèmes

  // ── INIT ──────────────────────────────────────────────────────────────────────

  init(scene) {
    EFFECTS._scene = scene;
    EFFECTS._particleTex = EFFECTS._makeCircleTexture(scene);
  },

  /**
   * Crée une texture circulaire blanche par DynamicTexture (pas de fichier requis).
   */
  _makeCircleTexture(scene) {
    const size = 32;
    const tex  = new BABYLON.DynamicTexture('particleTex', size, scene, false);
    const ctx  = tex.getContext();
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    tex.update();
    return tex;
  },

  // ── EFFETS PUBLICS ────────────────────────────────────────────────────────────

  /** Petit flash jaune à l'impact d'un projectile. */
  onHit(position) {
    EFFECTS._burst(position, {
      count:    10,
      color1:   new BABYLON.Color4(1.0, 0.85, 0.2, 1),
      color2:   new BABYLON.Color4(1.0, 0.40, 0.0, 1),
      minSize:  0.04,
      maxSize:  0.14,
      minLife:  0.10,
      maxLife:  0.22,
      power:    [1.5, 3.5],
      dir1:     new BABYLON.Vector3(-1, 0.5, -1),
      dir2:     new BABYLON.Vector3( 1, 2.5,  1),
    });
  },

  /** Grande explosion rouge/orange à la mort d'un ennemi. */
  onEnemyDeath(position) {
    EFFECTS._burst(position, {
      count:    22,
      color1:   new BABYLON.Color4(1.0, 0.30, 0.05, 1),
      color2:   new BABYLON.Color4(0.8, 0.15, 0.00, 1),
      minSize:  0.08,
      maxSize:  0.30,
      minLife:  0.25,
      maxLife:  0.55,
      power:    [2, 6],
      dir1:     new BABYLON.Vector3(-1, 1, -1),
      dir2:     new BABYLON.Vector3( 1, 5,  1),
    });
  },

  /** Flash bleu-blanc sur une tuile (fonds insuffisants — géré dans towers.js). */
  onTowerPlace(position) {
    EFFECTS._burst(position, {
      count:    12,
      color1:   new BABYLON.Color4(0.5, 0.8, 1.0, 1),
      color2:   new BABYLON.Color4(0.2, 0.5, 1.0, 1),
      minSize:  0.05,
      maxSize:  0.18,
      minLife:  0.15,
      maxLife:  0.30,
      power:    [1, 3],
      dir1:     new BABYLON.Vector3(-1, 1, -1),
      dir2:     new BABYLON.Vector3( 1, 3,  1),
    });
  },

  // ── BURST GÉNÉRIQUE ───────────────────────────────────────────────────────────

  /**
   * Lance un système de particules en burst (one-shot) à la position donnée.
   * Le système se supprime automatiquement après la durée de vie des particules.
   */
  _burst(position, opts) {
    if (!EFFECTS._scene) return;

    const ps = new BABYLON.ParticleSystem('fx', opts.count, EFFECTS._scene);
    ps.particleTexture = EFFECTS._particleTex;

    // Émetteur ponctuel fixe
    ps.emitter        = position instanceof BABYLON.Vector3
      ? position.clone()
      : new BABYLON.Vector3(position.x, position.y, position.z);
    ps.minEmitBox = BABYLON.Vector3.Zero();
    ps.maxEmitBox = BABYLON.Vector3.Zero();

    // Apparence
    ps.color1      = opts.color1;
    ps.color2      = opts.color2;
    ps.colorDead   = new BABYLON.Color4(0, 0, 0, 0);
    ps.minSize     = opts.minSize;
    ps.maxSize     = opts.maxSize;
    ps.minLifeTime = opts.minLife;
    ps.maxLifeTime = opts.maxLife;

    // Physique
    ps.emitRate         = opts.count * 60;  // toutes les particules en 1 frame
    ps.minEmitPower     = opts.power[0];
    ps.maxEmitPower     = opts.power[1];
    ps.direction1       = opts.dir1;
    ps.direction2       = opts.dir2;
    ps.gravity          = new BABYLON.Vector3(0, -6, 0);
    ps.updateSpeed      = 0.02;
    ps.blendMode        = BABYLON.ParticleSystem.BLENDMODE_ADD;
    ps.isLocal          = false;

    ps.start();

    // Arrête l'émission après 1 frame (burst unique)
    setTimeout(() => {
      ps.stop();
      // Dispose après la durée de vie maximale
      setTimeout(() => { try { ps.dispose(); } catch (_) {} }, opts.maxLife * 1200);
    }, 30);
  },
};
