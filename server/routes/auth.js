const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyToken, getUserById } = require('../services/authService');

router.post('/register', async (req, res) => {
  try {
    const { pseudo, password } = req.body;
    if (!pseudo || !password || password.length < 4) {
      return res.status(400).json({ error: 'Pseudo et mot de passe requis (min 4 caractères).' });
    }
    const user = await registerUser(pseudo, password);
    res.status(201).json({ user: { id: user.id, pseudo: user.pseudo } });
  } catch (err) {
    console.error('Erreur POST /api/auth/register:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé.' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { pseudo, password } = req.body;
    if (!pseudo || !password) {
      return res.status(400).json({ error: 'Pseudo et mot de passe requis.' });
    }
    const result = await loginUser(pseudo, password);
    res.json(result);
  } catch (err) {
    console.error('Erreur POST /api/auth/login:', err);
    res.status(401).json({ error: err.message || 'Erreur lors de la connexion.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant.' });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    res.json({ user: { id: user.id, pseudo: user.pseudo } });
  } catch (err) {
    console.error('Erreur GET /api/auth/me:', err);
    res.status(401).json({ error: 'Token invalide.' });
  }
});

module.exports = router;
