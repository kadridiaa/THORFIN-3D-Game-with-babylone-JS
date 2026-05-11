// ============================================================
// vision.js — Champ de vision de l'IA (raycasting)
// Dépend de : main.js (scene), world.js (solidObjects), player.js (playerPos)
// ============================================================

const VISION_ANGLE    = Math.PI / 3;   // 60° de champ de vision
const VISION_DISTANCE = 16;            // Distance max de détection (unités)
const VISION_DISTANCE_CROUCH = 8;      // Distance réduite si joueur accroupi

// ── canSeePlayer — teste si l'IA voit le joueur ──
// Paramètres : position et direction de l'IA
// Retourne : true si le joueur est dans le champ de vision ET non caché
function canSeePlayer(aiPos, aiYaw) {
  // 1. Vecteur IA → joueur
  const dx = playerPos.x - aiPos.x;
  const dz = playerPos.z - aiPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Distance max selon posture du joueur
  const maxDist = pState.crouching ? VISION_DISTANCE_CROUCH : VISION_DISTANCE;
  if (dist > maxDist) return false;

  // 2. Angle entre la direction de l'IA et la direction vers le joueur
  const angleToPlayer = Math.atan2(dx, dz);
  let angleDiff = angleToPlayer - aiYaw;

  // Normaliser l'angle dans [-PI, PI]
  while (angleDiff >  Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  // Hors du cône de vision ?
  if (Math.abs(angleDiff) > VISION_ANGLE / 2) return false;

  // 3. Raycasting — vérifier si un obstacle bloque la vue
  const steps = Math.ceil(dist / 0.5);
  for (let i = 1; i < steps; i++) {
    const t   = i / steps;
    const rx  = aiPos.x + dx * t;
    const rz  = aiPos.z + dz * t;

    for (const obj of solidObjects) {
      // On ignore les petits objets (caisses ne bloquent pas toujours la vue)
      if (obj.h < 1.5) continue;
      const hw = obj.w / 2;
      const hd = obj.d / 2;
      if (Math.abs(rx - obj.x) < hw && Math.abs(rz - obj.z) < hd) {
        return false;  // Bloqué par un obstacle
      }
    }
  }

  return true;  // Joueur visible !
}

// ── Détection sonore ──
// Si le joueur fait du bruit (sprint), l'IA l'entend dans un certain rayon
const SOUND_RADIUS_BASE = 8;

function canHearPlayer(aiPos) {
  if (pState.noiseLevel < 20) return false;

  const dx   = playerPos.x - aiPos.x;
  const dz   = playerPos.z - aiPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Rayon d'écoute proportionnel au bruit
  const soundRadius = SOUND_RADIUS_BASE * (pState.noiseLevel / 100);
  return dist < soundRadius;
}