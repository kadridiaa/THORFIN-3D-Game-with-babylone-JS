// ============================================================
// ai-seeker.js — IA chercheur : state machine 4 états
//
// États :
//   PATROL  → Se déplace aléatoirement sur des waypoints
//   ALERT   → A entendu un bruit, cherche autour
//   CHASE   → Voit le joueur, fonce vers lui
//   SEARCH  → A perdu le joueur, fouille sa dernière position connue
//
// Dépend de : main.js, world.js, player.js, vision.js
// ============================================================

// ── Waypoints de patrouille (points fixes sur la map) ──
const PATROL_WAYPOINTS = [
  // Zone 1 — Ville
  new BABYLON.Vector3(-15, 0.9, -70),
  new BABYLON.Vector3( 15, 0.9, -70),
  new BABYLON.Vector3(-15, 0.9, -50),
  new BABYLON.Vector3( 15, 0.9, -50),
  new BABYLON.Vector3(  0, 0.9, -55),
  // Zone 2 — Entrepôt
  new BABYLON.Vector3(-10, 0.9,  0),
  new BABYLON.Vector3( 10, 0.9,  0),
  new BABYLON.Vector3(  0, 0.9, 20),
  new BABYLON.Vector3(-18, 0.9, 15),
  new BABYLON.Vector3( 18, 0.9, 15),
  // Zone 3 — Forêt
  new BABYLON.Vector3(-12, 0.9, 55),
  new BABYLON.Vector3( 12, 0.9, 55),
  new BABYLON.Vector3(  0, 0.9, 70),
  new BABYLON.Vector3(-12, 0.9, 80),
  new BABYLON.Vector3( 12, 0.9, 80),

];

// ── Vitesses par état ──
const AI_SPEEDS = {
  PATROL: 0.04,
  ALERT:  0.06,
  CHASE:  0.11,
  SEARCH: 0.07,
};

// ── Durées max (en frames à 60fps) ──
const ALERT_DURATION  = 180;   // 3 secondes en alerte
const SEARCH_DURATION = 300;   // 5 secondes à chercher

// ── État global de l'IA ──
window.aiData = {
  state:          "PATROL",
  yaw:            0,           // Direction de l'IA (radians)
  stateTimer:     0,           // Frames dans l'état actuel
  waypointIndex:  0,           // Waypoint cible actuel
  lastSeenPos:    null,        // Dernière position connue du joueur
  searchTarget:   null,        // Point de fouille aléatoire
};

// ── Mesh de l'IA ──
window.aiMesh = BABYLON.MeshBuilder.CreateBox("ai", {
  width: 0.8, height: 1.8, depth: 0.8
}, scene);
aiMesh.position = new BABYLON.Vector3(-5, 0.9, -5);
aiMesh.material = matAI;

// Yeux de l'IA
const eyeMatL = new BABYLON.StandardMaterial("eyeL", scene);
eyeMatL.emissiveColor = new BABYLON.Color3(1, 0.9, 0);
eyeMatL.disableLighting = true;
const eyeL = BABYLON.MeshBuilder.CreateBox("eyeL", { width:0.18, height:0.12, depth:0.05 }, scene);
eyeL.material = eyeMatL;

const eyeR = eyeL.clone("eyeR");

// ── Cone de vision (mesh semi-transparent) ──
// Représente visuellement le champ de vision de l'IA
window.visionMesh = BABYLON.MeshBuilder.CreateCylinder("vision", {
  diameterTop: VISION_DISTANCE * 2 * Math.tan(VISION_ANGLE / 2),
  diameterBottom: 0.1,
  height: VISION_DISTANCE,
  tessellation: 12,
}, scene);
visionMesh.material = matVisionCone;
visionMesh.isPickable = false;

// ── Helpers ──
function vecToYaw(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function distTo(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Déplace l'IA vers une cible à la vitesse donnée
function moveTowards(target, speed) {
  const dx = target.x - aiMesh.position.x;
  const dz = target.z - aiMesh.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.3) return true;  // Arrivé

  const nx = dx / dist;
  const nz = dz / dist;
  aiMesh.position.x += nx * speed;
  aiMesh.position.z += nz * speed;
  aiData.yaw = Math.atan2(nx, nz);
  return false;
}

// Choisit un waypoint différent du courant
function nextWaypoint() {
  const available = PATROL_WAYPOINTS.filter((_, i) => i !== aiData.waypointIndex);
  aiData.waypointIndex = PATROL_WAYPOINTS.indexOf(
    available[Math.floor(Math.random() * available.length)]
  );
}

// Cible de fouille aléatoire autour d'un point
function randomSearchTarget(around) {
  return new BABYLON.Vector3(
    around.x + (Math.random() - 0.5) * 10,
    0.9,
    around.z + (Math.random() - 0.5) * 10
  );
}

// Transition d'état
function setState(newState) {
  aiData.state      = newState;
  aiData.stateTimer = 0;
}

// ── updateAI — machine à états ──
function updateAI() {
  if (!pState.alive) return;

  const pos     = aiMesh.position;
  const sees    = canSeePlayer(pos, aiData.yaw);
  const hears   = canHearPlayer(pos);

  aiData.stateTimer++;

  // ─── TRANSITIONS GLOBALES (priorité absolue) ───
  if (sees) {
    // Le joueur est vu → CHASE immédiat (depuis n'importe quel état)
    if (aiData.state !== "CHASE") setState("CHASE");
    aiData.lastSeenPos = playerPos.clone();
  }

  // ─── MACHINE À ÉTATS ───
  switch (aiData.state) {

    // ── PATROL : patrouille sur les waypoints ──
    case "PATROL": {
      const target = PATROL_WAYPOINTS[aiData.waypointIndex];
      const arrived = moveTowards(target, AI_SPEEDS.PATROL);
      if (arrived) nextWaypoint();

      // Transition : bruit entendu → ALERT
      if (hears) {
        aiData.lastSeenPos = playerPos.clone();
        setState("ALERT");
      }
      break;
    }

    // ── ALERT : a entendu quelque chose, cherche autour ──
    case "ALERT": {
      // Se tourne vers la source du bruit
      if (aiData.lastSeenPos) {
        aiData.yaw = vecToYaw(pos, aiData.lastSeenPos);
        moveTowards(aiData.lastSeenPos, AI_SPEEDS.ALERT);
      }

      // Timeout → retour en patrouille
      if (aiData.stateTimer > ALERT_DURATION && !sees && !hears) {
        setState("PATROL");
        nextWaypoint();
      }
      // Bruit encore entendu → reset timer
      if (hears) {
        aiData.stateTimer = 0;
        aiData.lastSeenPos = playerPos.clone();
      }
      break;
    }

    // ── CHASE : voit le joueur, fonce ──
    case "CHASE": {
      if (sees) {
        // Poursuite active
        moveTowards(playerPos, AI_SPEEDS.CHASE);
        aiData.lastSeenPos = playerPos.clone();

        // Game over si l'IA touche le joueur
        const d = distTo(pos, playerPos);
        if (d < 1.2) {
          gameOver();
          return;
        }
      } else {
        // A perdu le joueur → SEARCH
        setState("SEARCH");
        aiData.searchTarget = randomSearchTarget(aiData.lastSeenPos);
      }
      break;
    }

    // ── SEARCH : fouille la dernière position connue ──
    case "SEARCH": {
      if (aiData.searchTarget) {
        const arrived = moveTowards(aiData.searchTarget, AI_SPEEDS.SEARCH);
        if (arrived) {
          // Cherche un nouveau point autour de la dernière position
          aiData.searchTarget = randomSearchTarget(aiData.lastSeenPos);
        }
      }

      // Timeout → retour en patrouille
      if (aiData.stateTimer > SEARCH_DURATION && !sees && !hears) {
        setState("PATROL");
        nextWaypoint();
      }
      // Bruit → ALERT
      if (hears && !sees) {
        aiData.lastSeenPos = playerPos.clone();
        setState("ALERT");
      }
      break;
    }
  }

  // ── Mise à jour visuelle du mesh ──
  aiMesh.position.y = 0.9;
  aiMesh.rotation.y = aiData.yaw;

  // Yeux
  const eyeOffX = Math.sin(aiData.yaw - Math.PI/2) * 0.2;
  const eyeOffZ = Math.cos(aiData.yaw - Math.PI/2) * 0.2;
  const fwdX    = Math.sin(aiData.yaw) * 0.41;
  const fwdZ    = Math.cos(aiData.yaw) * 0.41;

  eyeL.position = new BABYLON.Vector3(
    pos.x - eyeOffX + fwdX, pos.y + 0.35, pos.z - eyeOffZ + fwdZ
  );
  eyeR.position = new BABYLON.Vector3(
    pos.x + eyeOffX + fwdX, pos.y + 0.35, pos.z + eyeOffZ + fwdZ
  );

  // Couleur des yeux selon l'état
  const eyeColors = {
    PATROL: new BABYLON.Color3(1, 0.9, 0),
    ALERT:  new BABYLON.Color3(1, 0.5, 0),
    CHASE:  new BABYLON.Color3(1, 0.1, 0.1),
    SEARCH: new BABYLON.Color3(1, 0.6, 0.1),
  };
  eyeMatL.emissiveColor = eyeColors[aiData.state];

  // Clignotement en CHASE
  if (aiData.state === "CHASE") {
    const blink = Math.floor(Date.now() / 150) % 2 === 0;
    matAI.emissiveColor = blink
      ? new BABYLON.Color3(1, 0.1, 0.1)
      : new BABYLON.Color3(0.4, 0, 0.05);
  } else {
    matAI.emissiveColor = new BABYLON.Color3(0.8, 0, 0.15);
  }

  // ── Cône de vision (rotation + position) ──
  visionMesh.position = new BABYLON.Vector3(
    pos.x + Math.sin(aiData.yaw) * VISION_DISTANCE / 2,
    pos.y,
    pos.z + Math.cos(aiData.yaw) * VISION_DISTANCE / 2
  );
  visionMesh.rotation.x = Math.PI / 2;
  visionMesh.rotation.y = -aiData.yaw;

  // Couleur du cône selon l'état
  const coneColors = {
    PATROL: new BABYLON.Color3(0, 0.5, 0.8),
    ALERT:  new BABYLON.Color3(1, 0.6, 0),
    CHASE:  new BABYLON.Color3(1, 0.1, 0.1),
    SEARCH: new BABYLON.Color3(1, 0.5, 0.1),
  };
  matVisionCone.emissiveColor = coneColors[aiData.state];
}

// ── resetAI ──
function resetAI() {
  aiData.state         = "PATROL";
  aiData.yaw           = 0;
  aiData.stateTimer    = 0;
  aiData.waypointIndex = 0;
  aiData.lastSeenPos   = null;
  aiData.searchTarget  = null;
  aiMesh.position      = new BABYLON.Vector3(-5, 0.9, -5);
  matAI.emissiveColor  = new BABYLON.Color3(0.8, 0, 0.15);
}