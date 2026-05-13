/* =============================================
   scene.js — Configuration de la scène 3D
   Responsabilités :
     - Création de la scène BabylonJS
     - Caméra top-down (vue du dessus légèrement inclinée)
     - Éclairage (directionnel + ambiant)
     - Sol de la carte
   ============================================= */

/**
 * Crée et configure la scène principale du jeu.
 * @param {BABYLON.Engine} engine - Moteur BabylonJS déjà initialisé
 * @returns {BABYLON.Scene} La scène prête à l'emploi
 */
function createScene(engine) {

  // ── 1. SCÈNE ────────────────────────────────────────────────────────────────
  const scene = new BABYLON.Scene(engine);

  // Couleur de fond : ciel nuit futuriste
  scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.12, 1);

  // ── 2. CAMÉRA TOP-DOWN ──────────────────────────────────────────────────────
  //
  // ArcRotateCamera : pivote autour d'un point cible (le centre de la carte).
  //   alpha  = rotation horizontale (PI/2 = face au Nord)
  //   beta   = inclinaison verticale (PI/3 ≈ 60° → vue légèrement plongeante)
  //   radius = distance au point cible (zoom initial)
  //   target = point regardé (centre de la carte, Y=0)
  //
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,   // alpha  : la caméra regarde vers le bas de l'écran
    Math.PI / 3,    // beta   : 60° d'inclinaison (pas tout à fait au zénith)
    28,             // radius : assez loin pour voir toute la grille 10×10
    new BABYLON.Vector3(0, 0, 0), // target : centre de la carte
    scene
  );

  // Limites de zoom (pour éviter que le joueur ne zoome trop/pas assez)
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 50;

  // Limite l'inclinaison : entre vue top-down stricte (20°) et vue rasante (75°)
  camera.lowerBetaLimit = BABYLON.Tools.ToRadians(20);
  camera.upperBetaLimit = BABYLON.Tools.ToRadians(75);

  // Attache la caméra au canvas (molette = zoom, clic droit = rotation)
  camera.attachControl(engine.getRenderingCanvas(), true);

  // Sensibilité de la molette de zoom
  camera.wheelPrecision = 5;

  // ── 3. LUMIÈRES ─────────────────────────────────────────────────────────────

  // Lumière directionnelle principale (simule le soleil, crée des ombres douces)
  const sunLight = new BABYLON.DirectionalLight(
    "sunLight",
    new BABYLON.Vector3(-1, -2, -1), // direction du rayon (vers le bas-droite)
    scene
  );
  sunLight.intensity = 1.2;
  sunLight.diffuse   = new BABYLON.Color3(1, 0.95, 0.85);  // blanc chaud

  // Lumière ambiante hémisphérique (éclaire les faces sombres, évite le noir total)
  const ambientLight = new BABYLON.HemisphericLight(
    "ambientLight",
    new BABYLON.Vector3(0, 1, 0), // axe vertical
    scene
  );
  ambientLight.intensity    = 0.4;
  ambientLight.diffuse      = new BABYLON.Color3(0.4, 0.5, 0.8); // bleu nuit
  ambientLight.groundColor  = new BABYLON.Color3(0.1, 0.1, 0.15); // sol très sombre

  // ── 4. SOL (GROUND) ─────────────────────────────────────────────────────────
  //
  // La carte fera 10×10 tuiles de 2 unités chacune → sol de 20×20 unités.
  // On crée un simple plan horizontal avec un matériau coloré.
  //
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    {
      width:          22,  // légèrement plus grand que la grille (1 unité de marge)
      height:         22,
      subdivisions:   1    // pas besoin de subdivisions, c'est un plan plat
    },
    scene
  );

  // Matériau du sol : couleur sombre avec léger reflet
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor  = new BABYLON.Color3(0.12, 0.14, 0.18); // gris-bleu foncé
  groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.08); // reflet très atténué
  ground.material = groundMat;

  // Le sol ne reçoit pas les clics de placement de tourelles
  // (les clics seront gérés sur les tuiles de la grille aux étapes suivantes)
  ground.isPickable = false;

  // ── RETOUR ──────────────────────────────────────────────────────────────────
  return scene;
}
