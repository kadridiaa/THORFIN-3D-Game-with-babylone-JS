export class AudioManager {
  constructor() {
    this.enabled = typeof window.Howl !== "undefined";
    this.ambient = null;
    this.chase = null;
    this.heart = null;
    this.sfx = {};

    if (!this.enabled) {
      console.warn("Howler.js indisponible: audio desactive.");
      return;
    }

    this.ambient = new Howl({
      src: ["./assets/sounds/ambient-night.mp3"],
      loop: true,
      volume: 0.25
    });

    this.chase = new Howl({
      src: ["./assets/sounds/chase.mp3"],
      loop: true,
      volume: 0.5
    });

    this.heart = new Howl({
      src: ["./assets/sounds/heartbeat.mp3"],
      loop: true,
      volume: 0.45
    });

    this.sfx.alert = new Howl({ src: ["./assets/sounds/npc-alert.mp3"], volume: 0.85 });
    this.sfx.door = new Howl({ src: ["./assets/sounds/door-open.mp3"], volume: 0.8 });
    this.sfx.surprise = new Howl({ src: ["./assets/sounds/surprise.mp3"], volume: 0.95 });
    this.sfx.death = new Howl({ src: ["./assets/sounds/death.mp3"], volume: 0.9 });
    this.sfx.step = new Howl({ src: ["./assets/sounds/footstep.mp3"], volume: 0.45 });
  }

  playAmbient() {
    if (this.enabled && !this.ambient.playing()) {
      this.ambient.play();
    }
  }

  setChaseActive(active) {
    if (!this.enabled) {
      return;
    }
    if (active && !this.chase.playing()) {
      this.chase.play();
    }
    if (!active && this.chase.playing()) {
      this.chase.stop();
    }
  }

  setHeartActive(active) {
    if (!this.enabled) {
      return;
    }
    if (active && !this.heart.playing()) {
      this.heart.play();
    }
    if (!active && this.heart.playing()) {
      this.heart.stop();
    }
  }

  playSfx(name) {
    if (!this.enabled) {
      return;
    }
    const sound = this.sfx[name];
    if (sound) {
      sound.play();
    }
  }
}
