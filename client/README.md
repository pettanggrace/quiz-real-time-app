# Quiz — front-end (React + Vite)

## Lancer

```bash
cd client
npm install
npm run dev      # http://localhost:3000
npm test         # tests des règles de points
npm run lint     # oxlint
```

Le front appelle `/api/*` et `/ws` ; Vite les redirige vers le back-end (`http://localhost:5000` par défaut,
modifiable avec `VITE_BACKEND_URL`). Pour tester sans le vrai back-end, `server/` contient un serveur **de développement**.

## Écrans

| Écran | Fichier |
|---|---|
| Accueil (pseudo, avatar généré) | `src/pages/Home.jsx` |
| Quiz solo (chrono, jokers, séries, points) | `src/pages/Quiz.jsx` |
| Résultat (rang, stats, partage) | `src/pages/Result.jsx` |
| Classement (podium + liste) | `src/pages/Leaderboard.jsx` |
| Duel 1 contre 1 en temps réel | `src/pages/Duel.jsx` |

Règles de points : `src/lib/scoring.js` (100 pts + bonus de rapidité jusqu'à 50, multiplicateur de série jusqu'à ×2).
Trois modes (`MODES`) : Zen (25 s, points ×0,8), Classique (15 s), Éclair (8 s, points ×1,5). Le thème clair/sombre,
le mode, le pseudo, le record et l'historique des parties sont gardés dans le navigateur (`localStorage`), rien n'est envoyé au serveur.
Les points sont un **plus d'affichage** : le score officiel (sur 10) reste calculé par le serveur.

## Contrat attendu du back-end

### REST

| Route | Corps / réponse |
|---|---|
| `GET /api/questions` | `[{ question, choices[4], correctIndex? }]` |
| `POST /api/submit` | corps `{ pseudo, answers: number[], points? }` (réponse `-1` = temps écoulé) → `{ score, total }` |
| `GET /api/scores` | `[{ pseudo, score, points? }]` (Top 10) |

- `correctIndex` est **facultatif**. Sans lui, le front fonctionne mais n'affiche ni le vert/rouge, ni le 50/50, ni les points.
  Attention : l'envoyer permet de lire les bonnes réponses dans l'onglet réseau (acceptable pour un projet scolaire).
- `points` est facultatif et peut être ignoré par le serveur.

### Duel — WebSocket `/ws` (messages JSON, champ `t` = type)

Le serveur est l'arbitre : il n'envoie la bonne réponse qu'à la fin de chaque question.

| Sens | Message |
|---|---|
| client → serveur | `{t:'create', pseudo}` · `{t:'join', code, pseudo}` · `{t:'answer', index, choice}` · `{t:'rematch'}` (après `end`) |
| serveur → client | `{t:'created', you, code}` · `{t:'joined', you, code, players}` · `{t:'ready', players}` |
| | `{t:'start', ms}` · `{t:'question', index, total, question, choices, ms}` · `{t:'opp_answered', index}` |
| | `{t:'reveal', index, correct, players:[{choice, ok, pts, score}]}` · `{t:'end', winner, players}` |
| | `{t:'rematch_wanted'}` (l'autre veut une revanche ; quand les deux l'ont demandée, un nouveau `start` repart de zéro) |
| | `{t:'left'}` (départ en cours de partie) · `{t:'opp_gone'}` (départ après la fin) · `{t:'error', message}` |

Implémentation de référence (dev) : `server/duel.js`. Un lien d'invitation `/?duel=ABCD` ouvre directement le duel.
