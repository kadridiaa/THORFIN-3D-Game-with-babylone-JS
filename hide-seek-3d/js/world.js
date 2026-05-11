// ============================================================
// world.js — Map 3D élargie : 3 zones reliées par des portes
//
// ZONE 1 (départ)  : z = -90 à -30  — Ville / bâtiments
// ZONE 2 (milieu)  : z = -20 à +40  — Entrepôt / caisses
// ZONE 3 (finale)  : z = +50 à +110 — Forêt / arbres
//
// Entre chaque zone : une PORTE (portail cyan)
// Pour passer la porte → répondre à une question d'informatique
// ============================================================

window.MAP_SIZE   = 60;   // Largeur de la map (axe X)
window.solidObjects = [];

// ── Matériaux utilitaires ──
function mkMat(name, diff, emis) {
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor  = new BABYLON.Color3(...diff);
  m.emissiveColor = new BABYLON.Color3(...emis);
  return m;
}

// ── Constructeurs génériques ──
function makeBox(name, x, y, z, w, h, d, mat, solid) {
  const b = BABYLON.MeshBuilder.CreateBox(name, { width:w, height:h, depth:d }, scene);
  b.position = new BABYLON.Vector3(x, y + h/2, z);
  b.material = mat;
  if (solid) solidObjects.push({ mesh:b, x, z, w, d, h });
  return b;
}

function makeCylinder(name, x, z, diam, h, mat) {
  const c = BABYLON.MeshBuilder.CreateCylinder(name, { diameter:diam, height:h, tessellation:8 }, scene);
  c.position = new BABYLON.Vector3(x, h/2, z);
  c.material = mat;
  return c;
}

// ============================================================
// PORTES — chaque porte est un portail cyan avec collision
// Elle bloque le passage jusqu'à ce que la question soit répondue
// ============================================================
window.doors = [];  // { mesh, triggerZ, zoneFrom, zoneTo, open, question }

// Questions d'informatique (pour test — sera remplacé par LLM)
const QUESTIONS = [
  {
    q:  "Quelle structure de données fonctionne en LIFO ?",
    choices: ["File (Queue)", "Pile (Stack)", "Liste chaînée", "Arbre binaire"],
    answer: 1,
  },
  {
    q:  "Quelle est la complexité de la recherche dans un tableau trié (dichotomie) ?",
    choices: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    answer: 2,
  },
  {
    q:  "Qu'est-ce qu'un algorithme de Dijkstra calcule ?",
    choices: ["Le plus court chemin", "Le tri d'un tableau", "La somme d'une liste", "Une compression ZIP"],
    answer: 0,
  },
  {
    q:  "En binaire, que vaut 1010 en décimal ?",
    choices: ["8", "12", "10", "6"],
    answer: 2,
  },
  {
    q:  "Quel paradigme utilise des objets avec des attributs et méthodes ?",
    choices: ["Fonctionnel", "Impératif", "Orienté objet", "Logique"],
    answer: 2,
  },
];

let currentDoorQuiz = null;  // porte en attente de réponse

function createDoor(x, z, zoneLabel) {
  const matDoor = new BABYLON.StandardMaterial("mDoor" + z, scene);
  matDoor.emissiveColor = new BABYLON.Color3(0, 0.9, 0.7);
  matDoor.alpha = 0.6;
  matDoor.backFaceCulling = false;

  // Cadre de porte (deux piliers + linteau)
  const matFrame = mkMat("mFrame"+z, [0.1,0.4,0.4], [0,0.3,0.3]);

  // Pilier gauche
  makeBox("dpL"+z, x - 1.8, 0, z, 0.3, 4.5, 0.3, matFrame, false);
  // Pilier droit
  makeBox("dpR"+z, x + 1.8, 0, z, 0.3, 4.5, 0.3, matFrame, false);
  // Linteau
  makeBox("dpT"+z, x, 0, z, 4, 0.3, 0.3, matFrame, false);
  (document.getElementById ? makeBox("dpT"+z+"b", x, 3.85, z, 4, 0.3, 0.3, matFrame, false) : null);

  // Panneau lumineux (bloquant)
  const panel = makeBox("door"+z, x, 0, z, 3.2, 4, 0.15, matDoor, false);

  // Collision "invisible" de la porte (pour bloquer le joueur)
  const blocker = makeBox("dblock"+z, x, 0, z, 3.2, 4, 0.4, matDoor, true);
  blocker.isVisible = false;

  // Texte flottant "APPUYEZ SUR E"
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const door = { panel, blocker, z, open: false, question: q, label: zoneLabel };
  doors.push(door);

  return door;
}

// Vérifie si le joueur est proche d'une porte fermée
function checkDoorProximity() {
  if (currentDoorQuiz) return;  // Quiz déjà ouvert
  for (const door of doors) {
    if (door.open) continue;
    const dz = Math.abs(playerPos.z - door.z);
    const dx = Math.abs(playerPos.x - 0);
    if (dz < 3 && dx < 5) {
      // Afficher le HUD "Appuyez sur E"
      showDoorHint(door);
      return;
    }
  }
  hideDoorHint();
}

// Ouvrir une porte (quand question réussie)
function openDoor(door) {
  door.open = true;
  door.panel.dispose();
  // Retirer le blocker de solidObjects
  solidObjects.splice(solidObjects.findIndex(o => o.mesh === door.blocker), 1);
  door.blocker.dispose();
}

// Écoute la touche E pour déclencher le quiz
window.addEventListener("keydown", e => {
  if (e.code !== "KeyE") return;
  if (currentDoorQuiz) return;
  for (const door of doors) {
    if (door.open) continue;
    const dz = Math.abs(playerPos.z - door.z);
    const dx = Math.abs(playerPos.x - 0);
    if (dz < 3 && dx < 5) {
      openQuiz(door);
      return;
    }
  }
});

// ============================================================
// QUIZ — fenêtre modale de question
// ============================================================
function openQuiz(door) {
  currentDoorQuiz = door;
  window.gameStarted = false;  // Fige le jeu

  const overlay = document.createElement("div");
  overlay.id = "quiz-overlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);
    display:flex;align-items:center;justify-content:center;
    z-index:300;font-family:'Courier New',monospace;
  `;

  const q = door.question;
  const choicesHTML = q.choices.map((c, i) => `
    <button class="qbtn" data-index="${i}" style="
      display:block;width:100%;text-align:left;
      background:rgba(0,255,204,0.04);
      border:1px solid #00ffcc44;color:#ccc;
      font-family:'Courier New',monospace;font-size:15px;
      padding:12px 18px;margin-bottom:10px;cursor:pointer;
      transition:all 0.15s;letter-spacing:1px;
    ">[${String.fromCharCode(65+i)}] ${c}</button>
  `).join("");

  overlay.innerHTML = `
    <div style="max-width:500px;width:90%;padding:40px;
      border:1px solid #00ffcc55;background:rgba(0,5,20,0.98);">
      <div style="color:#00ffcc44;font-size:11px;letter-spacing:4px;margin-bottom:16px;">
        ACCÈS ${door.label} — QUESTION DE SÉCURITÉ
      </div>
      <div style="color:#00ffcc;font-size:17px;line-height:1.6;margin-bottom:28px;">
        ${q.q}
      </div>
      ${choicesHTML}
      <div id="quiz-feedback" style="min-height:24px;font-size:14px;margin-top:8px;"></div>
    </div>
    <style>
      .qbtn:hover { background:rgba(0,255,204,0.1)!important; border-color:#00ffcc!important; color:#00ffcc!important; }
    </style>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll(".qbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index);
      const fb  = document.getElementById("quiz-feedback");
      if (idx === q.answer) {
        fb.style.color = "#00ffcc";
        fb.textContent = "✓ Bonne réponse ! Porte ouverte.";
        btn.style.background    = "rgba(0,255,100,0.15)";
        btn.style.borderColor   = "#00ff88";
        btn.style.color         = "#00ff88";
        setTimeout(() => {
          overlay.remove();
          currentDoorQuiz = null;
          window.gameStarted = true;
          openDoor(door);
          hideDoorHint();
        }, 900);
      } else {
        fb.style.color  = "#ff4444";
        fb.textContent  = "✗ Mauvaise réponse. Réessaie !";
        btn.style.background  = "rgba(255,0,0,0.1)";
        btn.style.borderColor = "#ff4444";
        btn.style.color       = "#ff4444";
        setTimeout(() => {
          btn.style.background  = "rgba(0,255,204,0.04)";
          btn.style.borderColor = "#00ffcc44";
          btn.style.color       = "#ccc";
          fb.textContent = "";
        }, 1200);
      }
    });
  });
}

// ── Hint "Appuyez sur E" ──
let doorHintEl = null;
function showDoorHint(door) {
  if (doorHintEl) return;
  doorHintEl = document.createElement("div");
  doorHintEl.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.7);border:1px solid #00ffcc55;
    color:#00ffcc;font-family:'Courier New',monospace;
    font-size:14px;padding:10px 24px;letter-spacing:2px;
    pointer-events:none;z-index:100;
  `;
  doorHintEl.textContent = "[E] Répondre pour ouvrir la porte → " + door.label;
  document.body.appendChild(doorHintEl);
}
function hideDoorHint() {
  if (doorHintEl) { doorHintEl.remove(); doorHintEl = null; }
}

// ============================================================
// Génération des zones
// ============================================================

function createGround(zCenter, depth, mat) {
  const g = BABYLON.MeshBuilder.CreateGround("gnd", { width:MAP_SIZE, height:depth }, scene);
  g.position = new BABYLON.Vector3(0, 0, zCenter);
  g.material = mat;
  // Grille néon
  for (let i = -MAP_SIZE/2; i <= MAP_SIZE/2; i += 5) {
    const ml = mkMat("gl", [0,0.15,0.12], [0,0.12,0.1]);
    ml.disableLighting = true;
    const lz = makeBox("gz"+i+"_"+zCenter, i, 0, zCenter, 0.06, 0.02, depth, ml, false);
    const lx = makeBox("gx"+i+"_"+zCenter, 0, 0, zCenter + i, MAP_SIZE, 0.02, 0.06, ml, false);
  }
}

function createBorderWalls(zCenter, depth) {
  const h = 5, t = 0.8;
  const half = MAP_SIZE / 2;
  const matB = mkMat("bw", [0.1,0.1,0.25], [0,0,0.08]);
  makeBox("bwN", 0, 0, zCenter + depth/2 + t/2, MAP_SIZE, h, t, matB, true);
  makeBox("bwS", 0, 0, zCenter - depth/2 - t/2, MAP_SIZE, h, t, matB, true);
  makeBox("bwE",  half + t/2, 0, zCenter, t, h, depth, matB, true);
  makeBox("bwW", -half - t/2, 0, zCenter, t, h, depth, matB, true);
}

// ── Zone 1 : Ville (z = -60) ──
function createZone1() {
  const matG = mkMat("mg1", [0.06,0.06,0.18], [0,0.01,0.08]);
  createGround(-60, 60, matG);
  createBorderWalls(-60, 60);

  const matW = mkMat("mw1", [0.1,0.1,0.28], [0,0,0.08]);
  const matWg = mkMat("mwg1", [0.04,0.28,0.28], [0,0.14,0.14]);

  // Bâtiments
  makeBox("b1a", -16, 0, -70, 10, 6, 8,  matW,  true);
  makeBox("b1b",  16, 0, -70, 8,  8, 10, matWg, true);
  makeBox("b1c", -16, 0, -50, 12, 5, 6,  matW,  true);
  makeBox("b1d",  16, 0, -50, 8,  7, 8,  matW,  true);
  makeBox("b1e",   0, 0, -75, 6,  4, 6,  matWg, true);
  makeBox("b1f", -24, 0, -60, 5,  6, 12, matW,  true);
  makeBox("b1g",  24, 0, -60, 5,  4, 12, matW,  true);

  // Murs intérieurs
  makeBox("m1a",  8, 0, -55, 0.5, 3, 10, matW, true);
  makeBox("m1b", -8, 0, -65, 12,  3, 0.5, matW, true);

  // Caisses
  const matC = mkMat("mc1", [0.25,0.2,0.08], [0.04,0.03,0]);
  [[-5,2,-58],[-4,2,-58],[8,-3,-62],[9,-3,-62],[8,-4,-62],[-10,0,-48],[12,0,-48],[-2,0,-42]].forEach(([x,_,z],i) => {
    const s = 1.4 + Math.random()*0.4;
    makeBox("cr1_"+i, x, 0, z, s, s, s, matC, true);
  });

  // Lampadaires
  [[10,-55],[-10,-55],[10,-65],[-10,-65],[0,-45],[0,-75],[20,-60],[-20,-60]].forEach(([x,z]) => {
    makeLampPost(x, z);
  });
}

// ── Zone 2 : Entrepôt (z = +10) ──
function createZone2() {
  const matG = mkMat("mg2", [0.1,0.08,0.05], [0.03,0.02,0]);
  createGround(10, 60, matG);
  createBorderWalls(10, 60);

  const matMetal = mkMat("mmetal", [0.2,0.18,0.14], [0.03,0.02,0.01]);
  const matRust  = mkMat("mrust",  [0.3,0.1,0.05],  [0.06,0.01,0]);

  // Grands entrepôts
  makeBox("e2a", -14, 0,  5, 18, 7, 14, matMetal, true);
  makeBox("e2b",  14, 0,  5, 16, 6, 12, matRust,  true);
  makeBox("e2c",   0, 0, 20,  8, 5,  8, matMetal, true);
  makeBox("e2d", -22, 0, 18, 10, 8,  8, matRust,  true);
  makeBox("e2e",  22, 0, 18,  8, 5, 10, matMetal, true);

  // Couloirs de caisses
  const matC = mkMat("mc2", [0.3,0.22,0.1], [0.05,0.03,0]);
  for (let i = 0; i < 5; i++) {
    makeBox("cra"+i, -8 + i*2, 0, -5, 1.6, 1.6, 1.6, matC, true);
    makeBox("crb"+i,  3 + i*2, 0,  15, 1.8, 1.8, 1.8, matC, true);
  }
  makeBox("crc", 0, 0, 25, 2, 2, 2, matC, true);

  // Murs intérieurs (couloirs)
  makeBox("m2a",  8, 0, 10, 0.5, 4, 16, matMetal, true);
  makeBox("m2b", -8, 0, -5, 12,  4, 0.5, matMetal, true);

  // Lampadaires industriels (orange)
  const matOrangeBulb = mkMat("morangeb", [0.5,0.3,0], [1,0.5,0.1]);
  [[12,0],[-12,0],[0,15],[0,-5],[20,10],[-20,10]].forEach(([x,z]) => {
    if (x === undefined) return;
    makeLampPost(x, z, matOrangeBulb);
  });
}

// ── Zone 3 : Forêt (z = +70) ──
function createZone3() {
  const matG = mkMat("mg3", [0.04,0.1,0.04], [0,0.03,0]);
  createGround(70, 60, matG);
  createBorderWalls(70, 60);

  // Beaucoup d'arbres
  const positions = [
    [-14,50],[-6,50],[6,50],[14,50],
    [-18,60],[-10,60],[0,60],[10,60],[18,60],
    [-14,70],[14,70],[-8,70],[8,70],
    [-18,80],[-6,80],[6,80],[18,80],
    [-12,90],[0,90],[12,90],
    [-18,95],[18,95],
  ];
  positions.forEach(([x,z]) => makeTree(x, z));

  // Quelques rochers (cachettes)
  const matRock = mkMat("mrock", [0.2,0.18,0.16], [0.02,0.02,0.02]);
  [[-8,55],[8,55],[-16,75],[16,75],[0,85],[-10,95],[10,95]].forEach(([x,z],i) => {
    const s = 1.5 + Math.random();
    makeBox("rock"+i, x, 0, z, s*1.2, s, s, matRock, true);
  });

  // Lampadaires — sphères vertes
  const matGreenBulb = mkMat("mgreenbulb", [0,0.4,0.1], [0.2,1,0.3]);
  [[-12,55],[12,55],[0,65],[-15,75],[15,75],[0,85]].forEach(([x,z]) => {
    makeLampPost(x, z, matGreenBulb);
  });
}

// ── Arbre ──
function makeTree(x, z) {
  const matTrunk = mkMat("mtrunk", [0.3,0.18,0.08], [0.04,0.02,0]);
  const trunk = makeCylinder("tr", x, z, 0.4, 2.8, matTrunk);
  trunk.position.y = 1.4;

  const matLeaves = mkMat("mleaves", [0.05,0.28,0.1], [0,0.06,0.01]);
  const leaves = BABYLON.MeshBuilder.CreateSphere("lv", { diameter:3.2, segments:5 }, scene);
  leaves.position = new BABYLON.Vector3(x, 4.0, z);
  leaves.material = matLeaves;
  solidObjects.push({ mesh:trunk, x, z, w:0.5, d:0.5, h:2.8 });
}

// ── Lampadaire ──
function makeLampPost(x, z, bulbMat) {
  const matPole = mkMat("mpole", [0.28,0.28,0.38], [0.02,0.02,0.04]);
  makeCylinder("pole", x, z, 0.12, 5, matPole);

  const mBulb = bulbMat || mkMat("mbulb", [0.2,1,0.8], [0.2,1,0.8]);
  mBulb.disableLighting = true;
  const bulb = BABYLON.MeshBuilder.CreateSphere("bulb", { diameter:0.4 }, scene);
  bulb.position = new BABYLON.Vector3(x, 5.4, z);
  bulb.material = mBulb;
}

// ============================================================
// initWorld
// ============================================================
function initWorld() {
  createZone1();
  createZone2();
  createZone3();

  // Portes entre zones
  createDoor(0, -30, "ZONE 2 — ENTREPÔT");   // Entre Z1 et Z2
  createDoor(0,  40, "ZONE 3 — FORÊT");       // Entre Z2 et Z3
}

// ============================================================
// resetWorld
// ============================================================
function resetWorld() {
  doors.length = 0;
  currentDoorQuiz = null;
  hideDoorHint();
  scene.meshes.slice().forEach(m => { if (m.name !== "cam") m.dispose(); });
  solidObjects.length = 0;
  initWorld();
}

// Appelé chaque frame depuis game.js
function updateWorld() {
  checkDoorProximity();
}