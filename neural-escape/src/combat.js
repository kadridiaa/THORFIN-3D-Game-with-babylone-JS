import { COMBAT } from "./config.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CombatSystem {
  constructor(scene, hud, audio) {
    this.scene = scene;
    this.hud = hud;
    this.audio = audio;
    this.active = false;
  }

  async start(player, npc) {
    if (this.active || player.isDead || !npc.alive) {
      return { cancelled: true };
    }

    this.active = true;
    this.hud.showCombat(() => this.resolveChoice("ATTACK"), () => this.resolveChoice("DODGE"));
    this.hud.setCombatText("Le robot vous attaque. Choisissez vite.");

    const choice = await this.awaitChoiceWithTimer(COMBAT.turnSeconds);
    this.hud.hideCombat();

    let npcDead = false;

    if (choice === "ATTACK") {
      npc.receiveDamage(COMBAT.playerAttackDamage);
      this.hud.setCombatText("Vous frappez le robot.");
      if (npc.alive && Math.random() < COMBAT.npcCounterChance) {
        player.applyDamage(COMBAT.npcCounterDamage);
      }
      npcDead = !npc.alive;
    } else {
      const dodged = Math.random() < COMBAT.dodgeSuccessChance;
      if (!dodged) {
        player.applyDamage(COMBAT.dodgeFailDamage);
      }
    }

    if (npcDead) {
      player.addScore(COMBAT.killReward);
      player.changeSignal(COMBAT.signalOnWin);
    }

    await wait(120);
    this.active = false;
    return { npcDead, playerDead: player.isDead, choice };
  }

  resolveChoice(choice) {
    this._choiceResolver?.(choice);
  }

  awaitChoiceWithTimer(seconds) {
    return new Promise((resolve) => {
      let done = false;
      let remaining = seconds;
      this.hud.setCombatCountdown(remaining);

      this._choiceResolver = (choice) => {
        if (done) return;
        done = true;
        clearInterval(handle);
        resolve(choice);
      };

      const handle = setInterval(() => {
        remaining -= 1;
        this.hud.setCombatCountdown(remaining);

        if (remaining <= 0 && !done) {
          done = true;
          clearInterval(handle);
          resolve("MISS");
        }
      }, 1000);
    });
  }

  spawnBloodBurst(position) {
    const ps = new BABYLON.ParticleSystem("blood", 300, this.scene);
    ps.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
    ps.emitter = position;
    ps.minEmitBox = new BABYLON.Vector3(-0.1, 0, -0.1);
    ps.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
    ps.color1 = new BABYLON.Color4(0.9, 0.05, 0.05, 1);
    ps.color2 = new BABYLON.Color4(0.5, 0.02, 0.02, 1);
    ps.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
    ps.minSize = 0.2;
    ps.maxSize = 0.5;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.7;
    ps.emitRate = 1000;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    ps.gravity = new BABYLON.Vector3(0, -8, 0);
    ps.direction1 = new BABYLON.Vector3(-2, 2, -2);
    ps.direction2 = new BABYLON.Vector3(2, 5, 2);
    ps.minEmitPower = 1;
    ps.maxEmitPower = 3;
    ps.updateSpeed = 0.01;
    ps.manualEmitCount = 180;
    ps.start();

    setTimeout(() => ps.dispose(), 900);
  }
}
