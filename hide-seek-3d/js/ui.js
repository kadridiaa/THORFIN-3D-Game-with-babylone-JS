// ============================================================
// ui.js — Écrans démarrage, game over, victoire
// + initialisation de l'indicateur de danger
// ============================================================

const STYLE_BASE = `
  position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.90);
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  font-family:'Courier New',monospace;z-index:200;
`;

function showStartScreen() {
  window.gameStarted = false;

  // Éléments HUD permanents
  const ch = document.createElement("div"); ch.id = "crosshair";
  const sh = document.createElement("div"); sh.id = "sprint-hint";
  sh.textContent = "SHIFT = sprint (bruyant)  |  CTRL / C = accroupi (silencieux)  |  E = interagir";
  const fl = document.createElement("div"); fl.id = "flash-overlay";
  fl.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.45);pointer-events:none;opacity:0;transition:opacity 0.1s;z-index:60;";
  document.body.appendChild(ch);
  document.body.appendChild(sh);
  document.body.appendChild(fl);

  // Initialise l'indicateur directionnel (dans player.js)
  if (typeof initDangerIndicator === "function") initDangerIndicator();

  const s = document.createElement("div");
  s.id = "startScreen";
  s.style.cssText = STYLE_BASE;
  s.innerHTML = `
    <div style="color:#00ffcc;font-size:clamp(32px,6vw,68px);font-weight:bold;
      letter-spacing:8px;text-shadow:0 0 40px #00ffcc;
      margin-bottom:6px;animation:glitch 4s infinite;">HIDE &amp; SEEK</div>
    <div style="color:#ffffff33;font-size:12px;letter-spacing:5px;margin-bottom:44px;">
      AI EDITION — SURVIVE 2 MINUTES — 3 ZONES
    </div>
    <div style="background:rgba(0,255,204,0.03);border:1px solid #00ffcc33;
      padding:22px 44px;margin-bottom:36px;color:#aaa;font-size:14px;
      line-height:2.2;min-width:340px;">
      <b style="color:#00ffcc">Z / ↑</b> &nbsp;&nbsp;&nbsp; Avancer<br>
      <b style="color:#00ffcc">S / ↓</b> &nbsp;&nbsp;&nbsp; Reculer<br>
      <b style="color:#00ffcc">Q / A</b> &nbsp;&nbsp;&nbsp; Gauche<br>
      <b style="color:#00ffcc">D / →</b> &nbsp;&nbsp;&nbsp; Droite<br>
      <b style="color:#00ffcc">Souris</b> &nbsp; Regarder<br>
      <b style="color:#00ffcc">Shift</b> &nbsp;&nbsp;&nbsp; Sprint <span style="color:#ff6600">(fait du bruit !)</span><br>
      <b style="color:#00ffcc">Ctrl / C</b> &nbsp; S'accroupir (silencieux)<br>
      <b style="color:#00ffcc">E</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ouvrir une porte (répondre à une question)<br>
    </div>
    <div style="color:#ffaa0077;font-size:12px;margin-bottom:30px;letter-spacing:1px;text-align:center;">
      L'IA a un <b style="color:#ffaa00">champ de vision</b> et entend tes <b style="color:#ffaa00">bruits</b><br>
      Traverse les 3 zones en répondant aux questions d'informatique
    </div>
    <button id="startBtn" style="
      background:transparent;border:2px solid #00ffcc;color:#00ffcc;
      font-family:'Courier New',monospace;font-size:20px;letter-spacing:4px;
      padding:14px 60px;cursor:pointer;text-shadow:0 0 10px #00ffcc;
      box-shadow:0 0 30px #00ffcc33;">▶ JOUER</button>
    <style>
    @keyframes glitch {
      0%,88%,100%{text-shadow:0 0 40px #00ffcc;transform:none}
      90%{text-shadow:-3px 0 #ff0044,3px 0 #00ffcc;transform:translateX(-2px)}
      92%{text-shadow:3px 0 #ff0044,-3px 0 #00ffcc;transform:translateX(2px)}
      94%{text-shadow:none;transform:none}
    }
    #startBtn:hover{background:rgba(0,255,204,0.08);}
    </style>
  `;
  document.body.appendChild(s);
  document.getElementById("startBtn").addEventListener("click", () => {
    s.remove();
    window.gameStarted = true;
  });
}

function gameOver() {
  if (!pState.alive) return;
  pState.alive = false;
  const fl = document.getElementById("flash-overlay");
  if (fl) { fl.style.opacity = "1"; setTimeout(() => fl.style.opacity = "0", 200); }
  setTimeout(showGameOver, 900);
}

function showGameOver() {
  const survived = GAME_DURATION - scoreData.timeLeft;
  if (survived > scoreData.bestTime) scoreData.bestTime = survived;
  const isRecord = survived >= scoreData.bestTime && survived > 0;

  const s = document.createElement("div");
  s.style.cssText = STYLE_BASE + "color:#ff3333;";
  s.innerHTML = `
    <h1 style="font-size:clamp(36px,7vw,60px);text-shadow:0 0 30px #ff0000;
      letter-spacing:6px;margin-bottom:12px;">CAPTURÉ !</h1>
    <p style="color:#888;font-size:15px;margin-bottom:32px;">L'IA t'a repéré...</p>
    <div style="display:flex;gap:50px;margin-bottom:40px;text-align:center;">
      <div>
        <div style="color:#444;font-size:11px;letter-spacing:3px;margin-bottom:8px;">SURVÉCU</div>
        <div style="color:#00ffcc;font-size:38px;text-shadow:0 0 12px #00ffcc;">${survived}s</div>
      </div>
      <div style="width:1px;background:#333;"></div>
      <div>
        <div style="color:#444;font-size:11px;letter-spacing:3px;margin-bottom:8px;">RECORD</div>
        <div style="color:${isRecord?'#ffcc00':'#00ffcc'};font-size:38px;">
          ${scoreData.bestTime}s ${isRecord && survived>0?'🏆':''}
        </div>
      </div>
    </div>
    <button id="rbtn" style="background:transparent;border:2px solid #00ffcc;color:#00ffcc;
      font-family:'Courier New',monospace;font-size:18px;letter-spacing:3px;
      padding:14px 44px;cursor:pointer;text-shadow:0 0 10px #00ffcc;">▶ RECOMMENCER</button>
    <style>#rbtn:hover{background:rgba(0,255,204,0.08);}</style>
  `;
  document.body.appendChild(s);
  document.getElementById("rbtn").addEventListener("click", () => { s.remove(); restartGame(); });
}

function showVictory() {
  if (120 > scoreData.bestTime) scoreData.bestTime = 120;
  const s = document.createElement("div");
  s.style.cssText = STYLE_BASE + "color:#00ffcc;";
  s.innerHTML = `
    <div style="font-size:clamp(32px,6vw,60px);font-weight:bold;letter-spacing:6px;
      text-shadow:0 0 40px #00ffcc;margin-bottom:12px;">SURVIVANT !</div>
    <p style="color:#aaa;margin-bottom:10px;">Tu as traversé les 3 zones et échappé à l'IA !</p>
    <p style="color:#ffcc00;font-size:22px;margin-bottom:40px;text-shadow:0 0 10px #ffcc00;">✦ VICTOIRE TOTALE ✦</p>
    <button id="rbtn2" style="background:transparent;border:2px solid #00ffcc;color:#00ffcc;
      font-family:'Courier New',monospace;font-size:18px;letter-spacing:3px;
      padding:14px 44px;cursor:pointer;">▶ REJOUER</button>
    <style>#rbtn2:hover{background:rgba(0,255,204,0.08);}</style>
  `;
  document.body.appendChild(s);
  document.getElementById("rbtn2").addEventListener("click", () => { s.remove(); restartGame(); });
}

function restartGame() {
  resetPlayer();
  resetWorld();
  resetAI();
  resetScore();
  window.gameStarted = true;
}