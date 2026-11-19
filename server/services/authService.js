const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'quiz-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

async function registerUser(pseudo, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (pseudo, password_hash)
     VALUES ($1, $2)
     RETURNING id, pseudo, created_at`,
    [pseudo, hashedPassword]
  );
  return result.rows[0];
}

async function loginUser(pseudo, password) {
  const result = await pool.query(
    `SELECT id, pseudo, password_hash FROM users WHERE pseudo = $1`,
    [pseudo]
  );
  const user = result.rows[0];
  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Mot de passe incorrect');
  }

  const token = jwt.sign({ userId: user.id, pseudo: user.pseudo }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { token, user: { id: user.id, pseudo: user.pseudo } };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Token invalide ou expiré');
  }
}

async function getUserById(userId) {
  const result = await pool.query(
    `SELECT id, pseudo, created_at FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
}

module.exports = { registerUser, loginUser, verifyToken, getUserById };
