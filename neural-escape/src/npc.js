import { NPC as NPC_CONFIG } from "./config.js";

const STATE = {
  PATROL: "PATROL",
  SUSPECT: "SUSPECT",
  CHASE: "CHASE"
};

const STATE_COLOR = {
  PATROL: new BABYLON.Color3(0, 1, 0),
  SUSPECT: new BABYLON.Color3(1, 1, 0),
  CHASE: new BABYLON.Color3(1, 0, 0)
};

export class NPC {
  constructor(scene, options) {
    this.scene = scene;
    this.id = options.id;
    this.zone = options.zone;
    this.isGuardian = Boolean(options.isGuardian);
    this.isBoss = Boolean(options.isBoss);
    this.houseRef = options.houseRef ?? null;
    this.player = options.player;
    this.audio = options.audio;
    this.onTouchPlayer = options.onTouchPlayer;

    this.state = STATE.PATROL;
    this.waypoints = options.waypoints ?? [options.position.clone()];
    this.waypointIndex = 0;

    this.suspectTimer = 0;
    this.lastRepathTime = 0;
    this.path = [];
    this.pathIndex = 0;

    this.lastSeenPositions = [];

    this.speed = options.speed;
    this.hp = options.hp ?? 60;
    this.alive = true;
    this.inCombatCooldown = false;

    this.mesh = this.createMesh(options.position);
    this.modelRoot = null;
    this.modelLoaded = false;
    this.detectionRadius = options.detectionRadius ?? NPC_CONFIG.detectionRadius;

    this.finder = typeof window.PF !== "undefined" ? new PF.AStarFinder() : null;
    this.pathGridData = options.pathGridData;

    this.ready = this.loadModel();
  }

  createMesh(position) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(
      `npc_${this.id}`,
      { height: 2.2, diameter: 1.1 },
      this.scene
    );
    mesh.position = position.clone();
    mesh.checkCollisions = true;

    const mat = new BABYLON.StandardMaterial(`npcMat_${this.id}`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.22, 0.22, 0.24);
    mat.emissiveColor = STATE_COLOR.PATROL.clone();
    mesh.material = mat;

    return mesh;
  }

  getModelFileName() {
    if (this.isBoss) {
      return ["player_talking.glb", "talking.glb"];
    }
    if (this.isGuardian) {
      return ["player_talking.glb", "talking.glb"];
    }
    return ["player_boxing.glb", "boxing.glb"];
  }

  async loadModel() {
    try {
      const result = await importFirstAvailableModel(this.scene, this.getModelFileName());

      const root = result.meshes[0] ?? null;
      if (!root) {
        return;
      }

      result.meshes.forEach((mesh) => {
        if (mesh && mesh !== this.mesh) {
          mesh.parent = this.mesh;
        }
      });

      if (root.position) {
        root.position = new BABYLON.Vector3(0, -1.15, 0);
      }
      if (root.scaling) {
        const scale = this.isBoss ? 1.8 : this.isGuardian ? 1.35 : 1.25;
        root.scaling = new BABYLON.Vector3(scale, scale, scale);
      }

      this.modelRoot = root;
      this.modelLoaded = true;
      this.mesh.isVisible = false;

      result.animationGroups?.forEach((group) => group.start(true));

      this.applyStateColor();
    } catch (error) {
      console.warn(`Chargement du modele NPC ${this.id} impossible, fallback utilise.`, error);
    }
  }

  applyStateColor() {
    const color = STATE_COLOR[this.state];
    const targets = this.modelRoot ? this.modelRoot.getChildMeshes?.() ?? [] : [this.mesh];

    for (const mesh of targets) {
      const material = mesh.material;
      if (material && "emissiveColor" in material) {
        material.emissiveColor = color.clone();
      }
      if (material && "diffuseColor" in material && !this.modelLoaded) {
        material.diffuseColor = color.scale(0.25);
      }
    }

    if (!this.modelLoaded && this.mesh.material && "emissiveColor" in this.mesh.material) {
      this.mesh.material.emissiveColor = color.clone();
    }
  }

  setState(next) {
    if (!this.alive || this.state === next) {
      return;
    }

    this.state = next;
    this.applyStateColor();

    if (next === STATE.SUSPECT) {
      this.audio.playSfx("alert");
      this.suspectTimer = 0;
    }
  }

  forceSuspect() {
    if (this.state === STATE.PATROL) {
      this.setState(STATE.SUSPECT);
    }
  }

  forceChase() {
    this.setState(STATE.CHASE);
  }

  update(deltaSeconds, nowMs) {
    if (!this.alive) {
      return;
    }

    const playerPos = this.player.mesh.position;
    const distance = BABYLON.Vector3.Distance(this.mesh.position, playerPos);

    if (distance < this.detectionRadius) {
      this.rememberPlayerPosition(playerPos);
    }

    switch (this.state) {
      case STATE.PATROL:
        this.handlePatrol(deltaSeconds, distance);
        break;
      case STATE.SUSPECT:
        this.handleSuspect(deltaSeconds, distance);
        break;
      case STATE.CHASE:
        this.handleChase(deltaSeconds, distance, nowMs);
        break;
      default:
        break;
    }

    if (this.state === STATE.CHASE && distance <= NPC_CONFIG.touchCombatDistance) {
      if (!this.inCombatCooldown) {
        this.inCombatCooldown = true;
        this.onTouchPlayer(this);
        setTimeout(() => {
          this.inCombatCooldown = false;
        }, 1500);
      }
    }
  }

  handlePatrol(deltaSeconds, distance) {
    if (!this.isGuardian) {
      this.moveToCurrentWaypoint(deltaSeconds);
    }

    if (distance < this.detectionRadius) {
      this.setState(STATE.SUSPECT);
    }

    if (!this.isGuardian && this.lastSeenPositions.length > 0 && Math.random() < 0.002) {
      const remembered = this.lastSeenPositions[this.lastSeenPositions.length - 1];
      this.waypoints = [remembered.clone(), ...this.waypoints];
      this.waypointIndex = 0;
    }
  }

  handleSuspect(deltaSeconds, distance) {
    const dirToPlayer = this.player.mesh.position.subtract(this.mesh.position);
    dirToPlayer.y = 0;
    if (dirToPlayer.lengthSquared() > 0.001) {
      this.mesh.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);
    }

    if (distance < this.detectionRadius) {
      this.suspectTimer += deltaSeconds;
      if (this.suspectTimer >= NPC_CONFIG.suspectLockSeconds) {
        this.setState(STATE.CHASE);
      }
    } else {
      this.setState(STATE.PATROL);
    }
  }

  handleChase(deltaSeconds, distance, nowMs) {
    if (distance > this.detectionRadius * 3.2 && !this.isBoss) {
      this.setState(STATE.PATROL);
      return;
    }

    if (nowMs - this.lastRepathTime > NPC_CONFIG.chaseRepathMs) {
      this.calculatePathToPlayer();
      this.lastRepathTime = nowMs;
    }

    if (this.path.length > 0) {
      this.followPath(deltaSeconds);
    } else {
      this.moveDirectTo(this.player.mesh.position, deltaSeconds);
    }
  }

  moveToCurrentWaypoint(deltaSeconds) {
    const target = this.waypoints[this.waypointIndex];
    this.moveDirectTo(target, deltaSeconds);

    if (BABYLON.Vector3.Distance(this.mesh.position, target) < 0.8) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }
  }

  moveDirectTo(target, deltaSeconds) {
    const dir = target.subtract(this.mesh.position);
    dir.y = 0;
    if (dir.lengthSquared() < 0.0005) {
      return;
    }
    dir.normalize();
    this.mesh.moveWithCollisions(dir.scale(this.speed * deltaSeconds));
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }

  calculatePathToPlayer() {
    if (!this.finder || !this.pathGridData) {
      this.path = [];
      return;
    }

    const worldHalf = 60;
    const cellSize = 6;

    const toCell = (value) => Math.max(0, Math.min(19, Math.floor((value + worldHalf) / cellSize)));

    const sx = toCell(this.mesh.position.x);
    const sy = toCell(this.mesh.position.z);
    const ex = toCell(this.player.mesh.position.x);
    const ey = toCell(this.player.mesh.position.z);

    const grid = new PF.Grid(this.pathGridData);
    const path = this.finder.findPath(sx, sy, ex, ey, grid);

    this.path = path.map(([x, y]) => {
      const wx = x * cellSize - worldHalf + cellSize * 0.5;
      const wz = y * cellSize - worldHalf + cellSize * 0.5;
      return new BABYLON.Vector3(wx, this.mesh.position.y, wz);
    });
    this.pathIndex = 0;
  }

  followPath(deltaSeconds) {
    if (this.pathIndex >= this.path.length) {
      return;
    }
    const node = this.path[this.pathIndex];
    this.moveDirectTo(node, deltaSeconds);
    if (BABYLON.Vector3.Distance(this.mesh.position, node) < 0.55) {
      this.pathIndex += 1;
    }
  }

  rememberPlayerPosition(pos) {
    this.lastSeenPositions.push(pos.clone());
    if (this.lastSeenPositions.length > 3) {
      this.lastSeenPositions.shift();
    }
  }

  isNearPlayerForInteraction() {
    return (
      this.alive &&
      this.isGuardian &&
      BABYLON.Vector3.Distance(this.mesh.position, this.player.mesh.position) <= NPC_CONFIG.interactRadius
    );
  }

  receiveDamage(amount) {
    if (!this.alive) {
      return;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    if (this.modelRoot) {
      this.modelRoot.setEnabled(false);
    }
    this.mesh.setEnabled(false);
  }

  getMinimapColor() {
    if (!this.alive) {
      return "#555";
    }
    if (this.state === STATE.CHASE) {
      return "#ff283d";
    }
    if (this.state === STATE.SUSPECT) {
      return "#ffd200";
    }
    return "#39d98a";
  }
}

async function importFirstAvailableModel(scene, fileCandidates) {
  let lastError = null;

  for (const file of fileCandidates) {
    try {
      return await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", file, scene);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Aucun modele GLB chargeable pour NPC.");
}

export const NPC_STATE = STATE;
