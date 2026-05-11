// ============================================================
// game.js — Boucle principale
// ============================================================

initWorld();
showStartScreen();
window.gameStarted = false;

scene.registerBeforeRender(() => {
  if (!window.gameStarted) return;
  updatePlayer();
  updateWorld();   // vérifie les portes
  updateAI();
  updateScore();
});

engine.runRenderLoop(() => scene.render());