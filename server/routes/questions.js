const express = require('express');
const router = express.Router();
const { getAllQuestions } = require('../services/questionService');

router.get('/', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const questions = await getAllQuestions({ category, difficulty });
    const safe = questions.map(({ id, question, choices, answer, category, difficulty }) => ({
      id,
      question,
      choices,
      correctIndex: answer,
      category,
      difficulty,
    }));
    res.json(safe);
  } catch (err) {
    console.error('Erreur GET /api/questions:', err);
    res.status(500).json({ error: 'Impossible de charger les questions.' });
  }
});

module.exports = router;
