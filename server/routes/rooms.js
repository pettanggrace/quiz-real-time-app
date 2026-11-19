const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRoomByCode,
  updateRoomState,
  addPlayerToRoom,
  listOpenRooms,
  deleteRoom,
} = require('../services/roomService');

router.post('/', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || code.length !== 4) {
      return res.status(400).json({ error: 'Code invalide (doit être 4 caractères).' });
    }
    const room = await createRoom(code);
    res.status(201).json({ code: room.code, state: room.state });
  } catch (err) {
    console.error('Erreur POST /api/rooms:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce code est déjà utilisé.' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la salle.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const rooms = await listOpenRooms(parseInt(limit));
    res.json(rooms);
  } catch (err) {
    console.error('Erreur GET /api/rooms:', err);
    res.status(500).json({ error: 'Impossible de charger les salles.' });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const room = await getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ error: 'Salle introuvable.' });
    }
    res.json(room);
  } catch (err) {
    console.error('Erreur GET /api/rooms/:code:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la salle.' });
  }
});

router.delete('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    await deleteRoom(code);
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /api/rooms/:code:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de la salle.' });
  }
});

module.exports = router;
