const pool = require('../db');

async function createRoom(code) {
  const result = await pool.query(
    `INSERT INTO rooms (code, state)
     VALUES ($1, 'lobby')
     RETURNING *`,
    [code]
  );
  return result.rows[0];
}

async function getRoomByCode(code) {
  const result = await pool.query(
    `SELECT r.id, r.code, r.state, r.current_question_index, r.total_questions, r.created_at, r.updated_at,
            json_agg(json_build_object('id', p.id, 'pseudo', p.pseudo, 'score', p.score, 'streak', p.streak, 'is_creator', p.is_creator)) as players
     FROM rooms r
     LEFT JOIN players p ON r.id = p.room_id
     WHERE r.code = $1
     GROUP BY r.id`,
    [code]
  );
  return result.rows[0];
}

async function updateRoomState(code, state, currentIndex = null) {
  const updates = ['state = $2', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [code, state];
  let paramIndex = 3;

  if (currentIndex !== null) {
    updates.push(`current_question_index = $${paramIndex}`);
    params.push(currentIndex);
    paramIndex++;
  }

  const result = await pool.query(
    `UPDATE rooms SET ${updates.join(', ')} WHERE code = $1 RETURNING *`,
    params
  );
  return result.rows[0];
}

async function addPlayerToRoom(roomId, pseudo, isCreator = false, userId = null) {
  const result = await pool.query(
    `INSERT INTO players (room_id, user_id, pseudo, is_creator)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [roomId, userId, pseudo, isCreator]
  );
  return result.rows[0];
}

async function updatePlayerScore(playerId, score, streak) {
  const result = await pool.query(
    `UPDATE players SET score = $2, streak = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [playerId, score, streak]
  );
  return result.rows[0];
}

async function deleteRoom(code) {
  await pool.query('DELETE FROM rooms WHERE code = $1', [code]);
}

async function listOpenRooms(limit = 20) {
  const result = await pool.query(
    `SELECT r.code, r.state, r.created_at,
            array_agg(p.pseudo) as players
     FROM rooms r
     LEFT JOIN players p ON r.id = p.room_id
     WHERE r.state = 'lobby'
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = {
  createRoom,
  getRoomByCode,
  updateRoomState,
  addPlayerToRoom,
  updatePlayerScore,
  deleteRoom,
  listOpenRooms,
};
