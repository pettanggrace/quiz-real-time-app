const express = require('express');
const router = express.Router();
const { submitScore, getLeaderboard, getLeaderboardByPseudo } = require('../services/scoreService');

router.post('/', async (req, res) => {
  try {
    const { pseudo, answers, points, mode = 'solo' } = req.body;

    if (!pseudo || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Données invalides.' });
    }

    // Optionnel: extraire userId du token JWT si authentifié
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { verifyToken } = require('../services/authService');
        const decoded = verifyToken(authHeader.substring(7));
        userId = decoded.userId;
      } catch (err) {
        // Ignorer l'erreur de token, continuer sans auth
      }
    }

    const { getAllQuestions } = require('../services/questionService');
    const questions = await getAllQuestions();
    let score = 0;
    for (let i = 0; i < Math.min(answers.length, questions.length); i++) {
      if (answers[i] === questions[i].answer) score++;
    }

    const safePoints = Number.isFinite(points) ? Math.max(0, Math.min(points, questions.length * 300)) : 0;
    const result = await submitScore({
      pseudo,
      score,
      points: safePoints,
      mode,
      totalQuestions: questions.length,
      userId,
    });

    res.json({ score, total: questions.length });
  } catch (err) {
    console.error('Erreur POST /api/scores:', err);
    res.status(500).json({ error: 'Erreur lors de la soumission.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { pseudo, limit = 10 } = req.query;
    const leaderboard = pseudo
      ? await getLeaderboardByPseudo(pseudo, parseInt(limit))
      : await getLeaderboard(parseInt(limit));
    res.json(leaderboard);
  } catch (err) {
    console.error('Erreur GET /api/scores:', err);
    res.status(500).json({ error: 'Impossible de charger le classement.' });
  }
});

module.exports = router;
