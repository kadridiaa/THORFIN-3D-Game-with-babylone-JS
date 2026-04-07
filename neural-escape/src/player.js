import { PLAYER, SIGNAL, clamp } from "./config.js";

export class Player {
  constructor(scene, hud, audio, options = {}) {
    this.scene = scene;
    this.hud = hud;
    this.audio = audio;
    this.startPosition = options.startPosition ?? new BABYLON.Vector3(0, 1.1, -42);

    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.stamina = PLAYER.maxStamina;
    this.maxStamina = PLAYER.maxStamina;
    this.signal = 0;
    this.score = 0;

    this.isDead = false;
    this.isMoving = false;
    this.isSprinting = false;
    this.boxUntil = 0;

    this.input = { forward: false, back: false, left: false, right: false, sprint: false };

    this.mouseSensitivity = 0.0035;
    this.cameraYaw = 0;
    this.cameraPitch = 0.18;
    this.cameraHeight = 1.65;
    this.cameraDistance = 3.25;

    // ── ORDRE CRITIQUE ────────────────────────────────────────────────
    // 1) mesh capsule (source de vérité pour la position)
    this.mesh = this._createPlayerMesh();

    // 2) visualRoot positionné immédiatement sur le mesh
    //    Tous les GLB sont enfants de ce nœud.
    //    Il est mis à jour UNE SEULE FOIS par frame dans _syncVisualRoot().
    this.visualRoot = new BABYLON.TransformNode("playerVisualRoot", scene);
    this.visualRoot.position.x = this.mesh.position.x;
    this.visualRoot.position.y = this.mesh.position.y - 1.1;
    this.visualRoot.position.z = this.mesh.position.z;

    // 3) caméra + lampe
    this.camera = this._createCamera();
    this.flashlight = this._createFlashlight();
    // ─────────────────────────────────────────────────────────────────

    this.models = { walk: null, run: null, talk: null, box: null, death: null };
    this.activeModelName = null;

    this.ready = this._loadModels();
    this._registerInput();

    this.hud.updateHP(this.hp, this.maxHp);
    this.hud.updateStamina(this.stamina, this.maxStamina);
    this.hud.updateSignal(this.signal);
    this.hud.updateScore(this.score);
  }

  // ────────────────────────────────────────────────────────────────────
  // Création des objets BabylonJS
  // ────────────────────────────────────────────────────────────────────

  _createPlayerMesh() {
    const body = BABYLON.MeshBuilder.CreateCapsule(
      "player",
      { height: 2.2, radius: 0.45 },
      this.scene
    );
    body.position = this.startPosition.clone();
    body.checkCollisions = true;

    const mat = new BABYLON.StandardMaterial("playerMat", this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.28, 0.45, 0.62);
    mat.emissiveColor = new BABYLON.Color3(0.03, 0.06, 0.09);
    body.material = mat;
    body.isVisible = false;
    return body;
  }

  _createCamera() {
    const cam = new BABYLON.FreeCamera(
      "tpsCamera",
      this.mesh.position.add(new BABYLON.Vector3(0, this.cameraHeight, -this.cameraDistance)),
      this.scene
    );
    cam.checkCollisions = false;
    cam.minZ = 0.1;
    cam.fov = 0.8;
    return cam;
  }

  _createFlashlight() {
    const light = new BABYLON.SpotLight(
      "playerFlashlight",
      this.mesh.position.add(new BABYLON.Vector3(0, 1.2, 0)),
      new BABYLON.Vector3(0, -0.2, 1),
      PLAYER.flashlightAngle,
      20,
      this.scene
    );
    light.intensity = 5;
    light.range = PLAYER.flashlightRange;
    return light;
  }

  // ────────────────────────────────────────────────────────────────────
  // Chargement des modèles GLB
  // ────────────────────────────────────────────────────────────────────

  async _loadModels() {
    // ⚠️ Chargement SÉQUENTIEL obligatoire — pas de Promise.all !
    // En parallèle, result.animationGroups du GLB #3 contiendrait aussi
    // les groupes de #1 et #2. En séquentiel + filtre beforeIds,
    // chaque variant obtient UNIQUEMENT ses propres animation groups.
    await this._loadVariant("walk", ["player_walk.glb", "walk.glb"], { offset: new BABYLON.Vector3(0, 0, 0), scale: 1.0, loop: true, animSpeed: 1.3 });
    await this._loadVariant("run", ["player_run.glb", "run.glb"], { offset: new BABYLON.Vector3(0, 0, 0), scale: 1.0, loop: true, animSpeed: 1.5 });
    await this._loadVariant("talk", ["player_talk.glb", "player_talking.glb", "talk.glb", "talking.glb"], { offset: new BABYLON.Vector3(0, 0, 0), scale: 1.0, loop: true, animSpeed: 1.0 });
    await this._loadVariant("box", ["player_boxing.glb", "boxing.glb"], { offset: new BABYLON.Vector3(0, 0, 0), scale: 1.0, loop: false, animSpeed: 1.0 });
    await this._loadVariant("death", ["player_death.glb", "death.glb"], { offset: new BABYLON.Vector3(0, 0, 0), scale: 1.0, loop: false, animSpeed: 1.0 });

    const hasAny = Object.values(this.models).some(Boolean);
    this.mesh.isVisible = !hasAny;
    this._hideAllVariants();
    this.activeModelName = null;
    this._refreshVisualState(true);
  }

  async _loadVariant(name, candidates, opts) {
    try {
      // Mémoriser les uniqueIds AVANT import → on ne garde QUE les nouveaux groupes
      const beforeIds = new Set(this.scene.animationGroups.map(ag => ag.uniqueId));

      const result = await _importFirstAvailable(this.scene, candidates);

      // Filtrer : uniquement les groupes créés par CE chargement
      const ownGroups = result.animationGroups.filter(ag => !beforeIds.has(ag.uniqueId));
      console.log(`[Load "${name}"] ${ownGroups.length} groupe(s) propres (sur ${result.animationGroups.length} total scène)`);

      // ── ROOT MOTION → IN-PLACE (prétraitement des keyframes) ───────────
      // Problème : Mixamo exporte sans "In Place" → le bone hip dérive de
      // ~80 unités XZ, causant un saut visible à chaque boucle d'animation.
      //
      // Solution CORRECTE : retirer UNIQUEMENT le drift linéaire (dérive nette
      // de x0 à xN), en conservant les oscillations naturelles (balancement
      // des hanches, bobbing). Identique à l'option "In Place" de Mixamo.
      //
      //   drift_rate_X = (x_N - x_0) / (frame_N - frame_0)
      //   corrected(i) = original(i) - drift_rate * (frame_i - frame_0)
      //   → frame 0 : inchangé (correction = 0)          ✓
      //   → frame N : corrigé à x_0 (même que frame 0)   ✓
      //   → boucle  : aucun snap, pose identique aux deux bouts ✓
      const ROOT_BONE_RE = /^mixamorig\d*[_:](?:Hips|Root)$|^(?:Hips|root|__root__|Armature)$/;

      ownGroups.forEach((ag) => {
        ag.targetedAnimations.forEach((ta) => {
          const bone = ta.target?.name ?? "";
          const prop = ta.animation?.targetProperty ?? "";

          if (ROOT_BONE_RE.test(bone) && prop === "position") {
            const keys = ta.animation.getKeys();
            if (keys.length > 1) {
              const t0 = keys[0].frame;
              const tN = keys[keys.length - 1].frame;
              const x0 = keys[0].value.x, xN = keys[keys.length - 1].value.x;
              const z0 = keys[0].value.z, zN = keys[keys.length - 1].value.z;
              const xRate = (xN - x0) / (tN - t0);
              const zRate = (zN - z0) / (tN - t0);

              ta.animation.setKeys(keys.map(k => ({
                frame: k.frame,
                value: new BABYLON.Vector3(
                  k.value.x - xRate * (k.frame - t0),
                  k.value.y,   // Y intact : bobbing naturel préservé
                  k.value.z - zRate * (k.frame - t0)
                )
              })));
              console.log(`[InPlace "${name}"] bone "${bone}" drift annulé ΔX=${(xN - x0).toFixed(1)} ΔZ=${(zN - z0).toFixed(1)}`);
            }
          }

          // Blending → transitions douces entre états
          ta.animation.enableBlending = true;
          ta.animation.blendingSpeed = 0.07;
        });
      });
      // ── FIN IN-PLACE FIX ────────────────────────────────────────────

      const root = result.meshes[0];
      if (!root) return;

      root.parent = this.visualRoot;
      root.position = opts.offset.clone();
      root.scaling.setAll(opts.scale);
      root.setEnabled(false);

      result.meshes.forEach(m => {
        m.isPickable = false;
        m.setEnabled(false);
      });

      this.models[name] = {
        root,
        ag: ownGroups[0],
        meshes: result.meshes,
        groups: ownGroups,
        loop: opts.loop,
        animSpeed: opts.animSpeed ?? 1.0,
      };

    } catch (err) {
      console.warn(`[Player] Variant "${name}" introuvable.`, err);
    }
  }


  // ────────────────────────────────────────────────────────────────────
  // Input clavier / souris
  // ────────────────────────────────────────────────────────────────────

  _registerInput() {
    window.addEventListener("keydown", (e) => this._onKey(e.code, true));
    window.addEventListener("keyup", (e) => this._onKey(e.code, false));

    const canvas = this.scene.getEngine().getRenderingCanvas();
    canvas?.addEventListener("pointerdown", () => canvas.requestPointerLock?.());

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0 && !this.isDead) {
        this.boxUntil = performance.now() + 900;
        this._refreshVisualState(true);
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.camera) return;
      const dx = e.movementX ?? 0;
      const dy = e.movementY ?? 0;
      if (dx === 0 && dy === 0) return;
      this.cameraYaw += dx * this.mouseSensitivity;  // += pour corriger l'inversion
      this.cameraPitch = clamp(this.cameraPitch - dy * this.mouseSensitivity, -0.55, 0.65);
    });
  }

  _onKey(code, pressed) {
    if (code === "KeyW" || code === "KeyZ") this.input.forward = pressed;
    if (code === "KeyS") this.input.back = pressed;
    if (code === "KeyA" || code === "KeyQ") this.input.left = pressed;
    if (code === "KeyD") this.input.right = pressed;
    if (code === "ShiftLeft" || code === "ShiftRight") this.input.sprint = pressed;
  }

  // ────────────────────────────────────────────────────────────────────
  // Boucle de jeu — appelée une fois par frame depuis indexScene.js
  // ────────────────────────────────────────────────────────────────────

  update(deltaSeconds, nearbyNpcCount) {
    if (this.isDead) {
      this._syncVisualRoot();
      this._refreshVisualState();
      return;
    }

    const frameFactor = (deltaSeconds * 1000) / 16.67;

    // Vecteur caméra (plan horizontal uniquement)
    const camFwd = new BABYLON.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    const camRight = new BABYLON.Vector3(camFwd.z, 0, -camFwd.x).normalize();

    // Vecteur de déplacement
    const move = BABYLON.Vector3.Zero();
    if (this.input.forward) move.addInPlace(camFwd);
    if (this.input.back) move.subtractInPlace(camFwd);
    if (this.input.left) move.subtractInPlace(camRight);
    if (this.input.right) move.addInPlace(camRight);

    this.isMoving = move.lengthSquared() > 0.001;
    this.isSprinting = this.input.sprint && this.stamina > 0.1 && this.isMoving;

    if (this.isMoving) {
      move.normalize();
      const speed = this.isSprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

      // Déplacer la capsule — le visualRoot suivra via _syncVisualRoot()
      this.mesh.moveWithCollisions(move.scale(speed * deltaSeconds));

      const yaw = Math.atan2(move.x, move.z) + Math.PI;
      this.mesh.rotation.y = yaw;
      this.visualRoot.rotation.y = yaw;

      if (Math.random() < 0.07) this.audio.playSfx("step");
    } else {
      this.visualRoot.rotation.y = this.mesh.rotation.y;
    }

    // Stamina
    if (this.isSprinting) {
      this.stamina = clamp(this.stamina - PLAYER.staminaDrainPerFrame * frameFactor, 0, this.maxStamina);
      this.changeSignal(SIGNAL.sprintPerSecond * deltaSeconds);
    } else {
      this.stamina = clamp(this.stamina + PLAYER.staminaRegenPerFrame * frameFactor, 0, this.maxStamina);
    }

    // Signal IA
    if (nearbyNpcCount > 0)
      this.changeSignal(nearbyNpcCount * SIGNAL.nearNpcPerSecond * deltaSeconds);
    if (!this.isMoving && nearbyNpcCount === 0)
      this.changeSignal(SIGNAL.idleFarPerSecond * deltaSeconds);

    // Lampe torche
    this.flashlight.position.copyFrom(this.mesh.position.add(new BABYLON.Vector3(0, 1.2, 0)));
    const lightDir = camFwd.clone();
    lightDir.y = -0.15;
    this.flashlight.direction = lightDir.normalize();

    // Caméra TPS
    const lookTarget = this.mesh.position.add(new BABYLON.Vector3(0, 1.35, 0));
    const hDist = this.cameraDistance * Math.cos(this.cameraPitch);
    const camOffset = new BABYLON.Vector3(
      -Math.sin(this.cameraYaw) * hDist,
      this.cameraHeight + Math.sin(this.cameraPitch) * this.cameraDistance,
      -Math.cos(this.cameraYaw) * hDist
    );
    this.camera.position.copyFrom(lookTarget.add(camOffset));
    this.camera.setTarget(lookTarget);

    // ── Synchroniser le visualRoot avec la capsule ──
    // RÈGLE : cette méthode est la SEULE à modifier visualRoot.position.
    this._syncVisualRoot();
    this._refreshVisualState();

    this.hud.updateStamina(this.stamina, this.maxStamina);
    this.hud.updateSignal(this.signal);
  }

  // Copie la position de la capsule dans le visualRoot.
  // visualRoot.position.y = mesh.position.y - 1.1
  // (la capsule a height=2.2 → centre à Y+1.1 ; le GLB part des pieds à Y=0)
  _syncVisualRoot() {
    this.visualRoot.position.x = this.mesh.position.x;
    this.visualRoot.position.y = this.mesh.position.y - 1.1;
    this.visualRoot.position.z = this.mesh.position.z;
  }


  // ────────────────────────────────────────────────────────────────────
  // Dégâts / soin / score / signal
  // ────────────────────────────────────────────────────────────────────

  applyDamage(amount) {
    if (this.isDead) return;
    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.hud.updateHP(this.hp, this.maxHp);
    if (this.hp <= 0) this._die();
  }

  heal(amount) {
    this.hp = clamp(this.hp + amount, 0, this.maxHp);
    this.hud.updateHP(this.hp, this.maxHp);
  }

  addScore(points) {
    this.score += points;
    this.hud.updateScore(this.score);
  }

  changeSignal(delta) {
    this.signal = clamp(this.signal + delta, 0, 100);
    this.hud.updateSignal(this.signal);
  }

  // ────────────────────────────────────────────────────────────────────
  // Mort
  // ────────────────────────────────────────────────────────────────────

  _die() {
    this.isDead = true;
    this._refreshVisualState(true);
    this._spawnBloodBurst();
    this.audio.playSfx("death");
  }

  // ────────────────────────────────────────────────────────────────────
  // Gestion des variants visuels
  // ────────────────────────────────────────────────────────────────────

  _getDesiredVariant() {
    if (this.isDead) return "death";
    if (performance.now() < this.boxUntil) return "box";
    if (this.isMoving && this.isSprinting) return "run";
    if (this.isMoving) return "walk";
    return "talk";
  }

  _refreshVisualState(force = false) {
    const desired = this._getDesiredVariant();
    if (!force && desired === this.activeModelName) return;

    this._hideAllVariants();

    const model =
      this.models[desired] ??
      this.models.talk ??
      this.models.walk ??
      this.models.run ??
      this.models.box ??
      this.models.death;

    if (model?.root) {
      model.root.setEnabled(true);
      model.root.isVisible = true;
      model.meshes.forEach((m) => { m.setEnabled(true); m.isVisible = true; });
      // Passe desired (pas activeModelName qui est encore l'ancien) + la frame mémorisée
      _playGroups(model.groups, model.loop, desired, this.scene, model.animSpeed, model._lastFrame ?? null);
      this.mesh.isVisible = false;
      this.activeModelName = desired;
      if (desired === "death") model.root.rotation.z = Math.PI * 0.5;
      return;
    }

    // Aucun GLB disponible → fallback capsule visible
    this.mesh.isVisible = true;
    this.mesh.rotation.x = desired === "death" ? Math.PI * 0.5 : 0;
    this.activeModelName = null;
  }

  _hideAllVariants() {
    Object.values(this.models).forEach((model) => {
      if (!model?.root) return;
      // Mémoriser la frame courante avant d'arrêter
      // = permet de reprendre là où on en était quand on revient à cet état
      model._lastFrame = model.groups[0]?.currentFrame ?? 0;
      _stopGroups(model.groups);
      model.root.setEnabled(false);
      model.root.isVisible = false;
      model.meshes.forEach((m) => { m.setEnabled(false); m.isVisible = false; });
      model.root.rotation.z = 0;
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Effets particules
  // ────────────────────────────────────────────────────────────────────

  _spawnBloodBurst() {
    const ps = new BABYLON.ParticleSystem("playerDeathBlood", 300, this.scene);
    ps.particleTexture = new BABYLON.Texture(
      "https://assets.babylonjs.com/textures/flare.png", this.scene
    );
    ps.emitter = this.mesh.position.clone();
    ps.minEmitBox = new BABYLON.Vector3(-0.15, 0, -0.15);
    ps.maxEmitBox = new BABYLON.Vector3(0.15, 0.1, 0.15);
    ps.color1 = new BABYLON.Color4(0.85, 0.02, 0.02, 1);
    ps.color2 = new BABYLON.Color4(0.55, 0.01, 0.01, 1);
    ps.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
    ps.minSize = 0.18; ps.maxSize = 0.45;
    ps.minLifeTime = 0.25; ps.maxLifeTime = 0.8;
    ps.emitRate = 1200;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    ps.gravity = new BABYLON.Vector3(0, -9, 0);
    ps.direction1 = new BABYLON.Vector3(-2, 2, -2);
    ps.direction2 = new BABYLON.Vector3(2, 5, 2);
    ps.minEmitPower = 1; ps.maxEmitPower = 3;
    ps.updateSpeed = 0.01;
    ps.manualEmitCount = 200;
    ps.start();
    setTimeout(() => ps.dispose(), 1000);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers privés (module-level)
// ────────────────────────────────────────────────────────────────────────────

async function _importFirstAvailable(scene, candidates) {
  let lastErr = null;
  for (const file of candidates) {
    try {
      return await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", file, scene);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Aucun GLB chargeable.");
}

function _playGroups(groups, loop, name, scene, animSpeed = 1.0, fromFrame = null) {
  groups.forEach((g) => {
    // Math.round() est indispensable : g.to est un float (ex: 312.9999885)
    // Sans round, on joue 311.999.. au lieu de 312, manquant des frames.
    const seamlessEnd = loop && g.to > g.from
      ? Math.round(g.to) - 1   // Exclut la dernière frame dupliquée Mixamo
      : Math.round(g.to);

    // Reprendre depuis la dernière frame connue (si valide)
    const resume = fromFrame !== null
      && fromFrame > g.from
      && fromFrame < seamlessEnd;
    const startFrame = resume ? fromFrame : g.from;

    console.log(
      `[Player] "${name}" → ${resume ? 'REPRISE' : 'DÉPART'} frame ${Math.round(startFrame)} → ${seamlessEnd}`,
      resume ? `(mémorisée: ${fromFrame?.toFixed(1)})` : ''
    );

    g.start(loop, animSpeed, startFrame, seamlessEnd, false);

    // Log du root bone à chaque loop pour détecter les sauts résiduels
    g.onAnimationGroupLoopObservable?.add(() => {
      const rootNames = ["__root__", "root", "Hips", "mixamorig:Hips", "mixamorig_Hips"];
      for (const boneName of rootNames) {
        const node = scene?.getTransformNodeByName(boneName);
        if (node) {
          const p = node.absolutePosition;
          console.warn(`[Loop "${name}"] ROOT au loop ⇒ y:${p.y.toFixed(4)} (frame: ${g.currentFrame?.toFixed(1)})`);
          break;
        }
      }
    });
  });
}


function _stopGroups(groups) {
  groups.forEach((g) => g.stop());
}