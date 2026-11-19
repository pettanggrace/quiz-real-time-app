# Rapport du Membre 5 — Développeur Backend
**Sprint 1 - MVP Quiz Temps Réel (48h)**

---

## Résumé de la Mission

En tant que Développeur Backend et QA pour le projet Quiz Real-Time App, ma mission était de :

1. Concevoir et implémenter l'API REST Node.js (Endpoints sécurisés pour questions, scores, rooms)
2. Intégrer une base de données persistante (Neon Postgres)
3. Assurer la qualité des livrables via les tests et la gestion des bugs
4. Documenter l'architecture technique et le déploiement

---

## 1. Architecture Backend Implémentée

### Stack Technique
- **Runtime** : Node.js 18+
- **Framework** : Express 5
- **Base de données** : Neon Postgres (serverless)
- **WebSocket** : `ws` pour le mode duel temps réel
- **Authentification** : JWT (jsonwebtoken) + bcryptjs
- **Tests** : Jest + supertest
- **ORM** : Pool pg (PostgreSQL natif)

### Structure du Code
```
server/
├── db/
│   ├── schema.sql          # Schéma BDD (tables: users, questions, scores, rooms, players)
│   ├── index.js            # Connexion Pool Postgres
│   └── init.js             # Script d'initialisation (drop/create tables + seed questions)
├── services/
│   ├── questionService.js  # CRUD questions (getAll, create, seed)
│   ├── scoreService.js     # CRUD scores (submit, leaderboard)
│   ├── roomService.js      # CRUD rooms (create, get, update, delete, list)
│   └── authService.js      # Auth (register, login, verifyToken, getUserById)
├── routes/
│   ├── questions.js        # GET /api/questions
│   ├── scores.js           # POST /api/scores, GET /api/scores
│   ├── rooms.js            # POST/GET/DELETE /api/rooms
│   └── auth.js             # POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
├── __tests__/
│   └── api.test.js         # Tests unitaires API (9 tests passants)
├── duel.js                 # Moteur WebSocket pour le mode duel (persistance BDD)
├── index.js                # Point d'entrée serveur Express + WebSocket
├── .env                    # Variables d'environnement (DATABASE_URL, JWT_SECRET)
└── package.json            # Dépendances + scripts (npm run dev, npm test, npm run init-db)
```

---

## 2. API REST — Endpoints Implémentés

### Questions
| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/questions` | Récupérer toutes les questions (optionnel: `?category=web&difficulty=easy`) | Non |

### Scores
| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/scores` | Soumettre un score `{ pseudo, answers, points, mode }` | Optionnel (JWT) |
| GET | `/api/scores` | Leaderboard (optionnel: `?pseudo=user&limit=10`) | Non |

### Rooms (SCRUM-4)
| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/rooms` | Créer une salle `{ code }` | Non |
| GET | `/api/rooms` | Liste des salles ouvertes | Non |
| GET | `/api/rooms/:code` | État d'une salle (joueurs, state) | Non |
| DELETE | `/api/rooms/:code` | Supprimer une salle | Non |

### Authentification
| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Inscription `{ pseudo, password }` | Non |
| POST | `/api/auth/login` | Connexion `{ pseudo, password }` → `{ token, user }` | Non |
| GET | `/api/auth/me` | Profil utilisateur (header `Authorization: Bearer <token>`) | Oui (JWT) |

### WebSocket Duel
| Action | Payload | Description |
|---|---|---|
| `create` | `{ t: "create", pseudo: "..." }` | Créer une salle, retourne code |
| `join` | `{ t: "join", code: "ABCD", pseudo: "..." }` | Rejoindre une salle existante |
| `answer` | `{ t: "answer", index: 0, choice: 1 }` | Répondre à une question |
| `rematch` | `{ t: "rematch" }` | Demander une revanche |

---

## 3. Base de Données — Schéma Neon Postgres

### Tables Créées

#### `users`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL (PK) | ID auto-incrémenté |
| pseudo | TEXT (UNIQUE) | Pseudo unique de l'utilisateur |
| password_hash | TEXT | Mot de passe hashé (bcrypt) |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour (trigger auto) |

#### `questions`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL (PK) | ID auto-incrémenté |
| question | TEXT | Texte de la question |
| choices | JSONB | Tableau des 4 choix `["A", "B", "C", "D"]` |
| answer | INTEGER | Index de la bonne réponse (0-3) |
| category | TEXT | Catégorie (web, backend, agile, etc.) |
| difficulty | TEXT | Difficulté (easy, medium, hard) |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

#### `scores`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL (PK) | ID auto-incrémenté |
| user_id | INTEGER (FK) | Référence users.id (nullable pour pseudo-only) |
| pseudo | TEXT | Pseudo du joueur |
| score | INTEGER | Nombre de bonnes réponses |
| points | INTEGER | Points calculés (bonus temps + série) |
| mode | TEXT | Mode (solo, duel) |
| total_questions | INTEGER | Nombre total de questions |
| created_at | TIMESTAMP | Date de soumission |

#### `rooms`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL (PK) | ID auto-incrémenté |
| code | TEXT (UNIQUE) | Code à 4 caractères (ex: ABCD) |
| state | TEXT | État (lobby, play, end) |
| current_question_index | INTEGER | Index de la question en cours |
| total_questions | INTEGER | Nombre total de questions (par défaut 10) |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

#### `players`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL (PK) | ID auto-incrémenté |
| room_id | INTEGER (FK) | Référence rooms.id |
| user_id | INTEGER (FK) | Référence users.id (nullable) |
| pseudo | TEXT | Pseudo du joueur |
| score | INTEGER | Score actuel dans la salle |
| streak | INTEGER | Série de bonnes réponses |
| is_creator | BOOLEAN | Créateur de la salle |
| joined_at | TIMESTAMP | Date d'arrivée dans la salle |
| updated_at | TIMESTAMP | Date de mise à jour |

### Index
- `idx_users_pseudo` — Recherche rapide par pseudo
- `idx_questions_category`, `idx_questions_difficulty` — Filtrage questions
- `idx_scores_score` — Leaderboard trié par score
- `idx_scores_user` — Historique par utilisateur
- `idx_rooms_code`, `idx_rooms_state` — Recherche de salles
- `idx_players_room`, `idx_players_user` — Recherche de joueurs

### Triggers
- `update_*_updated_at` — Mise à jour automatique de `updated_at` sur UPDATE

---

## 4. Sécurité

### Authentification JWT
- **Inscription** : `POST /api/auth/register` — Mot de passe hashé avec bcrypt (10 rounds)
- **Connexion** : `POST /api/auth/login` — Token JWT valide 7 jours
- **Protection** : `Authorization: Bearer <token>` pour les endpoints sensibles
- **Fallback** : Les endpoints fonctionnent sans auth (pour la compatibilité avec le frontend existant)

### Validation
- **Validation des entrées** : Longueur pseudo (min 2), mot de passe (min 4), code salle (4 caractères)
- **Sanitization** : `trim()` et slice sur les pseudos (max 15 caractères)
- **CORS** : Configuré pour autoriser le frontend (localhost:3001)
- **SSL** : Connexion Neon Postgres avec `sslmode=verify-full`

### Anti-triche
- Calcul du score côté serveur (le frontend envoie les réponses, le serveur calcule le score)
- La bonne réponse n'est jamais envoyée avant la fin de la question (mode duel)
- Ordre des questions fixe par ID pour le mode solo (pour éviter le RANDOM() shuffle bug)

---

## 5. Tests Backend

### Framework
- **Jest** — Framework de tests unitaires
- **supertest** — Tests HTTP endpoints

### Tests Implémentés (`__tests__/api.test.js`)
| Test | Description | Résultat |
|---|---|---|
| `GET /api/questions` | Récupérer les questions | ✅ Pass |
| `GET /api/questions?category=web` | Filtrage par catégorie | ✅ Pass |
| `POST /api/scores` | Soumettre un score valide | ✅ Pass |
| `POST /api/scores` | Données invalides | ✅ Pass |
| `GET /api/scores` | Récupérer le leaderboard | ✅ Pass |
| `POST /api/auth/register` | Inscription valide | ✅ Pass |
| `POST /api/auth/register` | Pseudo déjà utilisé | ✅ Pass |
| `POST /api/auth/register` | Mot de passe trop court | ✅ Pass |
| `GET /api/auth/me` | Sans token | ✅ Pass |

**Résultat global** : 9/9 tests passants (100%)

### Commandes
```bash
cd server
npm test              # Exécuter tous les tests
npm run test:watch    # Mode watch (dev)
```

---

## 6. Mode Duel Temps Réel — WebSocket

### Architecture Hybride
- **Cache en mémoire** (`roomCache`) — Performance temps réel (WebSocket ne doit pas attendre la BDD)
- **Persistance BDD** — Chaque création/modification de salle synchronisée avec Neon Postgres
- **Reconnexion** — Les salles sont persistantes : possible de restaurer l'état après un redémarrage

### Flux WebSocket
1. **Create** — `createRoom()` → BDD + cache → envoi code au créateur
2. **Join** — `getRoomByCode()` → vérif BDD + cache → ajout joueur → `startRound()`
3. **Answer** — Cache uniquement (performance temps réel)
4. **Reveal** — `updatePlayerScore()` → BDD (sync scores) + broadcast
5. **End** — `updateRoomState()` → BDD + destruction après 2 min

### Bonus Scoring Duel
- **Vitesse** : Plus rapide = plus de points
- **Série** : Multiplicateur `1 + min(streak, 4) * 0.25` (jusqu'à x2)
- **Formule** : `(100 + (temps_restant / 15) * 50) * multiplicateur`

---

## 7. Déploiement & Configuration

### Variables d'Environnement (`.env`)
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host/database?sslmode=verify-full
NODE_ENV=development
JWT_SECRET=quiz-secret-key-2024-sprint1
```

### Scripts NPM
```json
{
  "start": "node index.js",
  "dev": "node index.js",
  "init-db": "node db/init.js",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

### Initialisation BDD
```bash
cd server
npm run init-db
```
→ Supprime les tables existantes → Crée le schéma → Insère 10 questions par défaut

### Démarrage
```bash
cd server
npm run dev
```
→ Serveur Express + WebSocket sur http://localhost:5000

---

## 8. Bugs Résolus (Tickets Jira)

### BUG-1 : Questions aléatoires cassent le calcul de score solo
- **Problème** : `getAllQuestions()` utilisait `ORDER BY RANDOM()`, donc l'ordre des questions changeait à chaque appel. Le frontend envoyait les réponses selon l'ordre initial, mais le serveur recevait des questions dans un ordre différent → score incorrect.
- **Solution** : Ajout du paramètre `random=false` par défaut pour le mode solo (ordre fixe par ID), `random=true` uniquement pour le mode duel.
- **Statut** : ✅ Résolu

### BUG-2 : Authentification BDD échoue après migration schema
- **Problème** : Après ajout de la table `users` et colonnes `user_id`, le script `init.js` échouait car les tables existaient avec l'ancien schéma.
- **Solution** : Modification de `init.js` pour supprimer les tables existantes (`DROP TABLE IF EXISTS CASCADE`) avant de recréer le schéma.
- **Statut** : ✅ Résolu

### BUG-3 : Test mock erreur 23505 pas propager correctement
- **Problème** : Le test `POST /api/auth/register` pour pseudo déjà utilisé rejetait une erreur générique au lieu de simuler une erreur PostgreSQL 23505.
- **Solution** : Création d'un objet Error avec `code: '23505'` pour simuler correctement la contrainte UNIQUE.
- **Statut** : ✅ Résolu

---

## 9. Améliorations Proposées (Backlog Sprint 2)

### Priorité Haute
1. **Rate Limiting** — `express-rate-limit` sur `/api/auth/login` pour prévenir les attaques brute-force
2. **Heartbeat WebSocket** — Ping/Pong pour détecter les déconnexions silencieuses et timeout les joueurs inactifs
3. **Validation plus stricte** — `express-validator` ou `zod` pour valider tous les payloads (email, pseudo, code salle)

### Priorité Moyenne
4. **Reconnexion WebSocket** — Le frontend devrait pouvoir se reconnecter à une salle en cours (lecture de l'état depuis la BDD)
5. **Logs structurés** — `winston` ou `pino` pour des logs JSON structurés (facilite le debugging en prod)
6. **Tests d'intégration** — Tests E2E avec une vraie BDD de test (Docker + Postgres)

### Priorité Basse
7. **GraphQL** — Remplacer REST par GraphQL pour des requêtes plus flexibles (frontend peut demander exactement ce dont il a besoin)
8. **Webhooks** — Notification externe lors de la fin d'un duel (intégration Discord/Slack)
9. **Analytique** — Table `analytics` pour tracker les statistiques (questions les plus difficiles, temps moyen de réponse)

---

## 10. Documentation

### Fichiers de Documentation
- `README.md` — Guide d'installation, démarrage, API REST
- `ARCHITECTURE.md` — Fonctionnalités, architecture, améliorations proposées
- `server/.env.example` — Template variables d'environnement
- `server/db/schema.sql` — Schéma BDD commenté

### Rapports Générés
- `RAPPORT-MEMBRE5-BACKEND.md` — Ce document

---

## 11. Bilan du Sprint

### Livrables Réalisés ✅
- [x] Serveur Express configuré avec CORS
- [x] Endpoints `/api/questions`, `/api/scores`, `/api/rooms`
- [x] Base de données Neon Postgres connectée
- [x] Tables créées (users, questions, scores, rooms, players)
- [x] Authentification JWT (register, login, verify)
- [x] Mode duel WebSocket avec persistance BDD
- [x] Tests backend (9 tests passants)
- [x] Documentation complète (README, ARCHITECTURE, schema.sql)

### Métriques
- **Tests passants** : 9/9 (100%)
- **Endpoints REST** : 8 endpoints
- **Tables BDD** : 5 tables + triggers + index
- **Couverture fonctionnelle** : Solo + Duel + Auth + Leaderboard

### Leçons Apprises
1. **L'ordre des questions compte** — Le bug RANDOM() m'a appris à toujours tester l'ordre des données aléatoires dans les API.
2. **Hybride Cache + BDD** — Pour le temps réel, le cache en mémoire est nécessaire, mais la persistance BDD est indispensable pour la reconnexion.
3. **Authentification légère** — JWT est simple et efficace pour ce type d'application, mais il faut gérer l'expiration et le refresh token.

---

## 12. Conclusion

Le backend du Quiz Real-Time App est **100% opérationnel** pour le Sprint 1. Toutes les fonctionnalités requises sont implémentées :

- ✅ API REST sécurisée avec authentification JWT
- ✅ Persistance des données via Neon Postgres
- ✅ Mode duel temps réel avec WebSocket
- ✅ Tests backend automatisés
- ✅ Documentation complète

Les améliorations proposées pour le Sprint 2 (rate limiting, heartbeat, validation stricte) permettront de renforcer la sécurité et la robustesse du système avant le passage en production.

---

**Rédigé par** : Membre 5 — Développeur Backend & QA
**Date** : 19 novembre 2026
**Sprint** : Sprint 1 - MVP Quiz Temps Réel (48h)
