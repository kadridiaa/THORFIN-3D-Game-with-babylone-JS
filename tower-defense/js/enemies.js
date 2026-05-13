/* =============================================
   enemies.js — Système des ennemis (robots IA)
   Responsabilités :
     - Définit 3 types d'ennemis (BASIC, FAST, TANK)
     - Crée les meshes 3D de chaque ennemi (forme robot simple)
     - Implémente la state machine : SPAWNING → MOVING → ATTACKING → DEAD
     - Déplace les ennemis le long des waypoints (MAP.waypoints)
     - Gère les HP et la barre de vie
     - Inflige des dégâts à la base (GAME_STATE.loseLife)
   ============================================= */

const ENEMIES = {

  // ── LISTE ACTIVE ──────────────────────────────────────────────────────────────
  list:    [],   // Tous les ennemis vivants ou en cours de mort
  _nextId: 0,    // Compteur pour nommer les meshes de façon unique
  _scene:  null,

  // ── ÉTATS DE LA STATE MACHINE ────────────────────────────────────────────────
  STATE: {
    SPAWNING:  'spawning',   // Animation d'apparition
    MOVING:    'moving',     // Déplacement vers la base
    ATTACKING: 'attacking',  // Atteint la base → dégâts
    DEAD:      'dead',       // Animation de mort en cours
  },

  // ── TYPES D'ENNEMIS ──────────────────────────────────────────────────────────
  //
  // Chaque type a ses propres stats et couleur pour être visuellement distinct.
  //
  TYPES: {

    // Robot standard : équilibré
    BASIC: {
      label:  'BASIC',
      hp:     80,
      speed:  2.5,    // unités BabylonJS par seconde
      damage: 1,      // vies retirées à la base
      gold:   10,
      score:  10,
      bodyColor: new BABYLON.Color3(0.40, 0.45, 0.55),  // gris métallique
      headColor: new BABYLON.Color3(0.55, 0.60, 0.70),
      glowColor: new BABYLON.Color3(0.10, 0.50, 1.00),  // yeux bleus
      scale:  1.00,
    },

    // Robot rapide : fragile mais véloce
    FAST: {
      label:  'FAST',
      hp:     35,
      speed:  5.5,
      damage: 1,
      gold:   15,
      score:  15,
      bodyColor: new BABYLON.Color3(0.80, 0.75, 0.10),  // jaune chrome
      headColor: new BABYLON.Color3(0.90, 0.85, 0.20),
      glowColor: new BABYLON.Color3(1.00, 0.90, 0.00),  // yeux jaunes
      scale:  0.75,
    },

    // Robot tank : lent mais résistant
    TANK: {
      label:  'TANK',
      hp:     280,
      speed:  1.2,
      damage: 3,
      gold:   30,
      score:  30,
      bodyColor: new BABYLON.Color3(0.60, 0.12, 0.12),  // rouge foncé
      headColor: new BABYLON.Color3(0.70, 0.15, 0.15),
      glowColor: new BABYLON.Color3(1.00, 0.10, 0.00),  // yeux rouges
      scale:  1.50,
    },
  },

  // ── INITIALISATION ───────────────────────────────────────────────────────────

  /**
   * Initialise le système ennemi et s'enregistre dans la boucle de rendu.
   * À appeler une seule fois depuis main.js.
   * @param {BABYLON.Scene} scene
   */
  init(scene) {
    ENEMIES._scene = scene;

    // Enregistre la mise à jour dans la boucle de rendu BabylonJS
    scene.registerBeforeRender(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000; // secondes
      ENEMIES._updateAll(dt);
    });
  },

  // ── SPAWN ─────────────────────────────────────────────────────────────────────

  /**
   * Fait apparaître un ennemi au point SPAWN de la carte.
   * @param {string} typeName   - 'BASIC' | 'FAST' | 'TANK'
   * @param {object} waveOpts   - { hpMult, speedMult } fournis par waves.js
   * @returns {object} L'objet ennemi créé
   */
  spawn(typeName, waveOpts = {}) {
    const def = ENEMIES.TYPES[typeName];
    if (!def) {
      console.error(`Type d'ennemi inconnu : ${typeName}`);
      return null;
    }

    const id = ENEMIES._nextId++;

    // Applique les multiplicateurs de vague (HP et vitesse croissent avec les vagues)
    const hpMult   = waveOpts.hpMult    || 1;
    const spdMult  = waveOpts.speedMult || 1;
    const scaledHp = Math.round(def.hp * hpMult);

    // Position de départ = premier waypoint (tuile SPAWN)
    const startPos = MAP.waypoints[0].clone();

    // ── Objet ennemi (structure de données interne) ──────────────────────────
    const enemy = {
      id,
      type:           typeName,
      def,                            // référence au type (stats)
      state:          ENEMIES.STATE.SPAWNING,
      hp:             scaledHp,
      maxHp:          scaledHp,
      speed:          def.speed * spdMult,
      waypointIndex:  0,              // index du prochain waypoint à atteindre

      // Meshes 3D (remplis par _buildMesh)
      root:     null,   // TransformNode parent
      body:     null,   // Torse du robot
      head:     null,   // Tête du robot
      eyeL:     null,   // Œil gauche (emissive)
      eyeR:     null,   // Œil droit
      hpBarBg:  null,   // Fond de la barre de vie
      hpBarFill: null,  // Remplissage coloré (scale.x = hp%)

      // Timers
      spawnTimer: 0,    // Durée de l'animation d'apparition (0.4 s)
    };

    // Construit les meshes dans la scène
    ENEMIES._buildMesh(enemy, startPos);

    // Ajoute à la liste active
    ENEMIES.list.push(enemy);

    return enemy;
  },

  // ── CONSTRUCTION DU MESH ─────────────────────────────────────────────────────

  /**
   * Crée la représentation 3D du robot (corps + tête + yeux + barre HP).
   * Tous les meshes sont enfants du TransformNode `root`.
   */
  _buildMesh(enemy, startPos) {
    const scene = ENEMIES._scene;
    const def   = enemy.def;
    const s     = def.scale;   // facteur d'échelle global du type
    const id    = enemy.id;

    // ── NŒUD RACINE (invisible, sert de pivot de transformation) ─────────────
    const root = new BABYLON.TransformNode(`enemy_root_${id}`, scene);
    root.position = startPos.clone();
    root.position.y = 0; // pied au niveau du sol (PATH tiles : top à y=0.10)
    enemy.root = root;

    // ── MATÉRIAUX ─────────────────────────────────────────────────────────────
    const bodyMat = new BABYLON.StandardMaterial(`eMat_body_${id}`, scene);
    bodyMat.diffuseColor  = def.bodyColor;
    bodyMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    const headMat = new BABYLON.StandardMaterial(`eMat_head_${id}`, scene);
    headMat.diffuseColor  = def.headColor;
    headMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    const eyeMat = new BABYLON.StandardMaterial(`eMat_eye_${id}`, scene);
    eyeMat.emissiveColor = def.glowColor; // yeux lumineux (pas affectés par la lumière)

    // ── TORSE ─────────────────────────────────────────────────────────────────
    const body = BABYLON.MeshBuilder.CreateBox(`enemy_body_${id}`, {
      width:  0.55 * s,
      height: 0.65 * s,
      depth:  0.35 * s,
    }, scene);
    body.parent = root;
    body.position.y = 0.45 * s; // centre du torse au-dessus du sol
    body.material  = bodyMat;
    body.isPickable = false;
    enemy.body = body;

    // ── TÊTE ──────────────────────────────────────────────────────────────────
    const head = BABYLON.MeshBuilder.CreateBox(`enemy_head_${id}`, {
      width:  0.42 * s,
      height: 0.35 * s,
      depth:  0.38 * s,
    }, scene);
    head.parent = root;
    head.position.y = 0.95 * s; // au-dessus du torse
    head.material  = headMat;
    head.isPickable = false;
    enemy.head = head;

    // ── YEUX (petits cubes émissifs) ──────────────────────────────────────────
    const eyeSize = 0.09 * s;
    const eyeDepth = 0.42 * s * 0.5 + 0.01; // légèrement devant la tête

    const eyeL = BABYLON.MeshBuilder.CreateBox(`enemy_eyeL_${id}`, {
      width: eyeSize, height: eyeSize, depth: 0.04,
    }, scene);
    eyeL.parent = root;
    eyeL.position.set(-0.12 * s, 0.97 * s, eyeDepth);
    eyeL.material  = eyeMat;
    eyeL.isPickable = false;
    enemy.eyeL = eyeL;

    const eyeR = BABYLON.MeshBuilder.CreateBox(`enemy_eyeR_${id}`, {
      width: eyeSize, height: eyeSize, depth: 0.04,
    }, scene);
    eyeR.parent = root;
    eyeR.position.set(0.12 * s, 0.97 * s, eyeDepth);
    eyeR.material  = eyeMat;
    eyeR.isPickable = false;
    enemy.eyeR = eyeR;

    // ── BARRE DE VIE ──────────────────────────────────────────────────────────
    ENEMIES._buildHpBar(enemy);

    // ── ANIMATION D'APPARITION : scale de 0 → 1 en 0.4 s ────────────────────
    root.scaling = BABYLON.Vector3.Zero();
  },

  /**
   * Crée la barre de vie au-dessus de la tête de l'ennemi.
   * Deux boîtes : fond gris + remplissage coloré.
   */
  _buildHpBar(enemy) {
    const scene = ENEMIES._scene;
    const id    = enemy.id;
    const s     = enemy.def.scale;
    const W     = 0.70 * s; // largeur totale de la barre

    // Fond sombre
    const bg = BABYLON.MeshBuilder.CreateBox(`hp_bg_${id}`, {
      width: W + 0.06, height: 0.08, depth: 0.12,
    }, scene);
    bg.parent = enemy.root;
    bg.position.y = 1.35 * s;

    const bgMat = new BABYLON.StandardMaterial(`hp_bgMat_${id}`, scene);
    bgMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    bg.material  = bgMat;
    bg.isPickable = false;
    enemy.hpBarBg = bg;

    // Remplissage vert (scale.x va varier de 0 à 1)
    const fill = BABYLON.MeshBuilder.CreateBox(`hp_fill_${id}`, {
      width: W, height: 0.10, depth: 0.14,
    }, scene);
    fill.parent = enemy.root;
    fill.position.y = 1.35 * s;

    const fillMat = new BABYLON.StandardMaterial(`hp_fillMat_${id}`, scene);
    fillMat.diffuseColor  = new BABYLON.Color3(0.2, 0.9, 0.2);
    fillMat.emissiveColor = new BABYLON.Color3(0.05, 0.25, 0.05);
    fill.material  = fillMat;
    fill.isPickable = false;
    enemy.hpBarFill    = fill;
    enemy.hpBarFillMat = fillMat; // gardé pour changer la couleur
    enemy.hpBarFullW   = W;       // largeur de référence (100% HP)
  },

  // ── DÉGÂTS ET HP ─────────────────────────────────────────────────────────────

  /**
   * Inflige des dégâts à un ennemi. Appelé par les tourelles (Étape 5).
   * @param {object} enemy - L'objet ennemi ciblé
   * @param {number} amount - Quantité de dégâts
   */
  damage(enemy, amount) {
    if (enemy.state === ENEMIES.STATE.DEAD) return;

    enemy.hp -= amount;
    ENEMIES._updateHpBar(enemy);

    if (enemy.hp <= 0) {
      ENEMIES._kill(enemy);
    }
  },

  /**
   * Met à jour la barre de vie (couleur + scale) selon le % de HP restant.
   */
  _updateHpBar(enemy) {
    const pct = Math.max(0, enemy.hp / enemy.maxHp); // 0.0 → 1.0

    // Scale X : la barre rétrécit vers le centre (BabylonJS centres les boîtes)
    enemy.hpBarFill.scaling.x = pct;

    // Couleur : vert → jaune → rouge
    const r = pct < 0.5 ? 1.0 : (1.0 - pct) * 2;
    const g = pct > 0.5 ? 1.0 : pct * 2;
    enemy.hpBarFillMat.diffuseColor  = new BABYLON.Color3(r, g, 0);
    enemy.hpBarFillMat.emissiveColor = new BABYLON.Color3(r * 0.15, g * 0.15, 0);
  },

  // ── BOUCLE DE MISE À JOUR ────────────────────────────────────────────────────

  /**
   * Mise à jour de tous les ennemis actifs (appelée chaque frame via registerBeforeRender).
   * @param {number} dt - DeltaTime en secondes
   */
  _updateAll(dt) {
    // Itère en sens inverse pour pouvoir supprimer pendant l'itération
    for (let i = ENEMIES.list.length - 1; i >= 0; i--) {
      const enemy = ENEMIES.list[i];
      ENEMIES._updateEnemy(enemy, dt);

      // Supprime les ennemis dont la mort est terminée
      if (enemy.state === ENEMIES.STATE.DEAD && enemy._readyToRemove) {
        ENEMIES.list.splice(i, 1);
      }
    }
  },

  /**
   * State machine d'un ennemi individuel.
   */
  _updateEnemy(enemy, dt) {
    switch (enemy.state) {

      // ── SPAWNING : animation d'apparition (scale 0→1 en 0.4 s) ─────────────
      case ENEMIES.STATE.SPAWNING:
        enemy.spawnTimer += dt;
        const t = Math.min(enemy.spawnTimer / 0.4, 1.0);
        // Fonction ease-out pour un rebond doux
        const eased = 1 - Math.pow(1 - t, 3);
        enemy.root.scaling.setAll(eased);

        if (t >= 1.0) {
          enemy.state = ENEMIES.STATE.MOVING;
        }
        break;

      // ── MOVING : suivi des waypoints ─────────────────────────────────────────
      case ENEMIES.STATE.MOVING:
        ENEMIES._moveTowardWaypoint(enemy, dt);
        break;

      // ── ATTACKING : inflige les dégâts et passe à DEAD ───────────────────────
      case ENEMIES.STATE.ATTACKING:
        GAME_STATE.loseLife(enemy.def.damage);
        if (typeof AUDIO !== 'undefined') AUDIO.play('baseDamage');
        enemy.state = ENEMIES.STATE.DEAD;
        ENEMIES._playDeathAnim(enemy);
        break;

      // ── DEAD : en attente de nettoyage après animation ────────────────────────
      case ENEMIES.STATE.DEAD:
        // Rien à faire ici : _readyToRemove est posé par le callback d'animation
        break;
    }
  },

  /**
   * Déplace l'ennemi vers son prochain waypoint.
   * Passe au waypoint suivant quand suffisamment proche.
   */
  _moveTowardWaypoint(enemy, dt) {
    const waypoints = MAP.waypoints;

    // A-t-on épuisé tous les waypoints → ennemi arrive à la base
    if (enemy.waypointIndex >= waypoints.length) {
      enemy.state = ENEMIES.STATE.ATTACKING;
      return;
    }

    const target = waypoints[enemy.waypointIndex];
    const pos    = enemy.root.position;

    // Vecteur de déplacement (on ignore Y : les ennemis restent au sol)
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Seuil d'arrivée : 0.1 unité → waypoint considéré atteint
    if (dist < 0.10) {
      enemy.waypointIndex++;
      return;
    }

    // Normalise et applique la vitesse
    const step = enemy.speed * dt;
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;

    // Oriente le robot vers sa direction de marche
    // atan2(x, z) donne l'angle dans le plan horizontal BabylonJS (axe Z = avant)
    enemy.root.rotation.y = Math.atan2(dx, dz);

    // Animation de marche : léger balancement vertical de la tête
    const bobAmp  = 0.04 * enemy.def.scale;
    const bobFreq = enemy.speed * 3.5;
    const time    = ENEMIES._scene.getEngine().getDeltaTime() * 0.001;
    enemy.head.position.y = 0.95 * enemy.def.scale
      + Math.sin(Date.now() * 0.001 * bobFreq) * bobAmp;
  },

  // ── MORT ──────────────────────────────────────────────────────────────────────

  /**
   * Tue l'ennemi : récompense le joueur et lance l'animation de mort.
   */
  _kill(enemy) {
    if (enemy.state === ENEMIES.STATE.DEAD) return;
    enemy.state = ENEMIES.STATE.DEAD;

    // Récompense
    GAME_STATE.addGold(enemy.def.gold);
    GAME_STATE.addScore(enemy.def.score);

    // Effets visuels et sonores
    if (typeof EFFECTS !== 'undefined' && enemy.root) {
      EFFECTS.onEnemyDeath(enemy.root.position.clone());
    }
    if (typeof AUDIO !== 'undefined') AUDIO.play('enemyDeath');

    ENEMIES._playDeathAnim(enemy);
  },

  /**
   * Lance l'animation de mort : écrasement vers le sol + disparition.
   * Dispose tous les meshes quand c'est terminé.
   */
  _playDeathAnim(enemy) {
    const scene = ENEMIES._scene;
    const root  = enemy.root;
    const fps   = 30;

    // Animation : écrase l'ennemi (scale Y → 0, scale XZ → 1.5)
    const anim = new BABYLON.Animation(
      `death_${enemy.id}`,
      'scaling',
      fps,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    anim.setKeys([
      { frame: 0,      value: new BABYLON.Vector3(1, 1, 1) },
      { frame: fps * 0.25, value: new BABYLON.Vector3(1.4, 0.1, 1.4) },
      { frame: fps * 0.5,  value: new BABYLON.Vector3(0,   0,   0  ) },
    ]);

    root.animations = [anim];
    scene.beginAnimation(root, 0, fps * 0.5, false, 1, () => {
      // Nettoie tous les meshes enfants
      root.getChildMeshes().forEach(m => m.dispose());
      root.dispose();
      enemy._readyToRemove = true; // signal pour _updateAll()
    });
  },
};
