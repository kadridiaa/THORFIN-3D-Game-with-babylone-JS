/* =============================================
   projectiles.js — Étape 5 : Système de tir
   Responsabilités :
     - Crée et déplace les projectiles
     - Détecte l'impact avec les ennemis
     - Appelle ENEMIES.damage() et EFFECTS.onHit() à l'impact
   ============================================= */

const PROJECTILES = {

  list:   [],
  _scene: null,

  init(scene) {
    PROJECTILES._scene = scene;
    scene.registerBeforeRender(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      PROJECTILES._updateAll(dt);
    });
  },

  // ── CRÉATION ─────────────────────────────────────────────────────────────────

  /**
   * Tire un projectile depuis une tourelle vers un ennemi.
   * Appelé par TOWERS._updateShooting() à chaque tir.
   * @param {object} tower - La tourelle qui tire
   * @param {object} enemy - L'ennemi ciblé
   */
  fire(tower, enemy) {
    const scene = PROJECTILES._scene;
    const uid   = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Position de départ : pointe du canon (position absolue du nœud barrelNode)
    const startPos = tower.barrelNode
      ? tower.barrelNode.getAbsolutePosition().clone()
      : tower.root.position.clone();
    startPos.y = Math.max(startPos.y, 0.9);

    // Taille du projectile selon le type de tourelle
    const diameter = tower.type === 'RAPID' ? 0.10 : tower.type === 'SNIPER' ? 0.18 : 0.15;

    const mesh = BABYLON.MeshBuilder.CreateSphere(`proj_${uid}`, {
      diameter,
      segments: 4,
    }, scene);
    mesh.position    = startPos;
    mesh.isPickable  = false;

    const mat = new BABYLON.StandardMaterial(`projMat_${uid}`, scene);
    mat.emissiveColor    = tower.def.rangeColor.clone();
    mat.disableLighting  = true;
    mesh.material = mat;

    // Vitesse du projectile selon le type
    const speed = tower.type === 'SNIPER' ? 22 : tower.type === 'RAPID' ? 16 : 14;

    PROJECTILES.list.push({ mesh, target: enemy, damage: tower.damage, speed });
  },

  // ── MISE À JOUR ───────────────────────────────────────────────────────────────

  _updateAll(dt) {
    for (let i = PROJECTILES.list.length - 1; i >= 0; i--) {
      const proj  = PROJECTILES.list[i];
      const enemy = proj.target;

      // Cible morte ou disposée → supprimer le projectile sans dégâts
      if (!enemy || enemy.state === ENEMIES.STATE.DEAD || !enemy.root || enemy._readyToRemove) {
        proj.mesh.dispose();
        PROJECTILES.list.splice(i, 1);
        continue;
      }

      // Vecteur vers le centre de l'ennemi
      const targetPos = enemy.root.position.clone();
      targetPos.y += 0.5;

      const dir  = targetPos.subtract(proj.mesh.position);
      const dist = dir.length();

      if (dist < 0.30) {
        // ── IMPACT ──────────────────────────────────────────────────────────
        ENEMIES.damage(enemy, proj.damage);
        if (typeof EFFECTS !== 'undefined') EFFECTS.onHit(proj.mesh.position.clone());
        if (typeof AUDIO   !== 'undefined') AUDIO.play('hit');
        proj.mesh.dispose();
        PROJECTILES.list.splice(i, 1);
      } else {
        // Déplacement linéaire vers la cible
        dir.normalize();
        proj.mesh.position.addInPlace(dir.scale(proj.speed * dt));
      }
    }
  },
};
