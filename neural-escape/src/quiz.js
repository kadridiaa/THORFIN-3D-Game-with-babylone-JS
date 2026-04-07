import {
  OPENROUTER_API_KEY,
  OPENROUTER_API_URL,
  OPENROUTER_MODEL,
  QUIZ,
  getDifficultyFromScore
} from "./config.js";

function stripMarkdownFence(text) {
  return text.replace(/```json|```/gi, "").trim();
}

function normalizeQuizJson(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Format JSON invalide");
  }

  const choices = Array.isArray(payload.choices) ? payload.choices.slice(0, 4) : [];
  if (choices.length < 4) {
    throw new Error("La question doit contenir 4 choix");
  }

  return {
    question: String(payload.question || "Question indisponible"),
    choices,
    correct: String(payload.correct || "A").trim().toUpperCase().charAt(0)
  };
}

export async function fetchQuizQuestion(playerScore) {
  const difficulty = getDifficultyFromScore(playerScore);
  const systemPrompt =
    "Tu es un robot IA gardien. Tu dois tester les connaissances du joueur sur l'intelligence artificielle. " +
    "Genere UNE question a choix multiples (4 choix : A, B, C, D) sur l'IA, le machine learning, les algorithmes ou l'histoire de l'IA. " +
    `Le niveau de difficulte doit etre ${difficulty} selon le score actuel de ${playerScore} points. ` +
    "Reponds UNIQUEMENT en JSON strict au format: { \"question\": \"...\", \"choices\": [\"...\",\"...\",\"...\",\"...\"], \"correct\": \"A\" }";

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.includes("REPLACE_WITH")) {
    // Mode hors ligne pour developper sans cle API.
    return {
      question: "Quel algorithme est principalement utilise pour la classification supervisee lineaire ?",
      choices: [
        "A. Regression logistique",
        "B. K-Means",
        "C. Apriori",
        "D. Monte Carlo"
      ],
      correct: "A",
      difficulty
    };
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.8,
      max_tokens: 350
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur API OpenRouter: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Reponse API vide");
  }

  const parsed = JSON.parse(stripMarkdownFence(content));
  return { ...normalizeQuizJson(parsed), difficulty };
}

export function runQuizFlow({ hud, audio, player, onFailTimeout }) {
  return async function launchQuiz() {
    const quiz = await fetchQuizQuestion(player.score);

    return new Promise((resolve) => {
      let resolved = false;
      let remaining = QUIZ.timerSeconds;

      hud.showDialogue(`Gardien IA (${quiz.difficulty}): ${quiz.question}`);
      hud.showTimer(QUIZ.timerSeconds);
      hud.showQuiz(quiz.question, quiz.choices, (letter) => {
        if (resolved) return;
        resolved = true;

        clearInterval(timerHandle);
        hud.hideTimer();
        hud.hideQuiz();
        hud.hideDialogue();

        const good = letter.toUpperCase() === quiz.correct;
        if (good) {
          player.addScore(QUIZ.pointsCorrect);
          player.changeSignal(QUIZ.signalCorrect);
        } else {
          player.changeSignal(QUIZ.signalFail);
        }

        resolve({ good, answer: letter, correct: quiz.correct });
      });

      const timerHandle = setInterval(() => {
        remaining -= 1;
        hud.updateTimer(remaining, QUIZ.timerSeconds);
        audio.setHeartActive(remaining <= 5);

        if (remaining <= 0 && !resolved) {
          resolved = true;
          clearInterval(timerHandle);
          hud.hideTimer();
          hud.hideQuiz();
          hud.hideDialogue();
          audio.setHeartActive(false);
          player.changeSignal(QUIZ.signalFail);
          onFailTimeout();
          resolve({ good: false, timeout: true, correct: quiz.correct });
        }
      }, 1000);
    });
  };
}
