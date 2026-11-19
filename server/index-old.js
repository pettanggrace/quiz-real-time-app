const express = require('express');
const cors = require('cors');
const http = require('http');
const { attach } = require('./duel');

const app = express();
app.use(cors());
app.use(express.json());

const questions = [
  {
    question: 'Que signifie HTML ?',
    choices: ['HyperText Markup Language', 'High Tech Modern Language', 'Hyperlink and Text Markup Logic', 'Home Tool Markup Language'],
    answer: 0,
  },
  {
    question: 'Quel langage s\'exécute côté serveur avec Node.js ?',
    choices: ['Java', 'JavaScript', 'C#', 'Swift'],
    answer: 1,
  },
  {
    question: 'Quelle bibliothèque sert à créer des interfaces utilisateur ?',
    choices: ['Express', 'Jira', 'React', 'MongoDB'],
    answer: 2,
  },
  {
    question: 'Que signifie API ?',
    choices: ['Application Programming Interface', 'Advanced Program Installation', 'Applied Process Integration', 'Automatic Page Index'],
    answer: 0,
  },
  {
    question: 'Quelle méthode HTTP sert à envoyer des données au serveur ?',
    choices: ['GET', 'POST', 'VIEW', 'FETCHALL'],
    answer: 1,
  },
  {
    question: 'Dans Scrum, qui est responsable du Product Backlog ?',
    choices: ['Le Scrum Master', 'Le développeur', 'Le Product Owner', 'Le testeur'],
    answer: 2,
  },
  {
    question: 'Quelle est la durée d\'un sprint dans ce projet ?',
    choices: ['2 jours', '2 mois', '2 semaines', '2 heures'],
    answer: 0,
  },
  {
    question: 'Quel outil Jira montre l\'avancement du travail restant dans le temps ?',
    choices: ['Le Burndown Chart', 'Le Pull Request', 'Le Wireframe', 'Le Smart Commit'],
    answer: 0,
  },
  {
    question: 'Que signifie CSS ?',
    choices: ['Computer Style Sheets', 'Creative Server Script', 'Cascading Style Sheets', 'Coded Screen Syntax'],
    answer: 2,
  },
  {
    question: 'Quel type de ticket Jira décrit une anomalie à corriger ?',
    choices: ['Epic', 'Story', 'Task', 'Bug'],
    answer: 3,
  },
];

const scores = [];

app.get('/api/questions', (req, res) => {
  const safe = questions.map(({ question, choices, answer }) => ({
    question,
    choices,
    correctIndex: answer,
  }));
  res.json(safe);
});

app.post('/api/submit', (req, res) => {
  const { pseudo, answers, points } = req.body;

  if (!pseudo || !answers || answers.length !== questions.length) {
    return res.status(400).json({ error: 'Données invalides.' });
  }

  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].answer) score++;
  }

  const safePoints = Number.isFinite(points) ? Math.max(0, Math.min(points, questions.length * 300)) : 0;
  scores.push({ pseudo, score, points: safePoints });
  scores.sort((a, b) => b.score - a.score || b.points - a.points);
  if (scores.length > 10) scores.length = 10;

  res.json({ score, total: questions.length });
});

app.get('/api/scores', (req, res) => {
  res.json(scores.slice(0, 10));
});

const PORT = 5000;
const server = http.createServer(app);
attach(server, questions);
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
