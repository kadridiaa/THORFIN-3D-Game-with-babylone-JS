/* =============================================
   main.js — Point d'entrée du jeu
   Responsabilités :
     - Initialise le moteur BabylonJS et la scène
     - Lance tous les systèmes dans le bon ordre
     - Démarre la boucle de rendu
   ============================================= */

window.addEventListener("DOMContentLoaded", function () {

  // ── 1. CANVAS + MOTEUR ──────────────────────────────────────────────────────
  const canvas = document.getElementById("renderCanvas");
  if (!canvas) { console.error("Canvas introuvable."); return; }

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  }, true);

  // ── 2. SCÈNE ────────────────────────────────────────────────────────────────
  const scene = createScene(engine);

  // ── 3. CARTE ────────────────────────────────────────────────────────────────
  MAP.create(scene);

  // ── 4. SYSTÈMES DE JEU (ordre important : dépendances ascendantes) ──────────
  GAME_STATE.refreshHUD();   // Affiche les valeurs initiales dans le HUD

  ENEMIES.init(scene);       // Boucle de mise à jour des ennemis
  TOWERS.init(scene);        // Placement + tir des tourelles
  PROJECTILES.init(scene);   // Déplacement des projectiles
  EFFECTS.init(scene);       // Particules (impact, mort)
  AUDIO.init();              // Sons synthétiques (Web Audio API)
  UI.init();                 // Overlays game over / victoire + notifications
  WAVES.init(scene);         // Vagues d'ennemis (démarre le countdown)

  // ── 5. BOUCLE DE RENDU ──────────────────────────────────────────────────────
  engine.runRenderLoop(function () {
    scene.render();
  });

  // ── 6. REDIMENSIONNEMENT ────────────────────────────────────────────────────
  window.addEventListener("resize", function () {
    engine.resize();
  });

  // ── 7. LOG DE DÉMARRAGE ─────────────────────────────────────────────────────
  console.log(
    "%cTower Defense — IA Edition %cprêt !",
    "color:#64b5f6; font-weight:bold; font-size:14px;",
    "color:#a5d6a7; font-size:14px;"
  );
  console.log("BabylonJS", BABYLON.Engine.Version, "| Contrôles :");
  console.log("  Clic droit + glisser = rotation | Molette = zoom");
  console.log("  1/2/3 = sélectionner tourelle   | M = mute audio");
  console.log("  Clic tuile verte = poser tourelle");

});
