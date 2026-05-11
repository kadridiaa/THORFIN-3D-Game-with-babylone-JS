// ============================================================
// player.js — FIX strafe + indicateur directionnel de danger
// ============================================================

const PLAYER_SPEED       = 0.12;
const PLAYER_SPRINT_MULT = 2.0;
const PLAYER_HEIGHT      = 1.7;
const PLAYER_CROUCH_H    = 0.9;
const PLAYER_RADIUS      = 0.4;
const MOUSE_SENSITIVITY  = 0.002;

window.pState = {
  alive: true, sprinting: false, crouching: false,
  noiseLevel: 0, yaw: 0, pitch: 0,
};

window.playerPos = new BABYLON.Vector3(2, PLAYER_HEIGHT, 2);
camera.position  = new BABYLON.Vector3(2, PLAYER_HEIGHT, 2);

const keys = {};
window.addEventListener("keydown", e => { keys[e.code] = true; });
window.addEventListener("keyup",   e => { keys[e.code] = false; });

canvas.addEventListener("click", () => {
  if (!document.pointerLockElement) canvas.requestPointerLock();
});
document.addEventListener("mousemove", e => {
  if (!document.pointerLockElement || !pState.alive) return;
  pState.yaw   += e.movementX * MOUSE_SENSITIVITY;
  pState.pitch -= e.movementY * MOUSE_SENSITIVITY;
  pState.pitch  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pState.pitch));
});

function collidesWithWorld(newX, newZ) {
  const r = PLAYER_RADIUS;
  for (const obj of solidObjects) {
    if (Math.abs(newX - obj.x) < obj.w / 2 + r &&
        Math.abs(newZ - obj.z) < obj.d / 2 + r) return true;
  }
  const half = MAP_SIZE / 2 - 1;
  return Math.abs(newX) > half || Math.abs(newZ) > half;
}

// ── Indicateur directionnel de danger ──
function initDangerIndicator() {
  const wrap = document.createElement("div");
  wrap.id = "danger-indicator";
  wrap.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50;";
  const arcs = [
    { id:"di-top",    css:"top:0;left:50%;transform:translateX(-50%);width:220px;height:90px;background:radial-gradient(ellipse at 50% 0%,rgba(255,20,20,0.8) 0%,transparent 70%);" },
    { id:"di-bottom", css:"bottom:0;left:50%;transform:translateX(-50%);width:220px;height:90px;background:radial-gradient(ellipse at 50% 100%,rgba(255,20,20,0.8) 0%,transparent 70%);" },
    { id:"di-left",   css:"left:0;top:50%;transform:translateY(-50%);width:90px;height:220px;background:radial-gradient(ellipse at 0% 50%,rgba(255,20,20,0.8) 0%,transparent 70%);" },
    { id:"di-right",  css:"right:0;top:50%;transform:translateY(-50%);width:90px;height:220px;background:radial-gradient(ellipse at 100% 50%,rgba(255,20,20,0.8) 0%,transparent 70%);" },
  ];
  arcs.forEach(a => {
    const el = document.createElement("div");
    el.id = a.id;
    el.style.cssText = "position:absolute;opacity:0;transition:opacity 0.12s;" + a.css;
    wrap.appendChild(el);
  });
  document.body.appendChild(wrap);
}

function updateDangerIndicator() {
  if (!window.aiData || !window.aiMesh) return;
  const dx   = aiMesh.position.x - playerPos.x;
  const dz   = aiMesh.position.z - playerPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const intensity = Math.max(0, Math.min(1, (24 - dist) / 18));
  const isDanger  = aiData.state === "CHASE" || aiData.state === "ALERT" || aiData.state === "SEARCH";

  if (!isDanger || intensity === 0) {
    ["di-top","di-bottom","di-left","di-right"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = "0";
    });
    return;
  }
  const angleToAI = Math.atan2(dx, dz);
  let rel = angleToAI - pState.yaw;
  while (rel >  Math.PI) rel -= 2 * Math.PI;
  while (rel < -Math.PI) rel += 2 * Math.PI;

  const sides = {
    "di-top":    Math.max(0,  Math.cos(rel)),
    "di-bottom": Math.max(0, -Math.cos(rel)),
    "di-right":  Math.max(0,  Math.sin(rel)),
    "di-left":   Math.max(0, -Math.sin(rel)),
  };
  Object.entries(sides).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = (val * intensity).toFixed(2);
  });
}

function updatePlayer() {
  if (!pState.alive) return;

  pState.sprinting = keys["ShiftLeft"]  || keys["ShiftRight"];
  pState.crouching = keys["ControlLeft"] || keys["KeyC"];

  const targetH = pState.crouching ? PLAYER_CROUCH_H : PLAYER_HEIGHT;
  camera.position.y += (targetH - camera.position.y) * 0.15;

  const speed = PLAYER_SPEED
    * (pState.sprinting ? PLAYER_SPRINT_MULT : 1)
    * (pState.crouching ? 0.5 : 1);

  // FIX : vecteurs corrects pour strafe gauche/droite
  const fwdX   =  Math.sin(pState.yaw);
  const fwdZ   =  Math.cos(pState.yaw);
  const rightX =  Math.cos(pState.yaw);
  const rightZ = -Math.sin(pState.yaw);

  let dx = 0, dz = 0;
  if (keys["KeyW"] || keys["ArrowUp"])    { dx += fwdX   * speed; dz += fwdZ   * speed; }
  if (keys["KeyS"] || keys["ArrowDown"])  { dx -= fwdX   * speed; dz -= fwdZ   * speed; }
  if (keys["KeyA"] || keys["ArrowLeft"])  { dx -= rightX * speed; dz -= rightZ * speed; }
  if (keys["KeyD"] || keys["ArrowRight"]) { dx += rightX * speed; dz += rightZ * speed; }

  const cx = camera.position.x, cz = camera.position.z;
  if (!collidesWithWorld(cx + dx, cz))               camera.position.x += dx;
  if (!collidesWithWorld(camera.position.x, cz + dz)) camera.position.z += dz;

  window.playerPos.x = camera.position.x;
  window.playerPos.y = camera.position.y;
  window.playerPos.z = camera.position.z;

  camera.setTarget(new BABYLON.Vector3(
    camera.position.x + Math.sin(pState.yaw) * Math.cos(pState.pitch),
    camera.position.y + Math.sin(pState.pitch),
    camera.position.z + Math.cos(pState.yaw) * Math.cos(pState.pitch)
  ));

  let targetNoise = 0;
  if (dx !== 0 || dz !== 0)
    targetNoise = pState.sprinting ? 100 : pState.crouching ? 10 : 40;
  pState.noiseLevel += (targetNoise - pState.noiseLevel) * (targetNoise > pState.noiseLevel ? 0.3 : 0.05);
  pState.noiseLevel  = Math.max(0, Math.min(100, pState.noiseLevel));

  updateDangerIndicator();
}

function resetPlayer() {
  camera.position  = new BABYLON.Vector3(2, PLAYER_HEIGHT, 2);
  window.playerPos = camera.position.clone();
  pState.alive = true; pState.sprinting = false; pState.crouching = false;
  pState.noiseLevel = 0; pState.yaw = 0; pState.pitch = 0;
}