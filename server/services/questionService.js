const pool = require('../db');

async function queryWithRetry(queryText, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(queryText, params);
      return result;
    } catch (err) {
      if (attempt === maxRetries || err.code !== 'ECONNRESET') {
        throw err;
      }
      console.warn(`Retry ${attempt}/${maxRetries} pour la requête à la base de données`);
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
}

async function getAllQuestions(filters = {}) {
  const { category, difficulty, random = false } = filters;
  let query = 'SELECT id, question, choices, answer, category, difficulty FROM questions';
  const params = [];
  const conditions = [];

  if (category) {
    conditions.push('category = $' + (params.length + 1));
    params.push(category);
  }
  if (difficulty) {
    conditions.push('difficulty = $' + (params.length + 1));
    params.push(difficulty);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Ordre aléatoire uniquement pour le mode duel
  query += random ? ' ORDER BY RANDOM()' : ' ORDER BY id';

  const result = await queryWithRetry(query, params);
  return result.rows;
}

async function createQuestion({ question, choices, answer, category, difficulty }) {
  const result = await pool.query(
    `INSERT INTO questions (question, choices, answer, category, difficulty)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [question, JSON.stringify(choices), answer, category, difficulty]
  );
  return result.rows[0];
}

async function seedQuestions() {
  const questions = [
    {
      question: 'Que signifie HTML ?',
      choices: ['HyperText Markup Language', 'High Tech Modern Language', 'Hyperlink and Text Markup Logic', 'Home Tool Markup Language'],
      answer: 0,
      category: 'web',
      difficulty: 'easy',
    },
    {
      question: 'Quel langage s\'exécute côté serveur avec Node.js ?',
      choices: ['Java', 'JavaScript', 'C#', 'Swift'],
      answer: 1,
      category: 'backend',
      difficulty: 'easy',
    },
    {
      question: 'Quelle bibliothèque sert à créer des interfaces utilisateur ?',
      choices: ['Express', 'Jira', 'React', 'MongoDB'],
      answer: 2,
      category: 'frontend',
      difficulty: 'easy',
    },
    {
      question: 'Que signifie API ?',
      choices: ['Application Programming Interface', 'Advanced Program Installation', 'Applied Process Integration', 'Automatic Page Index'],
      answer: 0,
      category: 'backend',
      difficulty: 'easy',
    },
    {
      question: 'Quelle méthode HTTP sert à envoyer des données au serveur ?',
      choices: ['GET', 'POST', 'VIEW', 'FETCHALL'],
      answer: 1,
      category: 'backend',
      difficulty: 'easy',
    },
    {
      question: 'Dans Scrum, qui est responsable du Product Backlog ?',
      choices: ['Le Scrum Master', 'Le développeur', 'Le Product Owner', 'Le testeur'],
      answer: 2,
      category: 'agile',
      difficulty: 'medium',
    },
    {
      question: 'Quelle est la durée d\'un sprint dans ce projet ?',
      choices: ['2 jours', '2 mois', '2 semaines', '2 heures'],
      answer: 0,
      category: 'agile',
      difficulty: 'medium',
    },
    {
      question: 'Quel outil Jira montre l\'avancement du travail restant dans le temps ?',
      choices: ['Le Burndown Chart', 'Le Pull Request', 'Le Wireframe', 'Le Smart Commit'],
      answer: 0,
      category: 'agile',
      difficulty: 'medium',
    },
    {
      question: 'Que signifie CSS ?',
      choices: ['Computer Style Sheets', 'Creative Server Script', 'Cascading Style Sheets', 'Coded Screen Syntax'],
      answer: 2,
      category: 'frontend',
      difficulty: 'easy',
    },
    {
      question: 'Quel type de ticket Jira décrit une anomalie à corriger ?',
      choices: ['Epic', 'Story', 'Task', 'Bug'],
      answer: 3,
      category: 'agile',
      difficulty: 'easy',
    },
  ];

  for (const q of questions) {
    await createQuestion(q);
  }
  console.log(`${questions.length} questions insérées dans la base de données`);
}

module.exports = { getAllQuestions, createQuestion, seedQuestions };
