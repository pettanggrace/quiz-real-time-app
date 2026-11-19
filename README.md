# Quiz Real-Time App

Application de quiz en temps réel avec mode solo et duel 1v1.

## URLs de développement

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:3001 |
| Backend API | http://localhost:5000 |
| WebSocket duel | ws://localhost:5000/ws |

## Stack

- **Frontend**: React 19 + Vite
- **Backend**: Node.js + Express 5 + WebSocket (ws)
- **Base de données**: Neon Postgres (serverless)

## Installation

### Prérequis
- Node.js 18+
- Compte Neon Postgres (ou fichier `.env` avec `DATABASE_URL`)

### Configuration

1. Cloner le dépôt
2. Installer les dépendances :
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
3. Configurer la base de données :
   - Créer un fichier `server/.env` (copier depuis `server/.env.example`)
   - Renseigner `DATABASE_URL` (connection string Neon Postgres)
4. Initialiser la base de données :
   ```bash
   cd server
   npm run init-db
   ```

### Démarrage

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

## API REST

### Questions
- `GET /api/questions` — Liste des questions (optionnel: `?category=web&difficulty=easy`)

### Scores
- `POST /api/scores` — Soumettre un score `{ pseudo, answers, points, mode }`
- `GET /api/scores` — Leaderboard (optionnel: `?pseudo=user&limit=10`)

### Rooms (SCRUM-4)
- `POST /api/rooms` — Créer une salle `{ code }`
- `GET /api/rooms` — Liste des salles ouvertes
- `GET /api/rooms/:code` — État d'une salle
- `DELETE /api/rooms/:code` — Supprimer une salle

### WebSocket Duel
- `ws://localhost:5000/ws` — Mode duel temps réel
  - `{"t":"create","pseudo":"..."}` — Créer une salle
  - `{"t":"join","code":"ABCD","pseudo":"..."}` — Rejoindre une salle
  - `{"t":"answer","index":0,"choice":1}` — Répondre à une question
  - `{"t":"rematch"}` — Demander une revanche

## Structure du projet

```
client/              # Frontend React
  src/pages/        # Home, Quiz, Duel, Result, Leaderboard
  src/components/   # Effets visuels
  src/services/api.js

server/             # Backend Node.js
  db/
    schema.sql      # Schéma BDD
    index.js        # Connexion Postgres
    init.js         # Script d'initialisation
  services/         # Logique métier
    questionService.js
    scoreService.js
    roomService.js
  routes/           # Endpoints REST
    questions.js
    scores.js
    rooms.js
  index.js          # Serveur Express + WebSocket
  duel.js           # Moteur de duel temps réel
```

## Base de données

Tables créées par `server/db/schema.sql` :
- `questions` — Banque de questions
- `scores` — Historique des scores / leaderboard
- `rooms` — Salles de duel
- `players` — Joueurs dans les salles
