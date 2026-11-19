# Instructions pour le développeur back-end

Le front-end du quiz est terminé et poussé sur la branche **`feature/SCRUM-3-frontend-quiz-ui`**.
Ce document explique comment le récupérer, le lancer, ce que le back-end doit fournir, et comment travailler sans casser le front.

**Règle d'or : le front est figé tant qu'on ne se parle pas.** Le back-end s'adapte au contrat ci-dessous ; si un changement de contrat est nécessaire, on en discute d'abord (voir « Changer le contrat »).

---

## 1. Récupérer le projet

```bash
git clone https://github.com/pettanggrace/quiz-real-time-app.git
cd quiz-real-time-app
git fetch --all
```

Le front et un serveur de test se trouvent sur la branche `feature/SCRUM-3-frontend-quiz-ui`. Tant que la pull request n'est pas fusionnée dans `main`, pars de cette branche pour tes propres branches :

```bash
# Ta branche de travail (les branches SCRUM-4 et SCRUM-5 existent déjà pour le back-end)
git checkout feature/SCRUM-4-backend-api-rooms
git merge origin/feature/SCRUM-3-frontend-quiz-ui     # récupère client/ et server/
```

Une fois la pull request du front fusionnée dans `main`, utilise plutôt `git merge origin/main`.

> **Ne pousse jamais directement sur `main`**, ni sur `feature/SCRUM-3-frontend-quiz-ui` (c'est la branche du front). Travaille sur `feature/SCRUM-4-backend-api-rooms` (API, salles) et `feature/SCRUM-5-realtime-sockets-score` (temps réel, score), puis ouvre une pull request.

## 2. Structure du dépôt

```
client/                 Front-end React + Vite (NE PAS MODIFIER sans accord)
  README.md             Contrat complet de l'API (à lire en premier)
  vite.config.js        Proxy : /api et /ws → http://localhost:5000
  src/services/api.js   Les 3 appels REST du front
  src/pages/Duel.jsx    Le client du duel (WebSocket)
server/                 Serveur de TEST (à remplacer / faire évoluer par toi)
  index.js              Express : routes REST + démarrage
  duel.js               Duel 1 contre 1 (WebSocket), implémentation de référence
docs/
  INSTRUCTIONS-BACKEND.md   Ce fichier
```

## 3. Lancer le projet en local

Prérequis : **Node.js 20 ou plus**.

Terminal 1 — le serveur (port **5000**) :
```bash
cd server
npm install
node index.js
```

Terminal 2 — le front (port **3000**) :
```bash
cd client
npm install
npm run dev
```

Ouvre http://localhost:3000. Le front appelle `/api/...` et `/ws` sur le même domaine : le proxy de Vite les redirige vers ton serveur. **Il n'y a donc pas de CORS à gérer en développement** et aucune URL en dur dans le front.

Si ton serveur écoute sur un autre port ou une autre adresse :
```bash
# Windows PowerShell
$env:VITE_BACKEND_URL = "http://localhost:8080"; npm run dev
```

## 4. Contrat à respecter

### REST

| Route | Requête | Réponse attendue |
|---|---|---|
| `GET /api/questions` | — | `200` : `[{ "question": "…", "choices": ["A","B","C","D"], "correctIndex": 0 }]` |
| `POST /api/submit` | `{ "pseudo": "…", "answers": [0, 2, -1, …], "points": 1234 }` | `200` : `{ "score": 7, "total": 10 }` · `400` : `{ "error": "…" }` |
| `GET /api/scores` | — | `200` : `[{ "pseudo": "…", "score": 7, "points": 1234 }]` (Top 10, trié) |

Détails importants :
- **10 questions**, 4 choix chacune. `answers` doit avoir la même longueur que les questions (sinon `400`).
- Une réponse **`-1`** signifie « temps écoulé » : elle compte comme fausse.
- **`score`** est le score officiel (nombre de bonnes réponses). **`points`** est un bonus calculé par le front (jauge de rapidité et séries) : il est facultatif, le serveur peut l'ignorer. Si tu le gardes, **plafonne-le** (le serveur de test le limite à 300 × nombre de questions) : le front est falsifiable.
- Le Top 10 est trié par `score` décroissant, puis par `points`.
- **`correctIndex`** (dans `/api/questions`) permet au front d'afficher immédiatement le vert/rouge, le joker 50/50 et les points. S'il est absent, le front **fonctionne quand même** mais sans ces effets. Inconvénient : on peut lire les bonnes réponses dans l'onglet réseau du navigateur. Si l'équipe veut éviter cela, il faudra un endpoint de validation par réponse — **à discuter avant de le faire** (voir §7).

### WebSocket — duel (chemin `/ws`)

Messages JSON, champ **`t`** = type. Le serveur est l'arbitre : **il n'envoie jamais la bonne réponse avant la fin de la question**.

| Sens | Message |
|---|---|
| client → serveur | `{t:'create', pseudo}` · `{t:'join', code, pseudo}` · `{t:'answer', index, choice}` · `{t:'rematch'}` |
| serveur → client | `{t:'created', you, code}` · `{t:'joined', you, code, players}` · `{t:'ready', players}` |
| | `{t:'start', ms}` · `{t:'question', index, total, question, choices, ms}` · `{t:'opp_answered', index}` |
| | `{t:'reveal', index, correct, players:[{choice, ok, pts, score}]}` · `{t:'end', winner, players}` |
| | `{t:'rematch_wanted'}` · `{t:'left'}` · `{t:'opp_gone'}` · `{t:'error', message}` |

`server/duel.js` est une implémentation complète et testée de ce protocole (salles à code de 4 lettres, 10 questions, 15 s par question, points, revanche). Tu peux la réorganiser, la persister ou la brancher sur ta base de données, **à condition de garder les mêmes messages**.

Le détail du contrat est aussi dans `client/README.md`.

## 5. Ce que le serveur actuel ne fait pas (ton travail)

Le `server/` est un serveur de **développement** :
- les scores sont **en mémoire** (perdus à chaque redémarrage) → ajouter une vraie persistance ;
- aucune authentification, aucune limitation de débit, validation minimale ;
- les questions sont écrites en dur dans `index.js` ;
- aucun test automatique côté serveur ;
- les salles du duel sont en mémoire (un seul processus).

## 6. Comment ne pas casser le projet

1. **N'édite pas `client/`.** Si tu y vois un bug ou un besoin, écris-le à Safwan (front) au lieu de le corriger toi-même.
2. **Garde les chemins** `/api/questions`, `/api/submit`, `/api/scores` et `/ws`, les noms de champs et les formes de réponse ci-dessus. Renommer un champ casse silencieusement un écran.
3. **Ne commite jamais** `node_modules/`, de fichier `.env`, de clé ou de mot de passe (des `.gitignore` sont déjà en place dans `client/` et `server/`). Utilise des variables d'environnement.
4. **Une branche par fonctionnalité, une pull request par branche.** Pas de `git push --force`, pas de réécriture de l'historique partagé.
5. **Avant chaque pull request**, vérifie que le front tourne encore :
   - `cd client && npm install && npm run build` (doit réussir) et `npm test` (7 tests) ;
   - lance serveur + front, joue **une partie solo complète** (accueil → 10 questions → résultat → classement) et **un duel** à deux onglets.
6. **Fins de ligne** : les avertissements « LF will be replaced by CRLF » sous Windows sont sans importance.

## 7. Changer le contrat (si nécessaire)

Exemples : valider chaque réponse côté serveur pour supprimer `correctIndex`, ajouter des catégories, des comptes utilisateurs…
1. Écris la proposition (route, entrée, sortie) et envoie-la à Safwan.
2. Le front est adapté **en même temps** que le serveur, dans deux pull requests liées.
3. Ne déploie pas un changement de contrat sans que l'autre côté soit prêt.

## 8. Tester l'API à la main

```bash
curl http://localhost:5000/api/questions
curl -X POST http://localhost:5000/api/submit -H "Content-Type: application/json" \
     -d '{"pseudo":"Test","answers":[0,0,0,0,0,0,0,0,0,0],"points":100}'
curl http://localhost:5000/api/scores
# Cas d'erreur attendu (400) : mauvais nombre de réponses
curl -X POST http://localhost:5000/api/submit -H "Content-Type: application/json" \
     -d '{"pseudo":"Test","answers":[0]}'
```

## 9. Contact

Questions sur le front, le contrat ou un écran : **Safwan** (front-end).
