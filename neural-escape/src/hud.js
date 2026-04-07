import { clamp } from "./config.js";

export class HUD {
  constructor() {
    this.scoreValue = document.getElementById("scoreValue");
    this.hpBar = document.getElementById("hpBar");
    this.staminaBar = document.getElementById("staminaBar");
    this.signalBar = document.getElementById("signalBar");
    this.signalValue = document.getElementById("signalValue");
    this.dialogue = document.getElementById("dialogueBubble");

    this.timerRoot = document.getElementById("topCenterTimer");
    this.timerValue = document.getElementById("timerValue");
    this.timerCircle = document.getElementById("timerCircle");
    this.timerCircumference = 2 * Math.PI * 52;

    this.quizOverlay = document.getElementById("quizOverlay");
    this.quizQuestion = document.getElementById("quizQuestion");
    this.quizChoices = document.getElementById("quizChoices");

    this.combatOverlay = document.getElementById("combatOverlay");
    this.combatText = document.getElementById("combatText");
    this.attackBtn = document.getElementById("attackBtn");
    this.dodgeBtn = document.getElementById("dodgeBtn");
    this.combatCountdown = document.getElementById("combatCountdown");

    this.deathOverlay = document.getElementById("deathOverlay");
    this.deathScore = document.getElementById("deathScore");
    this.restartBtn = document.getElementById("restartBtn");

    this.victoryOverlay = document.getElementById("victoryOverlay");
    this.victoryScore = document.getElementById("victoryScore");
    this.restartVictoryBtn = document.getElementById("restartVictoryBtn");

    this.minimap = document.getElementById("minimap");
    this.minimapCtx = this.minimap.getContext("2d");
  }

  updateScore(score) {
    this.scoreValue.textContent = String(score);
  }

  updateHP(current, max) {
    const pct = (clamp(current, 0, max) / max) * 100;
    this.hpBar.style.width = `${pct}%`;
  }

  updateStamina(current, max) {
    const pct = (clamp(current, 0, max) / max) * 100;
    this.staminaBar.style.width = `${pct}%`;
  }

  updateSignal(value) {
    const safe = clamp(value, 0, 100);
    this.signalBar.style.width = `${safe}%`;
    this.signalValue.textContent = String(Math.round(safe));
    if (safe < 35) {
      this.signalBar.style.filter = "hue-rotate(0deg)";
    } else if (safe < 70) {
      this.signalBar.style.filter = "hue-rotate(-18deg)";
    } else {
      this.signalBar.style.filter = "hue-rotate(-45deg) saturate(1.25)";
    }
  }

  showDialogue(text) {
    this.dialogue.textContent = text;
    this.dialogue.classList.remove("hidden");
  }

  hideDialogue() {
    this.dialogue.classList.add("hidden");
  }

  showTimer(seconds) {
    this.timerRoot.classList.remove("hidden");
    this.updateTimer(seconds, seconds);
  }

  updateTimer(secondsLeft, totalSeconds) {
    const safe = clamp(secondsLeft, 0, totalSeconds);
    this.timerValue.textContent = String(Math.ceil(safe));
    const ratio = safe / totalSeconds;
    const dash = this.timerCircumference * (1 - ratio);
    this.timerCircle.style.strokeDasharray = `${this.timerCircumference}`;
    this.timerCircle.style.strokeDashoffset = `${dash}`;
    this.timerCircle.style.stroke = safe <= 5 ? "#ff283d" : "#21c96f";
  }

  hideTimer() {
    this.timerRoot.classList.add("hidden");
  }

  showQuiz(question, choices, onSelect) {
    this.quizQuestion.textContent = question;
    this.quizChoices.innerHTML = "";

    ["A", "B", "C", "D"].forEach((letter, index) => {
      const btn = document.createElement("button");
      btn.textContent = `${letter}. ${choices[index] ?? "(vide)"}`;
      btn.addEventListener("click", () => onSelect(letter), { once: true });
      this.quizChoices.appendChild(btn);
    });

    this.quizOverlay.classList.remove("hidden");
  }

  hideQuiz() {
    this.quizOverlay.classList.add("hidden");
  }

  showCombat(onAttack, onDodge) {
    this.combatOverlay.classList.remove("hidden");
    this.attackBtn.onclick = onAttack;
    this.dodgeBtn.onclick = onDodge;
  }

  setCombatText(text) {
    this.combatText.textContent = text;
  }

  setCombatCountdown(value) {
    this.combatCountdown.textContent = String(value);
  }

  hideCombat() {
    this.combatOverlay.classList.add("hidden");
  }

  flashRed() {
    document.body.classList.add("flash-red");
    setTimeout(() => document.body.classList.remove("flash-red"), 450);
  }

  showGameOver(score, onRestart) {
    this.deathScore.textContent = String(score);
    this.deathOverlay.style.display = "grid";
    this.deathOverlay.animate(
      [{ background: "rgba(135,0,0,0)" }, { background: "rgba(135,0,0,0.72)" }],
      { duration: 850, fill: "forwards" }
    );
    this.restartBtn.onclick = onRestart;
  }

  showVictory(score, onRestart) {
    this.victoryScore.textContent = String(score);
    this.victoryOverlay.style.display = "grid";
    this.restartVictoryBtn.onclick = onRestart;
  }

  drawMinimap(worldSize, playerPos, npcPositions) {
    const ctx = this.minimapCtx;
    const w = this.minimap.width;
    const h = this.minimap.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8, 10, 16, 0.85)";
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w, h) / worldSize;
    const toMap = (x, z) => ({
      x: w * 0.5 + x * scale,
      y: h * 0.5 + z * scale
    });

    for (const npc of npcPositions) {
      const p = toMap(npc.x, npc.z);
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const player = toMap(playerPos.x, playerPos.z);
    ctx.fillStyle = "#31a7ff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
