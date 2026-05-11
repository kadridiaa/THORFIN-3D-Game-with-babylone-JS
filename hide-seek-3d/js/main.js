// ============================================================
// main.js — Moteur BabylonJS, scène, caméra FPS, matériaux
// ============================================================

const canvas  = document.getElementById("c");
window.engine = new BABYLON.Engine(canvas, true);
window.scene  = new BABYLON.Scene(engine);

// Ciel nocturne cyberpunk
scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.08, 1);

// ── Caméra FPS (vue à la première personne) ──
window.camera = new BABYLON.FreeCamera("cam", new BABYLON.Vector3(0, 1.7, 0), scene);
camera.setTarget(new BABYLON.Vector3(0, 1.7, 1));
camera.minZ = 0.1;
// On ne gère PAS les inputs BabylonJS — on le fait manuellement dans player.js
camera.inputs.clear();

// ── Lumières ──
// Lumière ambiante faible (ambiance nuit)
const ambient = new BABYLON.HemisphericLight("amb", new BABYLON.Vector3(0, 1, 0), scene);
ambient.intensity = 0.25;
ambient.diffuse   = new BABYLON.Color3(0.4, 0.5, 0.7);
ambient.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

// Quelques lampadaires (lumières ponctuelles cyan)
window.streetLights = [];
const lightPositions = [
  [10, 4, 10], [-10, 4, 10], [10, 4, -10], [-10, 4, -10],
  [25, 4, 0],  [-25, 4, 0],  [0, 4, 25],   [0, 4, -25],
];
lightPositions.forEach(([x, y, z]) => {
  const pl = new BABYLON.PointLight("pl", new BABYLON.Vector3(x, y, z), scene);
  pl.diffuse    = new BABYLON.Color3(0.2, 1, 0.8);
  pl.intensity  = 0.6;
  pl.range      = 12;
  streetLights.push(pl);
});

// ── Brouillard ──
scene.fogMode  = BABYLON.Scene.FOGMODE_LINEAR;
scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.08);
scene.fogStart = 30;
scene.fogEnd   = 70;

// ── Matériaux globaux ──
window.matGround = new BABYLON.StandardMaterial("mGround", scene);
matGround.diffuseColor  = new BABYLON.Color3(0.08, 0.08, 0.15);
matGround.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.03);
matGround.specularColor = new BABYLON.Color3(0.3, 0.3, 0.5);

window.matWall = new BABYLON.StandardMaterial("mWall", scene);
matWall.diffuseColor  = new BABYLON.Color3(0.12, 0.12, 0.25);
matWall.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.05);

window.matWallGlow = new BABYLON.StandardMaterial("mWallGlow", scene);
matWallGlow.diffuseColor  = new BABYLON.Color3(0.05, 0.3, 0.3);
matWallGlow.emissiveColor = new BABYLON.Color3(0, 0.15, 0.15);

window.matObs = new BABYLON.StandardMaterial("mObs", scene);
matObs.diffuseColor  = new BABYLON.Color3(0.15, 0.15, 0.3);
matObs.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.08);

window.matTree = new BABYLON.StandardMaterial("mTree", scene);
matTree.diffuseColor  = new BABYLON.Color3(0.05, 0.25, 0.1);
matTree.emissiveColor = new BABYLON.Color3(0, 0.05, 0.01);

window.matAI = new BABYLON.StandardMaterial("mAI", scene);
matAI.diffuseColor  = new BABYLON.Color3(0.6, 0, 0.1);
matAI.emissiveColor = new BABYLON.Color3(1, 0, 0.2);

window.matVisionCone = new BABYLON.StandardMaterial("mVis", scene);
matVisionCone.diffuseColor  = new BABYLON.Color3(1, 0.8, 0);
matVisionCone.emissiveColor = new BABYLON.Color3(0.3, 0.2, 0);
matVisionCone.alpha = 0.18;
matVisionCone.backFaceCulling = false;

window.addEventListener("resize", () => engine.resize());