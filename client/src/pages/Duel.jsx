import { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '../components/Avatar';
import Timer from '../components/Timer';
import Tilt from '../components/Tilt';
import Confetti from '../components/Confetti';
import { play, haptic } from '../lib/sound';
import { burstFrom } from '../lib/fx';
import { TIME } from '../lib/scoring';

const LETTERS = ['A', 'B', 'C', 'D'];

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

// Duel 1 contre 1 : le serveur arbitre (il envoie la bonne réponse seulement après la question)
function Duel({ initialPseudo = '', initialCode = '', onExit }) {
  const [stage, setStage] = useState('menu'); // menu | connecting | lobby | countdown | play | end
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [codeInput, setCodeInput] = useState(initialCode);
  const [error, setError] = useState('');
  const [me, setMe] = useState(0);
  const [code, setCode] = useState('');
  const [names, setNames] = useState(['', '']);
  const [count, setCount] = useState(3);
  const [q, setQ] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [myChoice, setMyChoice] = useState(null);
  const [oppAnswered, setOppAnswered] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [scores, setScores] = useState([0, 0]);
  const [pops, setPops] = useState([null, null]);
  const [final, setFinal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rematchAsked, setRematchAsked] = useState(false);
  const [oppRematch, setOppRematch] = useState(false);
  const [oppGone, setOppGone] = useState(false);

  const wsRef = useRef(null);
  const deadline = useRef(0);
  const meRef = useRef(0);
  const choiceRef = useRef(null);
  const qRef = useRef(null);

  const close = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  }, []);

  useEffect(() => close, [close]);

  const onMessage = useCallback((m) => {
    switch (m.t) {
      case 'created':
        meRef.current = m.you;
        setMe(m.you);
        setCode(m.code);
        setStage('lobby');
        break;
      case 'joined':
        meRef.current = m.you;
        setMe(m.you);
        setCode(m.code);
        setNames(m.players);
        break;
      case 'ready':
        setNames(m.players);
        break;
      case 'start':
        // Nouvelle manche (1re partie ou revanche) : on repart de zéro
        setScores([0, 0]);
        setPops([null, null]);
        setFinal(null);
        setQ(null);
        setReveal(null);
        setRematchAsked(false);
        setOppRematch(false);
        setStage('countdown');
        setCount(Math.round(m.ms / 1000));
        play('power');
        break;
      case 'question':
        deadline.current = Date.now() + m.ms;
        choiceRef.current = null;
        qRef.current = m;
        setQ(m);
        setMyChoice(null);
        setOppAnswered(false);
        setReveal(null);
        setTimeLeft(m.ms / 1000);
        setStage('play');
        break;
      case 'opp_answered':
        setOppAnswered(true);
        break;
      case 'reveal': {
        setReveal(m);
        setScores(m.players.map((p) => p.score));
        setPops(m.players.map((p) => (p.pts > 0 ? { id: Date.now() + Math.random(), pts: p.pts } : null)));
        const mine = m.players[meRef.current];
        if (mine.ok) {
          play('correct');
          haptic(20);
          burstFrom(document.querySelectorAll('.answer-button')[mine.choice], 'good');
        } else {
          play('wrong');
          haptic([40, 40, 40]);
        }
        break;
      }
      case 'end':
        setFinal(m);
        setStage('end');
        play(m.winner === meRef.current ? 'win' : 'click');
        break;
      case 'rematch_wanted':
        setOppRematch(true);
        break;
      case 'opp_gone':
        setOppGone(true);
        break;
      case 'left':
        setError('Ton adversaire a quitté le duel.');
        setStage('menu');
        close();
        break;
      case 'error':
        setError(m.message);
        setStage('menu');
        close();
        break;
      default:
    }
  }, [close]);

  const connect = (first) => {
    const name = pseudo.trim();
    if (name.length < 2 || name.length > 15) {
      setError('Le pseudo doit contenir entre 2 et 15 caractères.');
      return;
    }
    setError('');
    try {
      localStorage.setItem('quiz:pseudo', name);
    } catch {
      /* ignore */
    }
    close();
    setStage('connecting');
    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ ...first, pseudo: name }));
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        /* message illisible */
      }
    };
    ws.onclose = () => {
      if (wsRef.current === ws) {
        setError('Connexion perdue avec le serveur.');
        setStage('menu');
      }
    };
    ws.onerror = () => {
      setError('Impossible de joindre le serveur de duel.');
      setStage('menu');
    };
  };

  const create = () => connect({ t: 'create' });
  const join = () => {
    if (codeInput.trim().length !== 4) {
      setError('Le code contient 4 lettres.');
      return;
    }
    connect({ t: 'join', code: codeInput.trim().toUpperCase() });
  };

  // Compte à rebours de départ
  useEffect(() => {
    if (stage !== 'countdown') return undefined;
    const id = setInterval(() => setCount((c) => Math.max(1, c - 1)), 1000);
    return () => clearInterval(id);
  }, [stage]);

  // Chrono de la question en cours
  useEffect(() => {
    if (stage !== 'play' || reveal) return undefined;
    const id = setInterval(() => setTimeLeft(Math.max(0, (deadline.current - Date.now()) / 1000)), 100);
    return () => clearInterval(id);
  }, [stage, reveal, q]);

  const answer = useCallback((choice) => {
    const cur = qRef.current;
    if (!wsRef.current || choiceRef.current !== null || !cur) return;
    choiceRef.current = choice;
    setMyChoice(choice);
    play('click');
    wsRef.current.send(JSON.stringify({ t: 'answer', index: cur.index, choice }));
  }, []);

  useEffect(() => {
    if (stage !== 'play') return undefined;
    const onKey = (e) => {
      const i = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
      if (i !== undefined) answer(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, answer]);

  const link = `${window.location.origin}/?duel=${code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const opp = 1 - me;

  /* ---------- Menu ---------- */
  if (stage === 'menu' || stage === 'connecting') {
    return (
      <div className="page duel-page">
        <button type="button" className="back-link" onClick={onExit}>
          ← Retour
        </button>
        <h2 className="leaderboard-title">⚔️ Duel</h2>
        <p className="leaderboard-subtitle">Même questions, même chrono : le plus rapide et le plus juste gagne.</p>

        <div className="glass duel-card">
          <label className="form-label" htmlFor="duel-pseudo">
            Ton pseudo
          </label>
          <div className="input-row">
            <Avatar name={pseudo} size={44} />
            <input
              id="duel-pseudo"
              className="form-input"
              value={pseudo}
              maxLength={15}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ex : NeoCoder"
              autoComplete="off"
            />
          </div>

          <button type="button" className="btn btn-primary btn-shine" onClick={create} disabled={stage === 'connecting'}>
            {stage === 'connecting' ? 'Connexion…' : 'Créer un duel'}
          </button>

          <div className="or-sep">
            <span>ou rejoindre</span>
          </div>

          <div className="input-row">
            <input
              className="form-input code-input"
              value={codeInput}
              maxLength={4}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              placeholder="CODE"
              aria-label="Code du duel"
              autoComplete="off"
            />
            <button type="button" className="btn btn-outline join-btn" onClick={join} disabled={stage === 'connecting'}>
              Rejoindre
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Salle d'attente ---------- */
  if (stage === 'lobby') {
    return (
      <div className="page duel-page lobby">
        <h2 className="leaderboard-title">En attente d&apos;un adversaire…</h2>
        <p className="leaderboard-subtitle">Donne ce code à ton ami :</p>
        <div className="room-code" aria-label={`Code ${code.split('').join(' ')}`}>
          {code.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              {c}
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-outline" onClick={copy}>
          {copied ? '✓ Lien copié !' : 'Copier le lien d’invitation'}
        </button>
        <div className="waiting-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <button type="button" className="back-link" onClick={() => { close(); setStage('menu'); }}>
          Annuler
        </button>
      </div>
    );
  }

  /* ---------- Compte à rebours ---------- */
  if (stage === 'countdown') {
    return (
      <div className="page duel-page countdown">
        <div className="vs-row">
          <div className="vs-player">
            <Avatar name={names[me]} size={64} />
            <b>{names[me]}</b>
          </div>
          <span className="vs-badge">VS</span>
          <div className="vs-player">
            <Avatar name={names[opp]} size={64} />
            <b>{names[opp]}</b>
          </div>
        </div>
        <div key={count} className="count-number" aria-live="assertive">
          {count}
        </div>
      </div>
    );
  }

  /* ---------- Fin ---------- */
  if (stage === 'end' && final) {
    const won = final.winner === me;
    const tie = final.winner === -1;
    return (
      <div className="page result-page duel-end">
        <Confetti active={won} />
        <span className="result-emoji">{tie ? '🤝' : won ? '🏆' : '💪'}</span>
        <span className="rank-pill" style={{ '--rh': tie ? 255 : won ? 45 : 350 }}>
          {tie ? 'Égalité' : won ? 'Victoire' : 'Défaite'}
        </span>
        <h2 className="result-title">
          {tie ? 'Match nul !' : won ? 'Tu as dominé !' : `${final.players[opp].pseudo} l'emporte`}
        </h2>
        <div className="final-board">
          {[me, opp].map((i) => (
            <div key={i} className={`final-col ${final.winner === i ? 'win' : ''}`}>
              <Avatar name={final.players[i].pseudo} size={56} />
              <b>{i === me ? 'Toi' : final.players[i].pseudo}</b>
              <span className="final-score">{final.players[i].score}</span>
              <small>points</small>
            </div>
          ))}
        </div>
        {oppRematch && !rematchAsked && !oppGone && (
          <p className="rematch-note" role="status">
            ⚔️ {final.players[opp].pseudo} veut sa revanche !
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-shine"
          disabled={rematchAsked || oppGone}
          onClick={() => {
            setRematchAsked(true);
            play('power');
            wsRef.current?.send(JSON.stringify({ t: 'rematch' }));
          }}
        >
          {oppGone
            ? 'Adversaire parti'
            : rematchAsked
              ? `En attente de ${final.players[opp].pseudo}…`
              : '⚔️ Revanche'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            close();
            setOppGone(false);
            setStage('menu');
            setCodeInput('');
          }}
        >
          Nouveau duel
        </button>
        <button type="button" className="btn btn-outline" onClick={onExit}>
          Accueil
        </button>
      </div>
    );
  }

  /* ---------- Partie ---------- */
  if (!q) return null;
  const myRes = reveal?.players[me];
  let announce = '';
  if (reveal) announce = myRes.ok ? `Bonne réponse, plus ${myRes.pts} points.` : `Mauvaise réponse. La bonne était ${LETTERS[reveal.correct]}.`;

  return (
    <div className="page quiz-page duel-play">
      <p className="sr-only" role="status" aria-live="assertive">
        {announce}
      </p>
      <header className="duel-hud">
        {[me, opp].map((i, k) => (
          <div key={i} className={`duel-player ${k === 1 ? 'right' : ''}`}>
            <Avatar name={names[i]} size={40} />
            <div>
              <span className="hud-name">{k === 0 ? 'Toi' : names[i]}</span>
              <span className="duel-score">
                {scores[i]}
                {pops[i] && (
                  <em key={pops[i].id} className="points-pop">
                    +{pops[i].pts}
                  </em>
                )}
              </span>
            </div>
          </div>
        ))}
        <div className="duel-timer">
          <Timer left={timeLeft} total={TIME} />
        </div>
      </header>

      <div className="segments" aria-hidden="true">
        {Array.from({ length: q.total }, (_, i) => (
          <span key={i} className={`segment ${i < q.index ? 'done' : i === q.index ? 'now' : ''}`} />
        ))}
      </div>
      <p className="combo-row duel-status">
        Question {q.index + 1}/{q.total} ·{' '}
        {reveal ? 'Résultat' : myChoice !== null ? 'Réponse envoyée, en attente…' : 'Vite, réponds !'}
        {oppAnswered && !reveal && <span className="opp-ready"> · {names[opp]} a répondu ⚡</span>}
      </p>

      <div key={q.index} className="quiz-body">
        <Tilt className="question-card glass">
          <span className="question-index">{String(q.index + 1).padStart(2, '0')}</span>
          <p className="question-text">{q.question}</p>
        </Tilt>

        <div className="answers-list">
          {q.choices.map((choice, i) => {
            let state = '';
            if (reveal) {
              if (i === reveal.correct) state = 'answer-correct';
              else if (i === myRes.choice) state = 'answer-wrong';
              else state = 'answer-dim';
            } else if (myChoice === i) state = 'answer-selected';
            return (
              <button
                key={i}
                type="button"
                className={`answer-button ${state}`}
                style={{ animationDelay: `${0.06 * i + 0.1}s` }}
                onClick={() => answer(i)}
                disabled={myChoice !== null || !!reveal}
              >
                <span className="answer-letter">{LETTERS[i]}</span>
                <span className="answer-text">{choice}</span>
                {reveal && (
                  <span className="picks">
                    {reveal.players.map((p, pi) =>
                      p.choice === i ? <Avatar key={pi} name={names[pi]} size={24} /> : null,
                    )}
                  </span>
                )}
                {state === 'answer-correct' && <span className="answer-icon">✓</span>}
                {state === 'answer-wrong' && <span className="answer-icon answer-icon-wrong">✗</span>}
              </button>
            );
          })}
        </div>
        {reveal && myRes.choice === -1 && <p className="timeout-note">⏰ Temps écoulé !</p>}
      </div>
    </div>
  );
}

export default Duel;
