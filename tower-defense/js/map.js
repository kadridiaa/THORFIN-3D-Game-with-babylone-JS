/* =============================================
   map.js — Génération de la carte
   Responsabilités :
     - Définit les types de tuiles (vide, chemin, spawn, base)
     - Construit la grille 10×10 en 3D (meshes BabylonJS)
     - Définit le chemin prédéfini des ennemis (waypoints)
     - Expose MAP.waypoints[] pour le système de déplacement ennemi
   ============================================= */

/**
 * Objet global MAP — accessible par tous les autres modules JS.
 * Contient l'état complet de la carte.
 */
const MAP = {

  // ── CONSTANTES ──────────────────────────────────────────────────────────────

  GRID_SIZE: 10,   // Nombre de tuiles par côté (grille 10×10)
  TILE_SIZE: 2,    // Largeur d'une tuile en unités BabylonJS

  // Types de tuiles (valeurs entières stockées dans MAP.grid)
  TILE: {
    EMPTY: 0,   // Terrain libre : peut recevoir une tourelle
    PATH:  1,   // Chemin des ennemis : non constructible
    SPAWN: 2,   // Case de départ des ennemis (entrée)
    BASE:  3,   // Base du joueur (à défendre)
  },

  // ── ÉTAT INTERNE ─────────────────────────────────────────────────────────────

  grid:      null,  // Tableau 2D [row][col] → type de tuile (TILE.*)
  meshes:    [],    // Tableau 2D [row][col] → BABYLON.Mesh de la tuile
  waypoints: [],    // Tableau de BABYLON.Vector3 : chemin suivi par les ennemis

  // Référence à la scène BabylonJS (stockée pour usage interne)
  _scene: null,
};

// ── SÉQUENCE DU CHEMIN ───────────────────────────────────────────────────────
//
// Liste ordonnée de [col, row] du SPAWN (entrée) jusqu'à la BASE (sortie).
// Forme un serpentin en S de gauche à droite sur la grille 10×10.
//
// Lecture de la carte (S=Spawn, B=Base, X=Path, .=Constructible) :
//
//   col: 0  1  2  3  4  5  6  7  8  9
// row 0: .  .  .  .  .  .  .  .  .  .
// row 1: .  .  X  X  X  .  X  X  X  .
// row 2: .  .  X  .  X  .  X  .  X  .
// row 3: .  .  X  .  X  .  X  .  X  .
// row 4: .  .  X  .  X  .  X  .  X  .
// row 5: S  X  X  .  X  .  X  .  X  B
// row 6: .  .  .  .  X  .  X  .  X  .
// row 7: .  .  .  .  X  .  X  .  X  .
// row 8: .  .  .  .  X  .  X  .  .  .
// row 9: .  .  .  .  X  X  X  .  .  .
//
const PATH_SEQUENCE = [
  // Entrée gauche
  [0, 5],
  // Vers la droite puis montée
  [1, 5], [2, 5], [2, 4], [2, 3], [2, 2], [2, 1],
  // Traversée horizontale haute
  [3, 1], [4, 1],
  // Descente centrale
  [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [4, 9],
  // Traversée horizontale basse
  [5, 9], [6, 9],
  // Remontée droite
  [6, 8], [6, 7], [6, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
  // Traversée finale haute
  [7, 1], [8, 1],
  // Descente vers la base
  [8, 2], [8, 3], [8, 4], [8, 5],
  // Sortie droite (BASE)
  [9, 5],
];

// ── COULEURS DES TUILES ──────────────────────────────────────────────────────
// Centralisées ici pour faciliter le thème visuel.
const TILE_COLORS = {
  [0]: new BABYLON.Color3(0.18, 0.30, 0.22), // EMPTY  : vert-gris foncé (constructible)
  [1]: new BABYLON.Color3(0.35, 0.30, 0.20), // PATH   : brun-sable (chemin)
  [2]: new BABYLON.Color3(0.10, 0.55, 0.80), // SPAWN  : bleu cyan (entrée ennemis)
  [3]: new BABYLON.Color3(0.80, 0.15, 0.15), // BASE   : rouge (base du joueur)
};

// Hauteur de chaque type de tuile (légère variation pour la lisibilité visuelle)
const TILE_HEIGHT = {
  [0]: 0.10, // EMPTY  : presque plat
  [1]: 0.20, // PATH   : légèrement surélevé
  [2]: 0.30, // SPAWN  : bien visible
  [3]: 0.30, // BASE   : bien visible
};

// ── FONCTIONS UTILITAIRES ────────────────────────────────────────────────────

/**
 * Convertit des coordonnées de grille (col, row) en position monde 3D.
 * Le centre de la grille est à l'origine (0, 0, 0).
 * @param {number} col - Colonne (0 à GRID_SIZE-1)
 * @param {number} row - Ligne  (0 à GRID_SIZE-1)
 * @returns {BABYLON.Vector3}
 */
MAP.gridToWorld = function (col, row) {
  const offset = (MAP.GRID_SIZE - 1) / 2; // 4.5 pour une grille 10×10
  return new BABYLON.Vector3(
    (col - offset) * MAP.TILE_SIZE,  // X
    0,                               // Y (surface du sol)
    (row - offset) * MAP.TILE_SIZE   // Z
  );
};

/**
 * Renvoie le type de la tuile à (col, row), ou null si hors grille.
 */
MAP.getTileType = function (col, row) {
  if (row < 0 || row >= MAP.GRID_SIZE || col < 0 || col >= MAP.GRID_SIZE) return null;
  return MAP.grid[row][col];
};

/**
 * Indique si une tuile peut recevoir une tourelle.
 * Une tuile EMPTY non occupée est constructible.
 */
MAP.isBuildable = function (col, row) {
  return MAP.getTileType(col, row) === MAP.TILE.EMPTY;
};

// ── INITIALISATION ───────────────────────────────────────────────────────────

/**
 * Initialise la grille de données (tableau 2D de types de tuiles).
 * Doit être appelé avant createMeshes().
 */
MAP._initGrid = function () {
  const G = MAP.GRID_SIZE;
  const T = MAP.TILE;

  // Crée une grille G×G remplie de EMPTY
  MAP.grid = Array.from({ length: G }, () => new Array(G).fill(T.EMPTY));

  // Marque les tuiles du chemin dans la grille
  for (let i = 0; i < PATH_SEQUENCE.length; i++) {
    const [col, row] = PATH_SEQUENCE[i];

    if (i === 0) {
      MAP.grid[row][col] = T.SPAWN; // Première tuile = point d'entrée
    } else if (i === PATH_SEQUENCE.length - 1) {
      MAP.grid[row][col] = T.BASE;  // Dernière tuile = base du joueur
    } else {
      MAP.grid[row][col] = T.PATH;  // Tuiles intermédiaires = chemin
    }
  }
};

/**
 * Crée les waypoints 3D à partir de PATH_SEQUENCE.
 * Ces points sont utilisés par l'IA ennemie pour se déplacer.
 */
MAP._initWaypoints = function () {
  MAP.waypoints = PATH_SEQUENCE.map(([col, row]) => {
    const pos = MAP.gridToWorld(col, row);
    // Les ennemis marchent au niveau du sol + leur demi-hauteur (ajusté à l'Étape 3)
    return new BABYLON.Vector3(pos.x, 0.5, pos.z);
  });
};

/**
 * Crée les meshes 3D pour toutes les tuiles de la grille.
 * Chaque tuile est une boîte plate colorée.
 */
MAP._createMeshes = function (scene) {
  const G = MAP.GRID_SIZE;
  const TS = MAP.TILE_SIZE;

  // Pré-création des matériaux (un par type, partagé entre tuiles identiques)
  const materials = {};
  Object.values(MAP.TILE).forEach(type => {
    const mat = new BABYLON.StandardMaterial(`tileMat_${type}`, scene);
    mat.diffuseColor  = TILE_COLORS[type];
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // pas brillant

    // Léger émissif pour les tuiles spéciales (SPAWN et BASE)
    if (type === MAP.TILE.SPAWN) {
      mat.emissiveColor = new BABYLON.Color3(0.02, 0.15, 0.25);
    }
    if (type === MAP.TILE.BASE) {
      mat.emissiveColor = new BABYLON.Color3(0.25, 0.02, 0.02);
    }

    materials[type] = mat;
  });

  // Initialise le tableau 2D de meshes
  MAP.meshes = Array.from({ length: G }, () => new Array(G).fill(null));

  for (let row = 0; row < G; row++) {
    for (let col = 0; col < G; col++) {
      const type   = MAP.grid[row][col];
      const height = TILE_HEIGHT[type];
      const center = MAP.gridToWorld(col, row);

      // Crée la boîte de la tuile (légèrement plus petite que TILE_SIZE pour un interstice)
      const tile = BABYLON.MeshBuilder.CreateBox(
        `tile_${col}_${row}`,
        {
          width:  TS - 0.08,   // légère marge pour voir les jointures
          height: height,
          depth:  TS - 0.08,
        },
        scene
      );

      // Positionne la tuile : son centre Y = height/2 (repose sur le sol)
      tile.position.x = center.x;
      tile.position.y = height / 2;
      tile.position.z = center.z;

      tile.material = materials[type];

      // Méta-données utiles pour le raycast au clic (Étape 4)
      tile.metadata = { col, row, type };

      // Seules les tuiles EMPTY sont cliquables (pour poser des tourelles)
      tile.isPickable = (type === MAP.TILE.EMPTY);

      MAP.meshes[row][col] = tile;
    }
  }
};

/**
 * Ajoute des marqueurs visuels pour SPAWN (flèche) et BASE (cube brillant).
 */
MAP._createMarkers = function (scene) {

  // ── MARQUEUR SPAWN : cylindre bleu pulsant ───────────────────────────────
  const spawnPos = MAP.gridToWorld(PATH_SEQUENCE[0][0], PATH_SEQUENCE[0][1]);
  const spawnMarker = BABYLON.MeshBuilder.CreateCylinder(
    "spawnMarker",
    { diameter: 0.8, height: 1.5, tessellation: 8 },
    scene
  );
  spawnMarker.position.set(spawnPos.x, 1.0, spawnPos.z);

  const spawnMat = new BABYLON.StandardMaterial("spawnMarkerMat", scene);
  spawnMat.diffuseColor  = new BABYLON.Color3(0.1, 0.7, 1.0);
  spawnMat.emissiveColor = new BABYLON.Color3(0.0, 0.3, 0.5);
  spawnMarker.material = spawnMat;
  spawnMarker.isPickable = false;

  // ── MARQUEUR BASE : cube rouge pulsant ───────────────────────────────────
  const last = PATH_SEQUENCE[PATH_SEQUENCE.length - 1];
  const basePos = MAP.gridToWorld(last[0], last[1]);
  const baseMarker = BABYLON.MeshBuilder.CreateBox(
    "baseMarker",
    { size: 1.2 },
    scene
  );
  baseMarker.position.set(basePos.x, 0.9, basePos.z);

  const baseMat = new BABYLON.StandardMaterial("baseMarkerMat", scene);
  baseMat.diffuseColor  = new BABYLON.Color3(1.0, 0.2, 0.2);
  baseMat.emissiveColor = new BABYLON.Color3(0.4, 0.0, 0.0);
  baseMarker.material = baseMat;
  baseMarker.isPickable = false;

  // ── ANIMATION DE PULSATION (scale Y) ─────────────────────────────────────
  const fps = 30;
  const pulseAnim = new BABYLON.Animation(
    "pulse",
    "scaling.y",
    fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
  );
  pulseAnim.setKeys([
    { frame: 0,    value: 1.0 },
    { frame: fps,  value: 1.4 },
    { frame: fps * 2, value: 1.0 },
  ]);

  // Applique la pulsation aux deux marqueurs
  [spawnMarker, baseMarker].forEach(marker => {
    marker.animations = [pulseAnim];
    scene.beginAnimation(marker, 0, fps * 2, true);
  });
};

// ── POINT D'ENTRÉE PUBLIC ────────────────────────────────────────────────────

/**
 * Crée la carte complète dans la scène BabylonJS.
 * À appeler depuis main.js après createScene().
 * @param {BABYLON.Scene} scene
 */
MAP.create = function (scene) {
  MAP._scene = scene;

  MAP._initGrid();       // 1. Construit le tableau de données
  MAP._initWaypoints();  // 2. Calcule les waypoints ennemis
  MAP._createMeshes(scene);  // 3. Génère les tuiles 3D
  MAP._createMarkers(scene); // 4. Ajoute les marqueurs visuels

  console.log(
    `Carte créée : ${MAP.GRID_SIZE}×${MAP.GRID_SIZE} tuiles,`,
    `${MAP.waypoints.length} waypoints sur le chemin.`
  );
};
