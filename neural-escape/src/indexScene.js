import { HUD } from "./hud.js";
import { AudioManager } from "./audioManager.js";
import { Player } from "./player.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

scene.clearColor = new BABYLON.Color4(0.64, 0.86, 1.0, 1.0);
scene.collisionsEnabled = true;
scene.gravity = new BABYLON.Vector3(0, -0.35, 0);

// Éclairage
const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
hemi.intensity = 1.0;
hemi.diffuse = new BABYLON.Color3(0.98, 0.99, 1.0);
hemi.groundColor = new BABYLON.Color3(0.35, 0.55, 0.35);

const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.25, -1, 0.15), scene);
sun.position = new BABYLON.Vector3(25, 35, -25);
sun.intensity = 1.15;

// Sol
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 220, height: 220, subdivisions: 4 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0.18, 0.65, 0.2);
groundMat.specularColor = BABYLON.Color3.Black();
ground.material = groundMat;
ground.checkCollisions = true;

// Route
const path = BABYLON.MeshBuilder.CreateBox("path", { width: 12, height: 0.12, depth: 180 }, scene);
path.position = new BABYLON.Vector3(0, 0.04, 25);
const pathMat = new BABYLON.StandardMaterial("pathMat", scene);
pathMat.diffuseColor = new BABYLON.Color3(0.35, 0.27, 0.16);
pathMat.specularColor = BABYLON.Color3.Black();
path.material = pathMat;

const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
lineMat.diffuseColor = new BABYLON.Color3(0.94, 0.9, 0.75);
lineMat.specularColor = BABYLON.Color3.Black();

const pathLineLeft = BABYLON.MeshBuilder.CreateBox("pathLineLeft", { width: 0.35, height: 0.14, depth: 180 }, scene);
pathLineLeft.position = new BABYLON.Vector3(-6.4, 0.05, 25);
pathLineLeft.material = lineMat;

const pathLineRight = pathLineLeft.clone("pathLineRight");
pathLineRight.position.x = 6.4;

// Décors
createTrees(scene);
createHills(scene);
createRoadSigns(scene);

// Skybox
const sky = BABYLON.MeshBuilder.CreateBox("sky", { size: 320 }, scene);
const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
skyMat.backFaceCulling = false;
skyMat.disableLighting = true;
skyMat.diffuseColor = new BABYLON.Color3(0.64, 0.86, 1.0);
sky.material = skyMat;

// ── Joueur ─────────────────────────────────────────────────────────────────
const hud = new HUD();
const audio = new AudioManager();
const player = new Player(scene, hud, audio, {
  startPosition: new BABYLON.Vector3(0, 1.1, -42)
  //                                    ^^^
  // 1.1 = moitié de la hauteur capsule (2.2/2)
  // Le centre de la capsule est à Y=1.1, les pieds touchent Y=0
});

scene.activeCamera = player.camera;



// ── Boucle de jeu ──────────────────────────────────────────────────────────
scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime() / 1000;

  // RÈGLE ABSOLUE : player.update() est le SEUL endroit qui
  // modifie mesh.position, visualRoot.position et la caméra.
  // Ne JAMAIS écrire player.mesh.position.y = ...
  // Ne JAMAIS écrire player.visualRoot.position.copyFrom(...)
  // en dehors de cette ligne.
  player.update(dt, 0);
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

// ────────────────────────────────────────────────────────────────────────────
// Fonctions décors
// ────────────────────────────────────────────────────────────────────────────

function createTrees(s) {
  const trunkMat = new BABYLON.StandardMaterial("treeTrunk", s);
  trunkMat.diffuseColor = new BABYLON.Color3(0.16, 0.12, 0.07);
  trunkMat.specularColor = BABYLON.Color3.Black();

  const leafMat = new BABYLON.StandardMaterial("treeLeaf", s);
  leafMat.diffuseColor = new BABYLON.Color3(0.12, 0.38, 0.12);
  leafMat.specularColor = BABYLON.Color3.Black();

  const positions = [];
  for (let i = -85; i <= 85; i += 12) {
    positions.push({ x: -12.5 - (i % 24 === 0 ? 2 : 0), z: i });
    positions.push({ x: 12.5 + (i % 24 === 0 ? 2 : 0), z: i });
  }

  positions.forEach((pos, idx) => {
    const h = 4 + (idx % 3);
    const trunk = BABYLON.MeshBuilder.CreateCylinder(`trunk_${idx}`,
      { height: h, diameterTop: 0.3, diameterBottom: 0.7 }, s);
    trunk.position = new BABYLON.Vector3(pos.x, h / 2, pos.z);
    trunk.material = trunkMat;

    const crown = BABYLON.MeshBuilder.CreateSphere(`crown_${idx}`,
      { diameter: 3.5 + (idx % 2) * 0.8, segments: 8 }, s);
    crown.position = new BABYLON.Vector3(pos.x, h + 1.2, pos.z);
    crown.material = leafMat;
  });
}

function createHills(s) {
  const mat = new BABYLON.StandardMaterial("hillMat", s);
  mat.diffuseColor = new BABYLON.Color3(0.12, 0.48, 0.12);
  mat.specularColor = BABYLON.Color3.Black();

  [
    { x: -35, z: 10, r: 12 },
    { x: 35, z: 22, r: 14 },
    { x: -28, z: 52, r: 16 },
    { x: 26, z: 72, r: 18 },
    { x: -40, z: 96, r: 16 },
    { x: 40, z: 116, r: 18 }
  ].forEach((h, i) => {
    const mound = BABYLON.MeshBuilder.CreateSphere(`hill_${i}`, { diameter: h.r }, s);
    mound.scaling = new BABYLON.Vector3(1.2, 0.5, 1.2);
    mound.position = new BABYLON.Vector3(h.x, -h.r * 0.1, h.z);
    mound.material = mat;
  });
}

function createRoadSigns(s) {
  const poleMat = new BABYLON.StandardMaterial("poleMat", s);
  poleMat.diffuseColor = new BABYLON.Color3(0.72, 0.53, 0.28);
  poleMat.specularColor = BABYLON.Color3.Black();

  const boardMat = new BABYLON.StandardMaterial("boardMat", s);
  boardMat.diffuseColor = new BABYLON.Color3(0.95, 0.9, 0.6);
  boardMat.specularColor = BABYLON.Color3.Black();

  for (let i = 0; i < 6; i++) {
    const x = i % 2 === 0 ? -9 : 9;
    const z = -30 + i * 28;
    const pole = BABYLON.MeshBuilder.CreateBox(`pole_${i}`, { width: 0.8, height: 4, depth: 0.15 }, s);
    pole.position = new BABYLON.Vector3(x, 2, z);
    pole.material = poleMat;

    const board = BABYLON.MeshBuilder.CreateBox(`board_${i}`, { width: 3.2, height: 1.4, depth: 0.2 }, s);
    board.position = new BABYLON.Vector3(x, 4.1, z);
    board.material = boardMat;
  }
}