# 🎮 Tower Defense — IA Edition

Un jeu Tower Defense 3D immersif développé avec **BabylonJS**, offrant une expérience de combat stratégique contre une intelligence artificielle progressive.

![Tower Defense](https://img.shields.io/badge/Game-Tower%20Defense-blue)
![Engine](https://img.shields.io/badge/Engine-BabylonJS%206.x-orange)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow)
![Status](https://img.shields.io/badge/Status-Deployed%20on%20Vercel-brightgreen)

---

## 📋 Table des matières

- [Caractéristiques](#-caractéristiques)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Structure du projet](#-structure-du-projet)
- [Gameplay](#-gameplay)
- [Technologies](#-technologies)
- [Déploiement](#-déploiement)
- [Contrôles](#-contrôles)
- [Contribution](#-contribution)

---

## 🚀 Caractéristiques

✨ **Graphismes 3D avancés**
- Rendu en temps réel avec BabylonJS 6.x
- Scène 3D entièrement interactive
- Effets de particules et animations fluides

🤖 **Système d'IA intelligent**
- Ennemis avec pathfinding dynamique
- Progression du niveau d'IA au fil des vagues
- Comportement tactique adaptatif

🎯 **Gameplay stratégique**
- 3 types de tourelles avec caractéristiques différentes
- Système d'économie (or, vies, score)
- 10+ vagues de difficulté croissante
- Gestion des ressources en temps réel

🎵 **Immersion audiovisuelle**
- Effets sonores générés en temps réel (Web Audio API)
- Musique adaptée à l'ambiance du jeu
- Notifications visuelles et auditives

📱 **Responsive & Performant**
- Adapté à tous les écrans
- Optimisé pour une performance stable
- Compatible navigateurs modernes

---

## 📦 Installation

### Prérequis
- Node.js (optionnel, pour développement local)
- Un navigateur moderne (Chrome, Firefox, Edge, Safari)
- Git (pour cloner le repository)

### Étapes

```bash
# 1. Clonez le repository
git clone https://github.com/YOUR_USERNAME/THORFIN-3D-Game-with-babylone-JS.git
cd THORFIN-3D-Game-with-babylone-JS/tower-defense

# 2. Lancez avec un serveur local (optionnel)
# Option A : Avec Python 3
python -m http.server 8000

# Option B : Avec Node.js (http-server)
npx http-server

# 3. Ouvrez dans votre navigateur
# http://localhost:8000
```

---

## 🎮 Utilisation

### Démarrage rapide

1. **Ouvrez [le jeu en ligne](YOUR_VERCEL_URL)** (ou `index.html` en local)
2. **Placez des tourelles** en cliquant sur la carte
3. **Lancez les vagues** d'ennemis
4. **Défendez votre base** aussi longtemps que possible
5. **Remportez la victoire** en repoussant toutes les vagues !

### Interface

```
┌─────────────────────────────────────────┐
│  Vague: X | Or: 100 | ❤️ 20 | Score: 0  │
│            [IA Level: Basique]          │
└─────────────────────────────────────────┘
│                                         │
│           ZONE DE JEU 3D                │
│         (Cliquez pour placer)           │
│                                         │
├─────────────────────────────────────────┤
│ [Standard 50or] [Sniper 75or] [Rapide] │
└─────────────────────────────────────────┘
```

---

## 📁 Structure du projet

```
tower-defense/
├── index.html              # Point d'entrée HTML
├── style.css               # Feuille de styles
├── js/
│   ├── main.js            # Initialisation et boucle de jeu
│   ├── scene.js           # Configuration BabylonJS
│   ├── map.js             # Génération et gestion de la carte
│   ├── game-state.js      # État global du jeu
│   ├── enemies.js         # Système d'ennemis + pathfinding
│   ├── towers.js          # Placement et tir des tourelles
│   ├── projectiles.js     # Gestion des projectiles
│   ├── waves.js           # Système de vagues
│   ├── effects.js         # Particules et animations
│   ├── audio.js           # Web Audio API
│   └── ui.js              # Overlays et HUD
└── vercel.json            # Configuration Vercel
```

### Architecture modulaire

Chaque module fonctionne de manière indépendante grâce à un système de namespacing :

```javascript
// Exemple: accès à un système
TOWERS.selectType('SNIPER');      // Sélection de tourelle
ENEMIES.update(scene);             // Mise à jour ennemis
WAVES.launchNext();                // Lancement vague suivante
```

---

## 🎯 Gameplay

### Types de tourelles

| Type | Dégâts | Portée | Cadence | Coût |
|------|--------|--------|--------|------|
| **Standard** | 20 | 4u | 1 tir/s | 50or |
| **Sniper** | 60 | 7.5u | 0.4 tir/s | 75or |
| **Mitrailleuse** | 8 | 3u | 3.5 tirs/s | 40or |

### Système de progression

- **Ressources** : Gagnez de l'or en tuant des ennemis
- **Économie** : Spendez pour construire des tourelles stratégiquement
- **IA Progressive** : Le niveau d'IA augmente à chaque vague
- **Score** : Basé sur les ennemis tués et les vagues complétées

### Conditions de victoire/défaite

- ✅ **Victoire** : Survivez à toutes les vagues (10+)
- ❌ **Défaite** : La base perd tous ses points de vie (20 PV)

---

## 💻 Technologies

### Frontend
- **BabylonJS 6.x** - Moteur 3D WebGL
- **JavaScript ES6+** - Programmation orientée objet
- **HTML5** - Structure
- **CSS3** - Styles et animations

### APIs Web
- **Canvas API** - Rendu 3D
- **Web Audio API** - Synthèse sonore
- **Fetch API** - Ressources dynamiques
- **LocalStorage** - Sauvegarde des données

### Déploiement
- **Vercel** - Hosting statique avec CDN global
- **Git** - Versioning

---

## 🌍 Déploiement

### Sur Vercel (Recommandé)

**Via l'interface web :**

1. Poussez votre code sur GitHub
2. Allez sur [vercel.com](https://vercel.com)
3. Connectez votre repo GitHub
4. Définissez le **Root Directory** : `THORFIN-3D-Game-with-babylone-JS/tower-defense`
5. Cliquez sur **Deploy**

**Via CLI :**

```bash
# Installez Vercel CLI
npm install -g vercel

# Naviguez au dossier
cd tower-defense

# Déployez
vercel
```

### Autres options

- **GitHub Pages** : Gratuit, simple pour projets statiques
- **Netlify** : Déploiement continu, interface intuitive
- **AWS S3 + CloudFront** : Performance et scalabilité
- **Hôbergement classique** : Tout serveur web (Apache, Nginx)

---

## ⌨️ Contrôles

### Clavier
| Touche | Action |
|--------|--------|
| `1` | Sélectionner tourelle Standard |
| `2` | Sélectionner tourelle Sniper |
| `3` | Sélectionner tourelle Mitrailleuse |
| `Clic gauche` | Placer une tourelle |
| `Espace` | Lancer vague (si disponible) |

### Souris
- **Clic sur la carte** : Placer tourelle sélectionnée
- **Clic sur bouton UI** : Interagir avec les menus

---

## 📊 Performances

- **FPS** : 60 FPS stable sur PC/Mac modernes
- **Taille bundle** : ~50KB (JS compressé)
- **CDN BabylonJS** : Chargement optimisé
- **Temps de chargement** : < 3 secondes sur connexion fiable

---

## 🐛 Dépannage

### Le jeu ne charge pas
```
✓ Vérifiez votre connexion Internet (BabylonJS depuis CDN)
✓ Actualisez la page (F5)
✓ Videz le cache du navigateur (Ctrl+Shift+Del)
✓ Testez sur un autre navigateur
```

### Performance faible
```
✓ Réduisez les ombres (paramètres BabylonJS)
✓ Fermez les onglets superflus
✓ Activez l'accélération GPU du navigateur
✓ Testez sur un appareil plus puissant
```

### Sons ne fonctionnent pas
```
✓ Autorisez les sons du site dans les paramètres du navigateur
✓ Vérifiez les contrôles de volume
✓ Testez avec un autre navigateur
```

---

## 🤝 Contribution

Les contributions sont bienvenues ! Pour contribuer :

1. **Fork** le repository
2. **Créez une branche** (`git checkout -b feature/amazing-feature`)
3. **Committez vos changements** (`git commit -m 'Add amazing feature'`)
4. **Poussez la branche** (`git push origin feature/amazing-feature`)
5. **Ouvrez une Pull Request**

### Idées d'améliorations

- 🎨 Nouveaux types de tourelles
- 🧠 IA encore plus intelligente
- 🎵 Musique dynamique adaptée au jeu
- 💾 Sauvegarde/Progression
- 🏆 Leaderboard en ligne
- 📱 Meilleur support mobile
- 🌙 Mode sombre/clair personnalisé

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👨‍💻 Auteur

**Développé par** : THORFIN  
**Contact** : [GitHub](https://github.com/YOUR_USERNAME) | [Email](mailto:your.email@example.com)

---

## 🙏 Remerciements

- **BabylonJS Team** pour l'incroyable moteur 3D
- **Vercel** pour l'hébergement performant
- Tous les contributeurs et testeurs

---

## 📝 Changelog

### v1.0.0 (2026-05-15)
- ✨ Lancement initial du jeu
- 🎮 Système de tourelles complet
- 🤖 IA multi-niveaux
- 🎵 Effets sonores et musique
- 📱 Interface responsive
- 🚀 Déploiement sur Vercel

---

## 📞 Support

Avez-vous besoin d'aide ?

- 📖 Consultez la [documentation BabylonJS](https://doc.babylonjs.com/)
- 🐛 Signalez les bugs via [GitHub Issues](https://github.com/YOUR_USERNAME/THORFIN-3D-Game-with-babylone-JS/issues)
- 💬 Rejoignez la communauté [Discord BabylonJS](https://www.babylonjs.com/#community)

---

**Amusez-vous bien et défendez votre base contre l'IA ! 🎮⚔️**
