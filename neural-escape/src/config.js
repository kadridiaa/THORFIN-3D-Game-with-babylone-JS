export const GAME_NAME = "NEURAL ESCAPE";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODEL = "mistralai/mistral-7b-instruct";

// Remplacer par votre cle API OpenRouter avant la demo.
export const OPENROUTER_API_KEY = "REPLACE_WITH_OPENROUTER_API_KEY";

export const MAP = {
  gridSize: 20,
  cellSize: 6,
  fogDensity: 0.02
};

export const PLAYER = {
  maxHp: 100,
  maxStamina: 100,
  walkSpeed: 4,
  sprintSpeed: 7,
  staminaDrainPerFrame: 2,
  staminaRegenPerFrame: 1,
  flashlightRange: 15,
  flashlightAngle: Math.PI / 4
};

export const QUIZ = {
  timerSeconds: 20,
  pointsCorrect: 50,
  signalCorrect: -20,
  signalFail: 15
};

export const COMBAT = {
  playerAttackDamage: 30,
  npcCounterChance: 0.2,
  npcCounterDamage: 15,
  dodgeSuccessChance: 0.6,
  dodgeFailDamage: 10,
  killReward: 100,
  signalOnWin: -30,
  turnSeconds: 3
};

export const SIGNAL = {
  sprintPerSecond: 2,
  nearNpcPerSecond: 1,
  idleFarPerSecond: -1
};

export const NPC = {
  detectionRadius: 8,
  interactRadius: 3,
  touchCombatDistance: 1.6,
  chaseRepathMs: 500,
  suspectLockSeconds: 3,
  zoneSpeeds: {
    zone1: 3,
    zone2: 4,
    zone3: 5,
    boss: 5.5
  }
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getDifficultyFromScore(score) {
  if (score <= 100) {
    return "easy";
  }
  if (score <= 300) {
    return "medium";
  }
  return "hard";
}
