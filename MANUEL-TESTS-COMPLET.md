# Manuel de Tests Complets — Quiz Real-Time App

Guide complet pour tester l'application à 100% (API REST, Authentification, Mode Solo, Mode Duel, WebSocket, Base de données).

---

## Table des Matières

1. [Prérequis & Installation](#1-prérequis--installation)
2. [Démarrage des Serveurs](#2-démarrage-des-serveurs)
3. [Tests API REST](#3-tests-api-rest)
4. [Tests Authentification](#4-tests-authentification)
5. [Tests Base de Données](#5-tests-base-de-données)
6. [Tests Mode Solo (Frontend)](#6-tests-mode-solo-frontend)
7. [Tests Mode Duel (Frontend + WebSocket)](#7-tests-mode-duel-frontend--websocket)
8. [Tests Backend (Jest)](#8-tests-backend-jest)
9. [Scénarios de Test Complets](#9-scénarios-de-test-complets)
10. [Checklist de Validation](#10-checklist-de-validation)

---

## 1. Prérequis & Installation

### 1.1 Prérequis
- Node.js 18+ (`node --version`)
- npm ou yarn
- Compte Neon Postgres (connection string)

### 1.2 Cloner le dépôt
```bash
git clone https://github.com/pettanggrace/quiz-real-time-app.git
cd quiz-real-time-app
```

### 1.3 Installer les dépendances
```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

### 1.4 Configurer la base de données
1. Créer le fichier `server/.env` :
```bash
cd server
cp .env.example .env
```

2. Éditer `.env` avec votre connection string Neon Postgres :
```env
PORT=5000
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=verify-full
NODE_ENV=development
JWT_SECRET=quiz-secret-key-2024-sprint1
```

### 1.5 Initialiser la base de données
```bash
cd server
npm run init-db
```
Attendre le message : `Initialisation terminée`

---

## 2. Démarrage des Serveurs

### 2.1 Démarrer le Backend
```bash
cd server
npm run dev
```
Attendre : `Serveur démarré sur http://localhost:5000`

### 2.2 Démarrer le Frontend (nouveau terminal)
```bash
cd client
npm run dev
```
Attendre : `Local: http://localhost:3001`

### 2.3 Vérifier les serveurs
```bash
# Backend
curl http://localhost:5000/api/questions

# Frontend
curl http://localhost:3001
```

---

## 3. Tests API REST

### 3.1 GET /api/questions — Récupérer les questions
```bash
curl http://localhost:5000/api/questions
```
**Attendu** : Tableau JSON de 10 questions avec `question`, `choices`, `correctIndex`, `category`, `difficulty`

#### Avec filtres
```bash
curl "http://localhost:5000/api/questions?category=web&difficulty=easy"
```
**Attendu** : Questions filtrées par catégorie et difficulté

### 3.2 POST /api/scores — Soumettre un score solo
```bash
curl -X POST http://localhost:5000/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "pseudo": "TestUser",
    "answers": [0, 1, 2, 0, 1, 2, 0, 0, 2, 3],
    "points": 2500,
    "mode": "solo"
  }'
```
**Attendu** : `{"score": 10, "total": 10}` (toutes les réponses correctes)

#### Score partiel
```bash
curl -X POST http://localhost:5000/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "pseudo": "TestUser2",
    "answers": [0, 1, 1, 0, 1, 2, 0, 0, 2, 3],
    "points": 1500,
    "mode": "solo"
  }'
```
**Attendu** : `{"score": 9, "total": 10}` (1 erreur)

#### Données invalides
```bash
curl -X POST http://localhost:5000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"pseudo": "Test"}'
```
**Attendu** : `400` avec `{"error": "Données invalides."}`

### 3.3 GET /api/scores — Leaderboard
```bash
curl http://localhost:5000/api/scores
```
**Attendu** : Tableau JSON des scores triés par score DESC, points DESC

#### Par pseudo
```bash
curl "http://localhost:5000/api/scores?pseudo=TestUser"
```
**Attendu** : Historique des scores du pseudo

### 3.4 POST /api/rooms — Créer une salle
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"code": "ABCD"}'
```
**Attendu** : `{"code": "ABCD", "state": "lobby"}`

#### Code invalide
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"code": "A"}'
```
**Attendu** : `400` avec `{"error": "Code invalide (doit être 4 caractères)."}`

#### Code déjà utilisé
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"code": "ABCD"}'
```
**Attendu** : `409` avec `{"error": "Ce code est déjà utilisé."}`

### 3.5 GET /api/rooms — Liste des salles ouvertes
```bash
curl http://localhost:5000/api/rooms
```
**Attendu** : Tableau JSON des salles en état `lobby`

### 3.6 GET /api/rooms/:code — État d'une salle
```bash
curl http://localhost:5000/api/rooms/ABCD
```
**Attendu** : Détails de la salle (code, state, players)

#### Salle inexistante
```bash
curl http://localhost:5000/api/rooms/XXXX
```
**Attendu** : `404` avec `{"error": "Salle introuvable."}`

### 3.7 DELETE /api/rooms/:code — Supprimer une salle
```bash
curl -X DELETE http://localhost:5000/api/rooms/ABCD
```
**Attendu** : `204` (no content)

---

## 4. Tests Authentification

### 4.1 POST /api/auth/register — Inscription
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"pseudo": "NewUser", "password": "password123"}'
```
**Attendu** : `201` avec `{"user": {"id": 1, "pseudo": "NewUser"}}`

#### Pseudo déjà utilisé
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"pseudo": "NewUser", "password": "otherpass"}'
```
**Attendu** : `409` avec `{"error": "Ce pseudo est déjà utilisé."}`

#### Mot de passe trop court
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"pseudo": "User2", "password": "123"}'
```
**Attendu** : `400` avec `{"error": "Pseudo et mot de passe requis (min 4 caractères)."}`

### 4.2 POST /api/auth/login — Connexion
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pseudo": "NewUser", "password": "password123"}'
```
**Attendu** : `{"token": "eyJ...", "user": {"id": 1, "pseudo": "NewUser"}}`

**Sauvegardez le token** pour les tests suivants (remplacez `<TOKEN>`).

#### Mot de passe incorrect
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pseudo": "NewUser", "password": "wrongpass"}'
```
**Attendu** : `401` avec `{"error": "Mot de passe incorrect"}`

### 4.3 GET /api/auth/me — Profil utilisateur
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```
**Attendu** : `{"user": {"id": 1, "pseudo": "NewUser"}}`

#### Sans token
```bash
curl http://localhost:5000/api/auth/me
```
**Attendu** : `401` avec `{"error": "Token manquant."}`

#### Token invalide
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer invalid-token"
```
**Attendu** : `401` avec `{"error": "Token invalide."}`

---

## 5. Tests Base de Données

### 5.1 Vérifier les tables (via Neon Console)
Connectez-vous à https://console.neon.tech et vérifiez :

| Table | Colonnes | Vérification |
|---|---|---|
| `users` | id, pseudo, password_hash, created_at, updated_at | Au moins 1 utilisateur après inscription |
| `questions` | id, question, choices, answer, category, difficulty | 10 questions insérées |
| `scores` | id, user_id, pseudo, score, points, mode, created_at | Scores sauvegardés après POST /api/scores |
| `rooms` | id, code, state, current_question_index, created_at | Salles créées après POST /api/rooms |
| `players` | id, room_id, user_id, pseudo, score, streak | Joueurs ajoutés après création/rejoindre salle |

### 5.2 Test de persistance
1. Soumettez un score : `POST /api/scores`
2. Arrêtez le serveur : `Ctrl+C`
3. Redémarrez le serveur : `npm run dev`
4. Récupérez le leaderboard : `GET /api/scores`
5. **Attendu** : Les scores sont toujours présents (persistance BDD)

---

## 6. Tests Mode Solo (Frontend)

### 6.1 Accéder à l'application
Ouvrez http://localhost:3001 dans votre navigateur.

### 6.2 Scénario Solo Complet
1. **Page d'accueil** — Saisir un pseudo (ex: "Player1")
2. **Cliquer sur "Solo"** — Accéder à la page Quiz
3. **Répondre aux 10 questions** — Choisir une réponse pour chaque question
4. **Vérifier le timer** — Le décompte s'affiche pour chaque question
5. **Fin du quiz** — Page Result avec score et points
6. **Leaderboard** — Cliquer sur "Leaderboard" pour voir le Top 10
7. **Vérifier la persistance** — Recharger la page, le score doit être dans le leaderboard

### 6.3 Validation Solo
| Étape | Attendu |
|---|---|
| Pseudo saisi | Bouton "Solo" actif |
| Clic sur "Solo" | Page Quiz chargée avec 1ère question |
| Réponse sélectionnée | Question suivante après délai |
| Fin des 10 questions | Page Result avec score/points |
| Leaderboard | Top 10 affiché avec votre score |

---

## 7. Tests Mode Duel (Frontend + WebSocket)

### 7.1 Préparation — Deux navigateurs
Ouvrez http://localhost:3001 dans **deux onglets différents** (ou deux navigateurs) pour simuler deux joueurs.

### 7.2 Scénario Duel Complet

#### Joueur 1 (Créateur)
1. Page d'accueil — Saisir pseudo "Player1"
2. Cliquer sur "Duel"
3. Cliquer sur "Créer une salle"
4. Noter le code généré (ex: "ABCD")

#### Joueur 2 (Rejoint)
1. Page d'accueil — Saisir pseudo "Player2"
2. Cliquer sur "Duel"
3. Cliquer sur "Rejoindre une salle"
4. Saisir le code "ABCD"
5. Cliquer sur "Rejoindre"

#### Synchronisation
1. **Les deux joueurs** doivent voir l'écran "Prêt"
2. Le compte à rebours démarre (3 secondes)
3. **Les deux joueurs** voient la même question en même temps

#### Jeu
1. Chaque joueur répond à la question
2. À la fin du délai (15s), la bonne réponse est révélée
3. Les scores live s'affichent pour les deux joueurs
4. Répéter pour les 10 questions

#### Fin du duel
1. Écran de fin avec gagnant
2. Option "Revanche" — cliquer pour rejouer
3. Si un joueur quitte, l'autre voit "Opponent left"

### 7.3 Validation Duel
| Étape | Attendu |
|---|---|
| Création salle | Code à 4 caractères généré |
| Rejoindre salle | "Salle introuvable" si code faux |
| Synchronisation | Les deux joueurs voient la même question |
| Révélation | La bonne réponse est affichée après 15s |
| Score live | Mise à jour en temps réel pour les deux joueurs |
| Gagnant | Affiché à la fin des 10 questions |
| Revanche | Les deux joueurs peuvent recliquer sur "Revanche" |
| Déconnexion | L'autre joueur voit "Opponent left" |

### 7.4 Test WebSocket (via wscat)
Installer wscat : `npm install -g wscat`

#### Créer une salle
```bash
wscat -c ws://localhost:5000/ws
> {"t":"create","pseudo":"WSPlayer"}
< {"t":"created","you":0,"code":"WXYZ"}
```

#### Rejoindre (nouvelle connexion)
```bash
wscat -c ws://localhost:5000/ws
> {"t":"join","code":"WXYZ","pseudo":"WSPlayer2"}
< {"t":"joined","you":1,"code":"WXYZ","players":["WSPlayer","WSPlayer2"]}
```

#### Répondre
```bash
> {"t":"answer","index":0,"choice":1}
```

---

## 8. Tests Backend (Jest)

### 8.1 Exécuter tous les tests
```bash
cd server
npm test
```
**Attendu** : `Test Suites: 1 passed, 1 total — Tests: 9 passed, 9 total`

### 8.2 Mode watch (développement)
```bash
npm run test:watch
```
Les tests se relancent automatiquement à chaque modification.

### 8.3 Détail des tests
| Test | Description |
|---|---|
| `GET /api/questions` | Récupérer les questions |
| `GET /api/questions?category=web` | Filtrage par catégorie |
| `POST /api/scores` | Soumettre un score valide |
| `POST /api/scores` | Données invalides |
| `GET /api/scores` | Récupérer le leaderboard |
| `POST /api/auth/register` | Inscription valide |
| `POST /api/auth/register` | Pseudo déjà utilisé |
| `POST /api/auth/register` | Mot de passe trop court |
| `GET /api/auth/me` | Sans token |

---

## 9. Scénarios de Test Complets

### Scénario 1 : Utilisateur Anonyme (Solo)
1. Ouvrir http://localhost:3001
2. Saisir pseudo "Anon"
3. Cliquer sur "Solo"
4. Répondre aux 10 questions
5. Vérifier le score sur la page Result
6. Vérifier le leaderboard
7. **Validation** : Score sauvegardé sans authentification

### Scénario 2 : Utilisateur Authentifié (Solo)
1. `POST /api/auth/register` avec pseudo "AuthUser"
2. `POST /api/auth/login` → récupérer le token
3. Ouvrir http://localhost:3001
4. Saisir pseudo "AuthUser"
5. Jouer en solo
6. **Validation** : Score lié à l'utilisateur via user_id

### Scénario 3 : Duel 1v1 Complet
1. Joueur 1 : Créer une salle (code "TEST")
2. Joueur 2 : Rejoindre la salle "TEST"
3. Jouer les 10 questions
4. Vérifier le gagnant
5. Cliquer sur "Revanche"
6. Rejouer une manche
7. **Validation** : Synchronisation parfaite, scores live

### Scénario 4 : Gestion d'Erreurs
1. Tenter de rejoindre une salle inexistante → erreur
2. Tenter de créer une salle avec code déjà utilisé → erreur
3. Tenter de s'inscrire avec pseudo existant → erreur
4. Tenter de se connecter avec mauvais mot de passe → erreur
5. **Validation** : Messages d'erreur clairs

### Scénario 5 : Persistance BDD
1. Jouer en solo, soumettre le score
2. Arrêter le serveur
3. Redémarrer le serveur
4. Vérifier le leaderboard
5. **Validation** : Scores persistants

---

## 10. Checklist de Validation

### Backend
- [ ] Serveur Express démarré sur http://localhost:5000
- [ ] GET /api/questions retourne 10 questions
- [ ] POST /api/scores calcule le score correctement
- [ ] GET /api/scores retourne le leaderboard
- [ ] POST /api/rooms crée une salle
- [ ] GET /api/rooms liste les salles
- [ ] DELETE /api/rooms supprime une salle
- [ ] POST /api/auth/register inscrit un utilisateur
- [ ] POST /api/auth/login retourne un token JWT
- [ ] GET /api/auth/me retourne le profil utilisateur
- [ ] Tests Jest : 9/9 passants

### Frontend
- [ ] Frontend Vite démarré sur http://localhost:3001
- [ ] Page d'accueil affichée
- [ ] Mode Solo fonctionne (10 questions)
- [ ] Score affiché en fin de quiz
- [ ] Leaderboard affiché
- [ ] Mode Duel fonctionne (création salle)
- [ ] Mode Duel fonctionne (rejoindre salle)
- [ ] Mode Duel synchronisé (deux joueurs)
- [ ] Revanche fonctionne

### Base de Données
- [ ] Table `users` créée
- [ ] Table `questions` créée avec 10 questions
- [ ] Table `scores` créée
- [ ] Table `rooms` créée
- [ ] Table `players` créée
- [ ] Scores persistants après redémarrage

### WebSocket
- [ ] ws://localhost:5000/ws accessible
- [ ] Création salle via WebSocket
- [ ] Rejoindre salle via WebSocket
- [ ] Réponse envoyée via WebSocket
- [ ] Révélation de la bonne réponse
- [ ] Score live envoyé aux deux joueurs

---

## Conclusion

Si tous les points de la checklist sont validés, l'application est **100% opérationnelle** et prête pour la démo de soutenance.

Pour toute question ou problème, consultez :
- `README.md` — Guide d'installation
- `ARCHITECTURE.md` — Architecture technique
- `RAPPORT-MEMBRE5-BACKEND.md` — Rapport backend détaillé
