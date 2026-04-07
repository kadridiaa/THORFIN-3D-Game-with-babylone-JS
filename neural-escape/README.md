# NEURAL ESCAPE

Projet realise pour le concours 3D Gaming de l'Universite Nice Cote d'Azur.

## Pitch narratif

Neural Escape est un jeu TPS d'exploration nocturne. Une ville abandonnee est controlee par des robots gardiens qui testent les humains via des quiz sur l'IA. Le joueur doit survivre, repondre aux questions, ouvrir les maisons verrouillees et atteindre le Boss final.

## Stack technique

- HTML5 / CSS3 / JavaScript ES6+
- BabylonJS (CDN)
- pathfinding.js (A*)
- Howler.js (audio)
- fetch API pour OpenRouter

## Arborescence

```text
neural-escape/
  index.html
  style.css
  src/
    main.js
    player.js
    npc.js
    world.js
    quiz.js
    combat.js
    hud.js
    audioManager.js
    config.js
  assets/
    models/
    sounds/
    textures/
```

## Fonctionnalites implementees

- Monde 3D de nuit avec brouillard et 4 zones (zone1, zone2, zone3, boss)
- Camera TPS + deplacements ZQSD/WASD
- Sprint + stamina
- Lampe torche attachee au joueur
- Systeme de signal IA global avec escalade automatique des NPC
- NPC avec FSM:
  - PATROL (vert)
  - SUSPECT (jaune)
  - CHASE (rouge)
- Pathfinding A* (pathfinding.js) pour la poursuite
- Memoire IA des 3 dernieres positions joueur
- Portes verrouillees + interaction touche E + quiz de gardien
- Maisons pieges (embuscade avec delai + flash rouge)
- Quiz dynamique via OpenRouter (mode offline de secours si cle absente)
- Combat rapide (attaquer / esquiver) avec degats et recompenses
- Effet de sang particulaire + ecran de mort + restart
- HUD complet: score, HP, stamina, signal, timer quiz, dialogue, minimap simple
- Boss final avec 5 questions et condition de victoire 3/5

## Configuration API

Editer `src/config.js`:

```javascript
export const OPENROUTER_API_KEY = "REPLACE_WITH_OPENROUTER_API_KEY";
```

Ensuite le jeu utilisera:

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Modele: `mistralai/mistral-7b-instruct`

Si la cle n'est pas definie, le jeu utilise une question locale de secours pour rester testable.

## Lancer le projet

Comme il s'agit de modules ES, lancer via un serveur local (et non en ouvrant directement le fichier):

### Option 1: VS Code Live Server

- Ouvrir le dossier `neural-escape`
- Clic droit sur `index.html` -> Open with Live Server

### Option 2: Python

```bash
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080`

## Ressources 3D / sons

Les dossiers `assets/models`, `assets/sounds`, `assets/textures` sont prets.
Vous pouvez y importer des assets libres de droits (Sketchfab CC0 / CC-BY, banques audio libres).

## Deploiement GitHub Pages

1. Pousser le dossier du projet sur un repo GitHub.
2. Settings -> Pages -> Deploy from branch.
3. Choisir la branche principale et le dossier racine.
4. Recuperer l'URL publique du livrable.
