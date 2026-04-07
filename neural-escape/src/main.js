import { GAME_NAME, MAP, NPC as NPC_CONFIG } from "./config.js";
import { createWorld } from "./world.js";
import { Player } from "./player.js";
import { NPC, NPC_STATE } from "./npc.js";
import { HUD } from "./hud.js";
import { AudioManager } from "./audioManager.js";
import { runQuizFlow } from "./quiz.js";
import { CombatSystem } from "./combat.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

async function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);

  const hud = new HUD();
  const audio = new AudioManager();
  const world = createWorld(scene);
  const player = new Player(scene, hud, audio);
  const combat = new CombatSystem(scene, hud, audio);

  document.title = GAME_NAME;

  audio.playAmbient();

  const npcs = createNpcs(scene, world, player, audio, async (npc) => {
    const result = await combat.start(player, npc);
    if (result.playerDead) {
      hud.showGameOver(player.score, () => window.location.reload());
    }
  });

  const guardians = npcs.filter((npc) => npc.isGuardian);

  const launchQuiz = runQuizFlow({
    hud,
    audio,
    player,
    onFailTimeout: () => {
      for (const npc of npcs) {
        if (npc.alive && BABYLON.Vector3.Distance(npc.mesh.position, player.mesh.position) < 24) {
          npc.forceChase();
        }
      }
    }
  });

  let bossQuizDone = false;
  let bossCorrect = 0;
  let quizBusy = false;

  window.addEventListener("keydown", async (e) => {
    if (e.code !== "KeyE" || quizBusy || player.isDead) {
      return;
    }

    const guardian = guardians.find((g) => g.isNearPlayerForInteraction());
    if (!guardian) {
      return;
    }

    const lock = world.lockedHouses.find((h) => h.house.name === guardian.houseRef?.name);
    if (!lock || lock.unlocked) {
      return;
    }

    quizBusy = true;
    hud.showDialogue("Gardien IA: Repondez correctement pour obtenir la cle.");

    try {
      const result = await launchQuiz();

      if (result.good) {
        lock.unlocked = true;
        guardian.setState(NPC_STATE.PATROL);
        animateDoorOpen(lock.door);
        audio.playSfx("door");
      } else {
        guardian.forceChase();
      }
    } catch (error) {
      console.error(error);
      guardian.forceChase();
    } finally {
      hud.hideDialogue();
      quizBusy = false;
    }
  });

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    const now = performance.now();

    const nearbyPatrolNpcs = npcs.filter((npc) => {
      if (!npc.alive || npc.state !== NPC_STATE.PATROL) {
        return false;
      }
      return BABYLON.Vector3.Distance(npc.mesh.position, player.mesh.position) <= NPC_CONFIG.detectionRadius;
    }).length;

    player.update(dt, nearbyPatrolNpcs);

    let anyChasing = false;
    for (const npc of npcs) {
      npc.update(dt, now);
      if (npc.state === NPC_STATE.CHASE && npc.alive) {
        anyChasing = true;
      }
    }

    applySignalRules(player, npcs);
    audio.setChaseActive(anyChasing);

    handleTrapHouses(world, player, npcs, hud, audio);
    handleBossArea(world, player, npcs, hud, audio, async () => {
      if (bossQuizDone || quizBusy) {
        return;
      }
      quizBusy = true;
      bossQuizDone = true;

      hud.showDialogue("Boss IA: 5 questions finales. Minimum 3 bonnes reponses pour gagner.");
      await delay(900);

      for (let i = 0; i < 5; i += 1) {
        const result = await launchQuiz();
        if (result.good) {
          bossCorrect += 1;
        }
      }

      if (bossCorrect >= 3) {
        hud.showVictory(player.score, () => window.location.reload());
      } else {
        player.applyDamage(999);
        combat.spawnBloodBurst(player.mesh.position.clone());
        hud.showGameOver(player.score, () => window.location.reload());
      }

      quizBusy = false;
    });

    hud.drawMinimap(
      world.worldSize,
      player.mesh.position,
      npcs.map((npc) => ({
        x: npc.mesh.position.x,
        z: npc.mesh.position.z,
        color: npc.getMinimapColor()
      }))
    );
  });

  return scene;
}

function createNpcs(scene, world, player, audio, onTouchPlayer) {
  const npcs = [];
  let id = 0;

  const spawn = (zone, pos, waypoints, extra = {}) => {
    const npc = new NPC(scene, {
      id: id++,
      zone,
      position: pos,
      waypoints,
      player,
      audio,
      onTouchPlayer,
      speed: NPC_CONFIG.zoneSpeeds[zone] ?? 3,
      pathGridData: world.navGrid,
      ...extra
    });
    npcs.push(npc);
  };

  // NPC patrouilleurs par zone.
  spawn("zone1", new BABYLON.Vector3(-12, 1.1, -50), [
    new BABYLON.Vector3(-12, 1.1, -50),
    new BABYLON.Vector3(9, 1.1, -46),
    new BABYLON.Vector3(-2, 1.1, -34)
  ]);
  spawn("zone1", new BABYLON.Vector3(20, 1.1, -35), [
    new BABYLON.Vector3(20, 1.1, -35),
    new BABYLON.Vector3(30, 1.1, -50),
    new BABYLON.Vector3(10, 1.1, -54)
  ]);

  spawn("zone2", new BABYLON.Vector3(-22, 1.1, -8), [
    new BABYLON.Vector3(-22, 1.1, -8),
    new BABYLON.Vector3(-5, 1.1, 8),
    new BABYLON.Vector3(-30, 1.1, 9)
  ]);
  spawn("zone2", new BABYLON.Vector3(20, 1.1, 10), [
    new BABYLON.Vector3(20, 1.1, 10),
    new BABYLON.Vector3(6, 1.1, -6),
    new BABYLON.Vector3(30, 1.1, -2)
  ]);

  spawn("zone3", new BABYLON.Vector3(-20, 1.1, 34), [
    new BABYLON.Vector3(-20, 1.1, 34),
    new BABYLON.Vector3(-3, 1.1, 46),
    new BABYLON.Vector3(-28, 1.1, 50)
  ]);
  spawn("zone3", new BABYLON.Vector3(20, 1.1, 42), [
    new BABYLON.Vector3(20, 1.1, 42),
    new BABYLON.Vector3(10, 1.1, 56),
    new BABYLON.Vector3(30, 1.1, 58)
  ]);

  // Gardiens des portes verrouillees.
  const lockedByZone = world.lockedHouses;
  lockedByZone.forEach((lock) => {
    const pos = lock.house.position.add(new BABYLON.Vector3(0, -1.9, -7.7));
    spawn(lock.zone, pos, [pos], { isGuardian: true, houseRef: lock.house, hp: 80 });
  });

  // NPC boss.
  spawn(
    "boss",
    world.bossBuilding.position.add(new BABYLON.Vector3(0, -3.7, -10)),
    [
      world.bossBuilding.position.add(new BABYLON.Vector3(-5, -3.7, -10)),
      world.bossBuilding.position.add(new BABYLON.Vector3(5, -3.7, -10))
    ],
    { isBoss: true, hp: 160 }
  );

  return npcs;
}

function animateDoorOpen(door) {
  const animation = new BABYLON.Animation(
    `${door.name}_open`,
    "rotation.y",
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  animation.setKeys([
    { frame: 0, value: door.rotation.y },
    { frame: 20, value: door.rotation.y - Math.PI / 2 }
  ]);

  door.animations = [animation];
  door.getScene().beginAnimation(door, 0, 20, false);
  door.metadata.isLocked = false;
}

function applySignalRules(player, npcs) {
  if (player.signal > 50) {
    npcs.forEach((npc) => npc.forceSuspect());
  }
  if (player.signal > 75) {
    npcs.forEach((npc) => {
      if (npc.state === NPC_STATE.SUSPECT) {
        npc.forceChase();
      }
    });
  }
  if (player.signal >= 100) {
    npcs.forEach((npc) => npc.forceChase());
  }
}

function handleTrapHouses(world, player, npcs, hud, audio) {
  for (const trap of world.trapHouses) {
    if (trap.triggered) {
      continue;
    }

    const inside = BABYLON.Vector3.Distance(player.mesh.position, trap.house.position) < 5.3;
    if (!inside) {
      continue;
    }

    trap.triggered = true;
    setTimeout(() => {
      const ambusher = npcs.find((n) => n.zone === trap.zone && n.alive && !n.isGuardian);
      if (ambusher) {
        ambusher.forceChase();
      }
      audio.playSfx("surprise");
      hud.flashRed();
    }, 1500);
  }
}

function handleBossArea(world, player, npcs, hud, audio, onEnter) {
  const distance = BABYLON.Vector3.Distance(player.mesh.position, world.bossBuilding.position);
  if (distance < 18) {
    const boss = npcs.find((npc) => npc.isBoss && npc.alive);
    if (boss) {
      boss.forceChase();
    }
    onEnter();
  }

  audio.setHeartActive(distance < 22);
  if (distance > 25) {
    hud.hideDialogue();
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const scene = await createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
