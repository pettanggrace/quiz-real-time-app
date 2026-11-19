const express = require('express');
const cors = require('cors');
const http = require('http');
const { attach } = require('./duel');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const questionsRouter = require('./routes/questions');
const scoresRouter = require('./routes/scores');
const roomsRouter = require('./routes/rooms');
const authRouter = require('./routes/auth');

app.use('/api/questions', questionsRouter);
app.use('/api/scores', scoresRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Charger les questions depuis la BDD pour le mode duel (avec random=true)
const { getAllQuestions } = require('./services/questionService');

let duelQuestions = [];
getAllQuestions({ random: true }).then(questions => {
  duelQuestions = questions;
  attach(server, duelQuestions);
  console.log(`${duelQuestions.length} questions chargées pour le mode duel`);
}).catch(err => {
  console.error('Erreur lors du chargement des questions pour le duel:', err);
  // Fallback : questions en dur si la DB n'est pas encore initialisée
  const fallbackQuestions = [
    { question: 'Que signifie HTML ?', choices: ['HyperText Markup Language', 'High Tech Modern Language', 'Hyperlink and Text Markup Logic', 'Home Tool Markup Language'], answer: 0 },
    { question: 'Quel langage s\'exécute côté serveur avec Node.js ?', choices: ['Java', 'JavaScript', 'C#', 'Swift'], answer: 1 },
    { question: 'Quelle bibliothèque sert à créer des interfaces utilisateur ?', choices: ['Express', 'Jira', 'React', 'MongoDB'], answer: 2 },
    { question: 'Que signifie API ?', choices: ['Application Programming Interface', 'Advanced Program Installation', 'Applied Process Integration', 'Automatic Page Index'], answer: 0 },
    { question: 'Quelle méthode HTTP sert à envoyer des données au serveur ?', choices: ['GET', 'POST', 'VIEW', 'FETCHALL'], answer: 1 },
    { question: 'Dans Scrum, qui est responsable du Product Backlog ?', choices: ['Le Scrum Master', 'Le développeur', 'Le Product Owner', 'Le testeur'], answer: 2 },
    { question: 'Quelle est la durée d\'un sprint dans ce projet ?', choices: ['2 jours', '2 mois', '2 semaines', '2 heures'], answer: 0 },
    { question: 'Quel outil Jira montre l\'avancement du travail restant dans le temps ?', choices: ['Le Burndown Chart', 'Le Pull Request', 'Le Wireframe', 'Le Smart Commit'], answer: 0 },
    { question: 'Que signifie CSS ?', choices: ['Computer Style Sheets', 'Creative Server Script', 'Cascading Style Sheets', 'Coded Screen Syntax'], answer: 2 },
    { question: 'Quel type de ticket Jira décrit une anomalie à corriger ?', choices: ['Epic', 'Story', 'Task', 'Bug'], answer: 3 },
  ];
  attach(server, fallbackQuestions);
  console.log('Questions fallback utilisées pour le mode duel');
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
