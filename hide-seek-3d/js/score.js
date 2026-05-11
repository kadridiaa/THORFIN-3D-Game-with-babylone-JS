// ============================================================
// score.js — Timer de survie + HUD
// ============================================================

const GAME_DURATION = 120;

window.scoreData = {
  timeLeft:  GAME_DURATION,
  bestTime:  0,
  survived:  false,
};

const elTimer   = document.getElementById("timer");
const elAiState = document.getElementById("ai-state");
const elNoise   = document.getElementById("noise-bar");

let lastSecond = Date.now();

function updateScore() {
  if (!pState.alive) return;

  const now = Date.now();
  if (now - lastSecond >= 1000) {
    scoreData.timeLeft = Math.max(0, scoreData.timeLeft - 1);
    lastSecond = now;
  }

  const m = Math.floor(scoreData.timeLeft / 60);
  const s = scoreData.timeLeft % 60;
  elTimer.textContent = m + ":" + (s < 10 ? "0" : "") + s;
  elTimer.classList.toggle("danger", scoreData.timeLeft <= 30);

  if (scoreData.timeLeft <= 0) {
    scoreData.survived = true;
    pState.alive = false;
    showVictory();
    return;
  }

  const stateLabels   = { PATROL:"PATROUILLE", ALERT:"EN ALERTE !", CHASE:"TE POURSUIT !", SEARCH:"TE CHERCHE..." };
  const stateClasses  = { PATROL:"patrol", ALERT:"alert", CHASE:"chase", SEARCH:"search" };
  const st = aiData ? aiData.state : "PATROL";
  elAiState.textContent = stateLabels[st] || st;
  elAiState.className   = stateClasses[st] || "patrol";

  elNoise.style.width = (pState.noiseLevel || 0) + "%";
}

function resetScore() {
  scoreData.timeLeft  = GAME_DURATION;
  scoreData.survived  = false;
  lastSecond          = Date.now();
  elTimer.textContent = "2:00";
  elTimer.classList.remove("danger");
  elAiState.textContent = "PATROUILLE";
  elAiState.className   = "patrol";
  elNoise.style.width   = "0%";
}