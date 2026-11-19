# Quiz Real-Time App — Fonctionnalités & Architecture

## URLs de développement

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:3001 (3000 occupé par une autre app) |
| Backend API | http://localhost:5000 |
| WebSocket duel | ws://localhost:5000/ws (proxyé via `/ws` sur :3001) |

## Fonctionnalités actuelles

### Mode solo (`/quiz`)
- 10 questions à choix multiples (banque de questions en dur dans `server/index.js`).
- Système de score : points par bonne réponse + multiplicateur de série (cf. `server/duel.js` et `client/src/lib/scoring.js`).
- Soumission du score via `POST /api/submit`, leaderboard via `GET /api/scores` (top 10).

### Mode duel 1v1 temps réel (`/duel`)
- Création d'une salle (code à 4 caractères) ou jonction par code via WebSocket `/ws`.
- Salle d'attente (lobby), puis démarrage automatique dès que 2 joueurs sont connectés.
- 10 questions tirées aléatoirement (`shuffle`), 15 s par question, révélation de la bonne réponse, bonus vitesse + multiplicateur de série.
- Score live des deux joueurs, écran de fin avec gagnant, proposition de revanche (`rematch`).
- L'arbitre est le serveur : la bonne réponse n'est jamais envoyée avant la fin de la question.

### Effets visuels & audio (frontend)
- Composants : `Aurora`, `Particles`, `Confetti`, `Tilt`, `Avatar`, `Spinner`, `Timer`.
- Sons via `client/src/lib/sound.js`, animations CSS dans `App.css` / `index.css`.

## Architecture

```
client/  (React 19 + Vite, port 3000)
  src/pages/      Home, Quiz, Duel, Result, Leaderboard
  src/components/ effets visuels réutilisables
  src/lib/        scoring, sound, fx, history, useCountUp
  src/services/api.js   appels REST (via proxy /api)
  WebSocket duel : ws://localhost:3000/ws → proxy Vite → :5000/ws

server/  (Node.js + Express 5 + ws, port 5000)
  index.js   API REST : /api/questions, /api/submit, /api/scores
  duel.js    moteur de duel temps réel (rooms en mémoire)
```

Le frontend ne parle jamais directement au backend : tout passe par le proxy Vite (`vite.config.js`), ce qui évite les problèmes CORS en dev.

## Base de données : Neon Postgres

**Base de données configurée et initialisée.** Projet Neon : `quiz-real-time-app` (ID: `floral-mouse-18097614`).

Tables créées dans `server/db/schema.sql` :
- `questions` — Banque de questions (id, question, choices JSONB, answer, category, difficulty)
- `scores` — Historique des scores / leaderboard (pseudo, score, points, mode, created_at)
- `rooms` — Salles de duel (code, state, current_question_index, created_at)
- `players` — Joueurs dans les salles (room_id, pseudo, score, streak, is_creator)

Connection string configurée dans `server/.env`.

## Améliorations proposées

### Backend ✅ SCRUM-4 terminé
1. ~~**Persistance** : brancher Postgres (Neon) ou SQLite pour `scores` et `questions`~~ **FAIT** — Neon Postgres configuré, tables créées, questions insérées.
2. ~~**API rooms (SCRUM-4)** : formaliser les rooms en endpoints REST~~ **FAIT** — `POST/GET/DELETE /api/rooms` implémentés.
3. ~~**Structure** : séparer `routes/`, `services/`, `db/`~~ **FAIT** — refactor complet en `server/routes/`, `server/services/`, `server/db/`.
4. ~~**Config** : `.env` pour `PORT`, `DATABASE_URL`~~ **FAIT** — `.env` configuré avec `DATABASE_URL` Neon.

### Backend — Améliorations restantes
1. **Auth légère** : pseudo → identifiant de session (token) pour éviter l'usurpation de pseudo et enregistrer un historique par joueur.
2. **Validation** : `express-validator` ou schéma (zod) sur `/api/submit` ; rate limiting sur les endpoints publics.
3. **Robustesse duel** : heartbeat/ping WebSocket pour détecter les déconnexions, timeout d'inactivité en lobby, persistance de l'état de partie (reprise après refresh).
4. **Tests** : ajouter des tests backend (actuellement aucun test, `npm test` est un placeholder).

### Frontend
1. **Gestion d'erreurs réseau** : retry/feedback quand le backend est down (actuellement `throw` générique).
2. **Reconnect WebSocket** : le duel ne gère pas une perte de connexion ; ajouter reconnexion + écran "opponent left" soigné.
3. **Accessibilité** : labels sur les boutons de choix, navigation clavier dans le quiz, contrastes.
4. **Perf** : `React.memo`/`useMemo` sur les pages à animations lourdes (`Particles`, `Aurora`), lazy-loading des pages (`React.lazy`).
5. **Tests** : étendre `scoring.test.js`, ajouter des tests de composants (Vitest + Testing Library).
6. **Types** : migration progressive vers TypeScript ou au minimum JSDoc + `tsc --checkJs`.
7. **UX** : skeletons de chargement, indicateur de série/points en solo, page lobby plus riche (avatars, prêts/cadeaux).

## Dette / points d'attention
- `server/package.json` n'a pas de script `start`/`dev` — lancer avec `node index.js`.
- Le scoring duel (`left`, multiplicateur de série) est dupliqué côté client (`scoring.js`) et serveur (`duel.js`) — risque de divergence ; source de vérité = serveur.
- La banque de questions est identique pour tous les joueurs et le mode solo — à externaliser.
