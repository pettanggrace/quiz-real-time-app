const pool = require('../db');

async function submitScore({ pseudo, score, points, mode = 'solo', totalQuestions, userId = null }) {
  const result = await pool.query(
    `INSERT INTO scores (user_id, pseudo, score, points, mode, total_questions)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, pseudo, score, points, mode, totalQuestions]
  );
  return result.rows[0];
}

async function getLeaderboard(limit = 10) {
  const result = await pool.query(
    `SELECT pseudo, score, points, mode, created_at
     FROM scores
     ORDER BY score DESC, points DESC, created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getLeaderboardByPseudo(pseudo, limit = 10) {
  const result = await pool.query(
    `SELECT pseudo, score, points, mode, created_at
     FROM scores
     WHERE pseudo = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [pseudo, limit]
  );
  return result.rows;
}

module.exports = { submitScore, getLeaderboard, getLeaderboardByPseudo };
