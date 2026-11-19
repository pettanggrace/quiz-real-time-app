// Mode duel 1 contre 1 en temps réel (WebSocket, chemin /ws).
// Hybride : persistance BDD via roomService.js + état WebSocket en mémoire pour la performance temps réel.
const { WebSocketServer } = require('ws');
const {
  createRoom,
  getRoomByCode,
  updateRoomState,
  addPlayerToRoom,
  updatePlayerScore,
  deleteRoom,
} = require('./services/roomService');

const TIME_MS = 15000;
const REVEAL_MS = 2800;
const COUNTDOWN_MS = 3000;
const TOTAL = 10;

// Cache en mémoire pour les connexions WebSocket (pour la performance temps réel)
const roomCache = new Map();

const send = (ws, msg) => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
};
const broadcast = (room, msg) => room.players.forEach((p) => send(p.ws, msg));
const clean = (s) => String(s || '').trim().slice(0, 15);

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do {
    c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
  } while (roomCache.has(c));
  return c;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function destroy(room) {
  clearTimeout(room.timer);
  roomCache.delete(room.code);
  await deleteRoom(room.code);
}

function nextQuestion(room) {
  room.idx += 1;
  if (room.idx >= room.qs.length) return endGame(room);
  const q = room.qs[room.idx];
  room.answers = [null, null];
  room.deadline = Date.now() + TIME_MS;
  broadcast(room, {
    t: 'question',
    index: room.idx,
    total: room.qs.length,
    question: q.question,
    choices: q.choices,
    ms: TIME_MS,
  });
  room.timer = setTimeout(() => reveal(room), TIME_MS + 300);
}

async function reveal(room) {
  clearTimeout(room.timer);
  if (room.state !== 'play') return;
  const q = room.qs[room.idx];
  const players = room.players.map((p, i) => {
    const a = room.answers[i];
    const ok = !!a && a.choice === q.answer;
    let pts = 0;
    if (ok) {
      const mult = 1 + Math.min(p.streak, 4) * 0.25;
      pts = Math.round((100 + Math.round((a.left / (TIME_MS / 1000)) * 50)) * mult);
      p.streak += 1;
    } else {
      p.streak = 0;
    }
    p.score += pts;
    return { choice: a ? a.choice : -1, ok, pts, score: p.score };
  });
  broadcast(room, { t: 'reveal', index: room.idx, correct: q.answer, players });

  // Synchroniser les scores avec la BDD
  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i].dbId) {
      await updatePlayerScore(room.players[i].dbId, room.players[i].score, room.players[i].streak);
    }
  }

  await updateRoomState(room.code, 'play', room.idx);
  room.timer = setTimeout(() => nextQuestion(room), REVEAL_MS);
}

function startRound(room) {
  room.state = 'play';
  room.idx = -1;
  room.rematch = [false, false];
  room.players.forEach((p) => {
    p.score = 0;
    p.streak = 0;
  });
  room.qs = shuffle(room.bank).slice(0, TOTAL);
  broadcast(room, { t: 'start', ms: COUNTDOWN_MS });
  room.timer = setTimeout(() => nextQuestion(room), COUNTDOWN_MS);
}

async function endGame(room) {
  room.state = 'end';
  const [a, b] = room.players;
  const winner = a.score === b.score ? -1 : a.score > b.score ? 0 : 1;
  broadcast(room, {
    t: 'end',
    winner,
    players: room.players.map((p) => ({ pseudo: p.pseudo, score: p.score })),
  });
  room.rematch = [false, false];
  await updateRoomState(room.code, 'end', room.idx);
  room.timer = setTimeout(() => destroy(room), 120000);
}

async function attach(server, bank) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let room = null;
    let me = -1;

    ws.on('message', async (raw) => {
      let m;
      try {
        m = JSON.parse(raw);
      } catch {
        return;
      }

      if (m.t === 'create' && !room) {
        const pseudo = clean(m.pseudo);
        if (pseudo.length < 2) return send(ws, { t: 'error', message: 'Pseudo invalide.' });

        const code = newCode();
        const dbRoom = await createRoom(code);
        const dbPlayer = await addPlayerToRoom(dbRoom.id, pseudo, true, null);

        room = {
          code,
          dbId: dbRoom.id,
          state: 'lobby',
          idx: -1,
          qs: [],
          answers: [null, null],
          bank,
          rematch: [false, false],
          deadline: 0,
          timer: null,
          players: [{ ws, pseudo, score: 0, streak: 0, dbId: dbPlayer.id }],
        };
        roomCache.set(code, room);
        me = 0;
        return send(ws, { t: 'created', you: 0, code: room.code });
      }

      if (m.t === 'join' && !room) {
        const pseudo = clean(m.pseudo);
        const code = String(m.code || '').toUpperCase().trim();
        if (pseudo.length < 2) return send(ws, { t: 'error', message: 'Pseudo invalide.' });

        const target = roomCache.get(code);
        const dbRoom = await getRoomByCode(code);

        if (!target || !dbRoom || target.state !== 'lobby' || target.players.length !== 1) {
          return send(ws, { t: 'error', message: 'Salle introuvable ou déjà complète.' });
        }

        room = target;
        me = 1;
        const dbPlayer = await addPlayerToRoom(dbRoom.id, pseudo, false, null);
        room.players.push({ ws, pseudo, score: 0, streak: 0, dbId: dbPlayer.id });

        const names = room.players.map((p) => p.pseudo);
        send(ws, { t: 'joined', you: 1, code: room.code, players: names });
        send(room.players[0].ws, { t: 'ready', players: names });
        startRound(room);
        return undefined;
      }

      if (m.t === 'answer' && room && room.state === 'play') {
        const choice = m.choice;
        if (m.index !== room.idx || room.answers[me] !== null) return undefined;
        if (!Number.isInteger(choice) || choice < 0 || choice > 3) return undefined;
        room.answers[me] = { choice, left: Math.max(0, room.deadline - Date.now()) / 1000 };
        send(room.players[1 - me].ws, { t: 'opp_answered', index: room.idx });
        if (room.answers.every(Boolean)) reveal(room);
      }

      if (m.t === 'rematch' && room && room.state === 'end') {
        room.rematch[me] = true;
        send(room.players[1 - me].ws, { t: 'rematch_wanted' });
        if (room.rematch.every(Boolean)) {
          clearTimeout(room.timer);
          startRound(room);
        }
      }

      return undefined;
    });

    ws.on('close', async () => {
      if (!room) return;
      const other = room.players[1 - me];
      send(other && other.ws, { t: room.state === 'end' ? 'opp_gone' : 'left' });
      await destroy(room);
    });
  });
}

module.exports = { attach };
