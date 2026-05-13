/* =============================================
   towers.js — Placement + Tir des tourelles (Étapes 4 & 5)
   Responsabilités :
     - Sélection du type (panneau + clavier 1/2/3)
     - Hover + aperçu de portée
     - Placement au clic (coût en or, validation, mesh 3D)
     - Boucle de tir : ciblage, rotation du canon, appel PROJECTILES.fire()
   ============================================= */

const TOWERS = {

  // ── LISTE DES TOURELLES POSÉES ────────────────────────────────────────────────
  list: [],

  // Type sélectionné par le joueur (modifié via UI ou clavier)
  selectedType: 'BASIC',

  // Références internes
  _scene:         null,
  _hoveredMesh:   null,   // Tuile actuellement survolée
  _rangePreview:  null,   // Disque de portée affiché au survol
  _occupiedTiles: new Set(), // "col,row" des tuiles avec une tourelle

  // ── TYPES DE TOURELLES ────────────────────────────────────────────────────────
  TYPES: {

    // Tourelle standard : polyvalente
    BASIC: {
      label:    'Standard',
      cost:     50,
      damage:   20,
      range:    4.0,      // rayon en unités BabylonJS
      fireRate: 1.0,      // tirs par seconde
      key:      '1',
      bodyColor:   new BABYLON.Color3(0.20, 0.50, 0.80),
      barrelColor: new BABYLON.Color3(0.15, 0.35, 0.60),
      baseColor:   new BABYLON.Color3(0.25, 0.28, 0.35),
      rangeColor:  new BABYLON.Color3(0.20, 0.50, 1.00),
    },

    // Tourelle sniper : longue portée, lente
    SNIPER: {
      label:    'Sniper',
      cost:     75,
      damage:   60,
      range:    7.5,
      fireRate: 0.4,
      key:      '2',
      bodyColor:   new BABYLON.Color3(0.15, 0.65, 0.30),
      barrelColor: new BABYLON.Color3(0.10, 0.45, 0.20),
      baseColor:   new BABYLON.Color3(0.20, 0.30, 0.22),
      rangeColor:  new BABYLON.Color3(0.10, 0.90, 0.30),
    },

    // Tourelle mitrailleuse : courte portée, très rapide
    RAPID: {
      label:    'Mitrailleuse',
      cost:     40,
      damage:   8,
      range:    3.0,
      fireRate: 3.5,
      key:      '3',
      bodyColor:   new BABYLON.Color3(0.80, 0.45, 0.10),
      barrelColor: new BABYLON.Color3(0.60, 0.30, 0.05),
      baseColor:   new BABYLON.Color3(0.32, 0.24, 0.15),
      rangeColor:  new BABYLON.Color3(1.00, 0.55, 0.10),
    },
  },

  // ── INITIALISATION ───────────────────────────────────────────────────────────

  /**
   * Initialise le système de tourelles.
   * À appeler une fois depuis main.js après MAP.create().
   */
  init(scene) {
    TOWERS._scene = scene;
    TOWERS._createRangePreview(scene);
    TOWERS._registerPointerEvents(scene);
    TOWERS._registerKeyboardEvents();
    TOWERS._refreshPanelUI();

    // ── BOUCLE DE TIR (Étape 5) ────────────────────────────────────────────
    scene.registerBeforeRender(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      TOWERS._updateShooting(dt);
    });
  },

  // ── SÉLECTION DU TYPE ─────────────────────────────────────────────────────────

  /**
   * Sélectionne le type de tourelle à placer.
   * Met à jour le panneau HTML et l'aperçu de portée.
   * @param {string} typeName - 'BASIC' | 'SNIPER' | 'RAPID'
   */
  selectType(typeName) {
    if (!TOWERS.TYPES[typeName]) return;
    TOWERS.selectedType = typeName;
    TOWERS._refreshPanelUI();

    // Met à jour la couleur et le rayon du disque de portée si visible
    if (TOWERS._rangePreview.isEnabled()) {
      TOWERS._updateRangePreviewColor();
    }
  },

  /** Synchronise l'état visuel du panneau avec selectedType. */
  _refreshPanelUI() {
    document.querySelectorAll('.tower-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === TOWERS.selectedType);
    });
  },

  // ── ÉVÉNEMENTS CLAVIER ────────────────────────────────────────────────────────

  _registerKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      Object.values(TOWERS.TYPES).forEach(def => {
        if (e.key === def.key) TOWERS.selectType(
          Object.keys(TOWERS.TYPES).find(k => TOWERS.TYPES[k] === def)
        );
      });
    });
  },

  // ── APERÇU DE PORTÉE ──────────────────────────────────────────────────────────

  /**
   * Crée le disque de portée (un cylindre plat semi-transparent).
   * Il est masqué par défaut et déplacé au survol des tuiles.
   */
  _createRangePreview(scene) {
    const disc = BABYLON.MeshBuilder.CreateCylinder('rangePreview', {
      diameter:    1,          // mis à l'échelle dynamiquement
      height:      0.04,
      tessellation: 48,
    }, scene);

    const mat = new BABYLON.StandardMaterial('rangePreviewMat', scene);
    mat.diffuseColor  = new BABYLON.Color3(0.2, 0.5, 1.0);
    mat.alpha         = 0.22;
    mat.wireframe     = false;
    mat.backFaceCulling = false;
    disc.material  = mat;
    disc.isPickable = false;
    disc.setEnabled(false); // caché au départ

    TOWERS._rangePreview     = disc;
    TOWERS._rangePreviewMat  = mat;
  },

  /** Déplace et redimensionne le disque de portée sur la tuile cible. */
  _showRangePreview(worldPos) {
    const def  = TOWERS.TYPES[TOWERS.selectedType];
    const disc = TOWERS._rangePreview;

    disc.position.x = worldPos.x;
    disc.position.y = 0.05;
    disc.position.z = worldPos.z;
    disc.scaling.x  = def.range * 2;
    disc.scaling.z  = def.range * 2;
    disc.setEnabled(true);
  },

  _hideRangePreview() {
    TOWERS._rangePreview.setEnabled(false);
  },

  /** Recolore le disque selon le type sélectionné. */
  _updateRangePreviewColor() {
    const def = TOWERS.TYPES[TOWERS.selectedType];
    TOWERS._rangePreviewMat.diffuseColor = def.rangeColor;
  },

  // ── HOVER — SURBRILLANCE DE TUILE ────────────────────────────────────────────

  /** Applique une surbrillance dorée à la tuile pickable survolée. */
  _highlightTile(mesh) {
    if (TOWERS._hoveredMesh === mesh) return;
    TOWERS._clearHighlight();

    // Vérifie que la tuile est constructible (EMPTY et non occupée)
    const { col, row } = mesh.metadata;
    if (!TOWERS._isTileAvailable(col, row)) return;

    TOWERS._hoveredMesh = mesh;
    mesh.material.emissiveColor = new BABYLON.Color3(0.28, 0.22, 0.04);
    TOWERS._showRangePreview(mesh.position);
    TOWERS._updateRangePreviewColor();
  },

  /** Supprime la surbrillance de la tuile précédemment survolée. */
  _clearHighlight() {
    if (!TOWERS._hoveredMesh) return;
    TOWERS._hoveredMesh.material.emissiveColor = BABYLON.Color3.Black();
    TOWERS._hoveredMesh = null;
    TOWERS._hideRangePreview();
  },

  // ── VALIDATION DE PLACEMENT ───────────────────────────────────────────────────

  /**
   * Indique si une tuile est disponible pour une tourelle.
   * @param {number} col
   * @param {number} row
   */
  _isTileAvailable(col, row) {
    return MAP.isBuildable(col, row) &&
           !TOWERS._occupiedTiles.has(`${col},${row}`);
  },

  // ── ÉVÉNEMENTS POINTEUR ───────────────────────────────────────────────────────

  _registerPointerEvents(scene) {
    scene.onPointerObservable.add((info) => {
      switch (info.type) {

        // Survol : highlight + aperçu de portée
        case BABYLON.PointerEventTypes.POINTERMOVE: {
          const hit = scene.pick(
            scene.pointerX, scene.pointerY,
            mesh => mesh.isPickable && mesh.metadata && mesh.metadata.type === MAP.TILE.EMPTY
          );
          if (hit.hit && hit.pickedMesh) {
            TOWERS._highlightTile(hit.pickedMesh);
          } else {
            TOWERS._clearHighlight();
          }
          break;
        }

        // Clic gauche : tenter de poser la tourelle
        case BABYLON.PointerEventTypes.POINTERDOWN: {
          if (info.event.button !== 0) break; // bouton gauche uniquement

          const hit = scene.pick(
            scene.pointerX, scene.pointerY,
            mesh => mesh.isPickable && mesh.metadata && mesh.metadata.type === MAP.TILE.EMPTY
          );
          if (hit.hit && hit.pickedMesh) {
            const { col, row } = hit.pickedMesh.metadata;
            TOWERS.placeTower(col, row, hit.pickedMesh);
          }
          break;
        }
      }
    });
  },

  // ── PLACEMENT ─────────────────────────────────────────────────────────────────

  /**
   * Place une tourelle sur la tuile (col, row).
   * Vérifie la disponibilité et le solde d'or.
   * @param {number} col
   * @param {number} row
   * @param {BABYLON.Mesh} tileMesh - Le mesh de la tuile cliquée
   */
  placeTower(col, row, tileMesh) {
    if (!TOWERS._isTileAvailable(col, row)) return;

    const def = TOWERS.TYPES[TOWERS.selectedType];

    // Vérifie les fonds
    if (!GAME_STATE.spendGold(def.cost)) {
      TOWERS._flashError(tileMesh);
      return;
    }

    // Marque la tuile comme occupée
    TOWERS._occupiedTiles.add(`${col},${row}`);
    tileMesh.isPickable = false;
    tileMesh.material.emissiveColor = BABYLON.Color3.Black();
    tileMesh.material.diffuseColor  = new BABYLON.Color3(0.12, 0.16, 0.22);

    // Position monde du centre de la tuile
    const tileCenter = MAP.gridToWorld(col, row);

    // Objet tourelle
    const tower = {
      col, row,
      type:        TOWERS.selectedType,
      def,
      damage:      def.damage,
      range:       def.range,
      fireRate:    def.fireRate,
      cooldown:    0,             // temps restant avant prochain tir (Étape 5)
      target:      null,          // ennemi actuellement ciblé (Étape 5)
      root:        null,          // TransformNode principal
      barrelNode:  null,          // Nœud qui pivote pour viser (Étape 5)
    };

    TOWERS._buildMesh(tower, tileCenter);
    TOWERS.list.push(tower);

    // Son + effet visuel de pose
    if (typeof AUDIO   !== 'undefined') AUDIO.play('place');
    if (typeof EFFECTS !== 'undefined') EFFECTS.onTowerPlace(
      new BABYLON.Vector3(tileCenter.x, 0.5, tileCenter.z)
    );

    TOWERS._clearHighlight();
    console.log(
      `Tourelle ${def.label} posée en (${col},${row}) — Or restant : ${GAME_STATE.gold}`
    );
  },

  // ── CONSTRUCTION DU MESH 3D ───────────────────────────────────────────────────

  /**
   * Crée le modèle 3D de la tourelle (base plate + corps + tourelle rotative + canon).
   * Tous les meshes sont enfants d'un TransformNode `root`.
   * @param {object} tower - L'objet tourelle
   * @param {BABYLON.Vector3} tileCenter - Position monde de la tuile
   */
  _buildMesh(tower, tileCenter) {
    const scene = TOWERS._scene;
    const def   = tower.def;
    const id    = `${tower.col}_${tower.row}`;

    // ── MATÉRIAUX ────────────────────────────────────────────────────────────
    const baseMat = new BABYLON.StandardMaterial(`twrBase_${id}`, scene);
    baseMat.diffuseColor  = def.baseColor;
    baseMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);

    const bodyMat = new BABYLON.StandardMaterial(`twrBody_${id}`, scene);
    bodyMat.diffuseColor  = def.bodyColor;
    bodyMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    const barrelMat = new BABYLON.StandardMaterial(`twrBarrel_${id}`, scene);
    barrelMat.diffuseColor  = def.barrelColor;
    barrelMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    // ── NŒUD RACINE ─────────────────────────────────────────────────────────
    const root = new BABYLON.TransformNode(`tower_root_${id}`, scene);
    root.position = new BABYLON.Vector3(tileCenter.x, 0, tileCenter.z);
    tower.root = root;

    // ── SOCLE PLAT (cylindre large et fin) ─────────────────────────────────
    const base = BABYLON.MeshBuilder.CreateCylinder(`twr_base_${id}`, {
      diameter:     1.60,
      height:       0.20,
      tessellation: 12,
    }, scene);
    base.parent = root;
    base.position.y = 0.10;
    base.material   = baseMat;
    base.isPickable = false;

    // ── CORPS CENTRAL ───────────────────────────────────────────────────────
    const body = BABYLON.MeshBuilder.CreateCylinder(`twr_body_${id}`, {
      diameterTop:    0.50,
      diameterBottom: 0.65,
      height:         0.70,
      tessellation:   10,
    }, scene);
    body.parent = root;
    body.position.y = 0.55;
    body.material   = bodyMat;
    body.isPickable = false;

    // ── TÊTE ROTATIVE (sera animée par towers.js à l'Étape 5) ──────────────
    const barrelNode = new BABYLON.TransformNode(`twr_turret_${id}`, scene);
    barrelNode.parent = root;
    barrelNode.position.y = 0.95;
    tower.barrelNode = barrelNode;

    // Capot de la tourelle (boîte carrée)
    const cap = BABYLON.MeshBuilder.CreateBox(`twr_cap_${id}`, {
      width: 0.55, height: 0.30, depth: 0.55,
    }, scene);
    cap.parent = barrelNode;
    cap.position.y = 0;
    cap.material   = bodyMat;
    cap.isPickable = false;

    // Canon (long cylindre fin pointant vers l'avant / +Z)
    const barrelLength = tower.type === 'SNIPER' ? 0.80 : 0.50;
    const barrel = BABYLON.MeshBuilder.CreateCylinder(`twr_barrel_${id}`, {
      diameter:     0.11,
      height:       barrelLength,
      tessellation: 8,
    }, scene);
    barrel.parent = barrelNode;
    // Rotation de 90° sur X pour que le cylindre pointe vers l'avant (axe Z)
    barrel.rotation.x  = Math.PI / 2;
    barrel.position.z  = barrelLength / 2 + 0.27;
    barrel.position.y  = 0;
    barrel.material    = barrelMat;
    barrel.isPickable  = false;

    // ── ANNEAU LUMINEUX (type-specific) ────────────────────────────────────
    const ring = BABYLON.MeshBuilder.CreateTorus(`twr_ring_${id}`, {
      diameter:      0.75,
      thickness:     0.07,
      tessellation:  24,
    }, scene);
    ring.parent = root;
    ring.position.y = 0.90;
    const ringMat = new BABYLON.StandardMaterial(`twr_ringMat_${id}`, scene);
    ringMat.emissiveColor = def.rangeColor.scale(0.6);
    ring.material   = ringMat;
    ring.isPickable = false;

    // ── ANIMATION D'APPARITION : scale Y de 0 → 1 en 0.3 s ────────────────
    root.scaling.y = 0;
    const anim = new BABYLON.Animation(
      `twr_appear_${id}`, 'scaling.y', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    anim.setKeys([
      { frame: 0,  value: 0 },
      { frame: 7,  value: 1.15 },  // légère surextension (rebond)
      { frame: 10, value: 1.0 },
    ]);
    root.animations = [anim];
    scene.beginAnimation(root, 0, 10, false);
  },

  // ── FEEDBACK VISUEL — FONDS INSUFFISANTS ─────────────────────────────────────

  /** Fait clignoter la tuile en rouge si le joueur manque d'or. */
  _flashError(tileMesh) {
    tileMesh.material.emissiveColor = new BABYLON.Color3(0.6, 0, 0);
    if (typeof AUDIO !== 'undefined') AUDIO.play('error');
    setTimeout(() => {
      if (tileMesh.material) tileMesh.material.emissiveColor = BABYLON.Color3.Black();
    }, 350);
  },

  // ── TIR (Étape 5) ────────────────────────────────────────────────────────────

  /**
   * Mise à jour du tir de toutes les tourelles (appelée chaque frame).
   * Pour chaque tourelle dont le cooldown est écoulé :
   *   1. Trouve l'ennemi le plus avancé dans la portée
   *   2. Oriente le canon vers lui
   *   3. Crée un projectile via PROJECTILES.fire()
   */
  _updateShooting(dt) {
    TOWERS.list.forEach(tower => {
      // Décrémente le cooldown de recharge
      if (tower.cooldown > 0) {
        tower.cooldown -= dt;
        return;
      }

      const target = TOWERS._findTarget(tower);
      if (!target) return;

      // Oriente la tête de la tourelle (barrelNode) vers l'ennemi
      const dx = target.root.position.x - tower.root.position.x;
      const dz = target.root.position.z - tower.root.position.z;
      if (tower.barrelNode) {
        tower.barrelNode.rotation.y = Math.atan2(dx, dz);
      }

      // Tire un projectile
      PROJECTILES.fire(tower, target);

      // Son spécifique au type de tourelle
      if (typeof AUDIO !== 'undefined') {
        const soundMap = { BASIC: 'shoot', SNIPER: 'shoot_sniper', RAPID: 'shoot_rapid' };
        AUDIO.play(soundMap[tower.type] || 'shoot');
      }

      // Recharge selon le taux de tir
      tower.cooldown = 1 / tower.fireRate;
    });
  },

  /**
   * Trouve l'ennemi le plus avancé sur le chemin dans la portée de la tourelle.
   * Stratégie "First" : priorise l'ennemi avec le plus grand waypointIndex.
   * @param {object} tower
   * @returns {object|null} L'ennemi ciblé, ou null si aucun
   */
  _findTarget(tower) {
    const range2 = tower.range * tower.range;
    const tx = tower.root.position.x;
    const tz = tower.root.position.z;

    let best      = null;
    let bestScore = -1;

    ENEMIES.list.forEach(enemy => {
      // Ignore les ennemis morts, en spawn, ou disposés
      if (enemy.state === ENEMIES.STATE.DEAD     ) return;
      if (enemy.state === ENEMIES.STATE.SPAWNING ) return;
      if (!enemy.root || enemy._readyToRemove    ) return;

      // Test de portée (distance au carré, sans sqrt)
      const dx = enemy.root.position.x - tx;
      const dz = enemy.root.position.z - tz;
      if (dx * dx + dz * dz > range2) return;

      // Score = indice du waypoint (plus élevé = plus avancé)
      const score = enemy.waypointIndex;
      if (score > bestScore) {
        bestScore = score;
        best      = enemy;
      }
    });

    return best;
  },
};
