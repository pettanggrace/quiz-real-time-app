import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchQuestions, submitAnswers } from '../services/api';
import Spinner from '../components/Spinner';
import Timer from '../components/Timer';
import Tilt from '../components/Tilt';
import Avatar from '../components/Avatar';
import { play, haptic } from '../lib/sound';
import { burstFrom } from '../lib/fx';

import { multiplierFor, pointsFor } from '../lib/scoring';
import { useCountUp } from '../lib/useCountUp';

const LETTERS = ['A', 'B', 'C', 'D'];

function Quiz({ pseudo, mode, onFinish }) {
  const TIME = mode.time;
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [locked, setLocked] = useState(null); // { chosen, correct }
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [hidden, setHidden] = useState([]);
  const [jokers, setJokers] = useState({ fifty: true, time: true });
  const [results, setResults] = useState([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pop, setPop] = useState(null);

  const deadline = useRef(0);
  const lockedRef = useRef(false);
  const advanceRef = useRef(null);
  const resultsRef = useRef([]);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const pointsRef = useRef(0);
  const lastTick = useRef(TIME);

  const shownPoints = useCountUp(points);

  useEffect(() => {
    fetchQuestions()
      .then((data) => setQuestions(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Humeur du fond : la teinte bascule vers l'orange quand la série est en feu
  useEffect(() => {
    document.documentElement.dataset.fire = streak >= 3 ? '1' : '0';
    return () => {
      document.documentElement.dataset.fire = '0';
    };
  }, [streak]);

  // Nouvelle question : on relance le chrono
  useEffect(() => {
    if (!questions.length) return;
    deadline.current = Date.now() + TIME * 1000;
    lastTick.current = TIME;
    lockedRef.current = false;
  }, [idx, questions.length, TIME]);

  const q = questions[idx];
  const canReveal = typeof q?.correctIndex === 'number';

  const finish = useCallback(async () => {
    setSubmitting(true);
    setError('');
    const answers = resultsRef.current.map((r) => r.chosen);
    try {
      const res = await submitAnswers(pseudo, answers, pointsRef.current);
      onFinish({
        ...res,
        stats: {
          points: pointsRef.current,
          bestStreak: bestStreakRef.current,
          results: resultsRef.current,
          hasPoints: resultsRef.current.some((r) => r.reveal),
        },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }, [pseudo, onFinish]);

  const next = useCallback(() => {
    clearTimeout(advanceRef.current);
    if (idx < questions.length - 1) {
      setLocked(null);
      setHidden([]);
      setTimeLeft(TIME);
      setIdx((i) => i + 1);
    } else finish();
  }, [idx, questions.length, finish, TIME]);

  const answer = useCallback(
    (choice, el) => {
      if (lockedRef.current || !q) return;
      lockedRef.current = true;

      const left = Math.max(0, (deadline.current - Date.now()) / 1000);
      const elapsed = TIME - left;
      const reveal = typeof q.correctIndex === 'number';
      const ok = reveal && choice === q.correctIndex;
      let pts = 0;

      if (ok) {
        pts = pointsFor(left, streakRef.current, mode);
        streakRef.current += 1;
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
        pointsRef.current += pts;
        setPoints(pointsRef.current);
        setPop({ id: Date.now(), pts });
        burstFrom(el, 'good');
        play('correct');
        haptic(20);
      } else if (reveal) {
        streakRef.current = 0;
        burstFrom(el, 'bad');
        play('wrong');
        haptic([40, 40, 40]);
      } else {
        play('click');
      }
      setStreak(streakRef.current);

      resultsRef.current = [
        ...resultsRef.current,
        { chosen: choice, ok, reveal, pts, time: Math.round(elapsed * 10) / 10 },
      ];
      setResults(resultsRef.current);
      setLocked({ chosen: choice, correct: q.correctIndex });

      advanceRef.current = setTimeout(next, reveal ? (ok ? 1300 : 1800) : 500);
    },
    [q, next, mode, TIME],
  );

  // Décompte
  useEffect(() => {
    if (!q) return undefined;
    const id = setInterval(() => {
      if (lockedRef.current) return;
      const left = Math.max(0, (deadline.current - Date.now()) / 1000);
      setTimeLeft(left);
      const sec = Math.ceil(left);
      if (sec <= 5 && sec > 0 && sec !== lastTick.current) {
        lastTick.current = sec;
        play('tick');
      }
      if (left <= 0) answer(-1);
    }, 100);
    return () => clearInterval(id);
  }, [q, answer]);

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
      const i = map[e.key.toLowerCase()];
      if (i !== undefined && q && i < q.choices.length && !hidden.includes(i)) {
        answer(i, document.querySelectorAll('.answer-button')[i]);
      } else if (e.key === 'Enter' && lockedRef.current && !submitting) {
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, hidden, answer, next, submitting]);

  const useFifty = () => {
    if (!jokers.fifty || locked || !canReveal) return;
    const wrong = q.choices.map((_, i) => i).filter((i) => i !== q.correctIndex);
    const toHide = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    setHidden(toHide);
    setJokers((j) => ({ ...j, fifty: false }));
    play('power');
  };
  const useTime = () => {
    if (!jokers.time || locked) return;
    deadline.current += 5000;
    setJokers((j) => ({ ...j, time: false }));
    play('power');
  };

  if (loading) return <Spinner />;

  if (error && !questions.length) {
    return (
      <div className="page error-page">
        <p className="error-message">{error}</p>
      </div>
    );
  }
  if (!q) return null;

  const mult = multiplierFor(streak);
  const total = questions.length;
  const last = results[idx];
  // Annonce vocale pour les lecteurs d'écran (le vert/rouge seul ne suffit pas)
  let announce = '';
  if (locked && last) {
    if (locked.chosen === -1) announce = 'Temps écoulé.';
    else if (!last.reveal) announce = 'Réponse enregistrée.';
    else if (last.ok) announce = `Bonne réponse, plus ${last.pts} points.`;
    else announce = `Mauvaise réponse. La bonne réponse était ${LETTERS[locked.correct]}.`;
  }

  return (
    <div className="page quiz-page">
      <p className="sr-only" role="status" aria-live="assertive">
        {announce}
      </p>
      <header className="hud">
        <div className="hud-player">
          <Avatar name={pseudo} size={38} />
          <div>
            <span className="hud-name">{pseudo}</span>
            <span className="hud-q">
              Question {idx + 1}/{total}
            </span>
          </div>
        </div>
        {canReveal && (
          <div className="hud-points" aria-live="polite">
            <span className="points-value">{shownPoints}</span>
            <span className="points-label">pts</span>
            {pop && (
              <span key={pop.id} className="points-pop">
                +{pop.pts}
              </span>
            )}
          </div>
        )}
        <Timer left={timeLeft} total={Math.max(TIME, timeLeft)} />
      </header>

      <div className="segments" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={idx + 1}>
        {questions.map((_, i) => {
          const r = results[i];
          const cls = r ? (!r.reveal ? 'done' : r.ok ? 'ok' : 'ko') : i === idx ? 'now' : '';
          return <span key={i} className={`segment ${cls}`} />;
        })}
      </div>

      <div className="combo-row">
        <span className={`combo ${streak >= 2 ? 'on' : ''} ${streak >= 3 ? 'fire' : ''}`}>
          {streak >= 3 ? '🔥' : '⚡'} Série ×{streak} · multiplicateur ×{String(mult).replace('.', ',')}
        </span>
        <div className="jokers">
          <button
            type="button"
            className="joker"
            onClick={useFifty}
            disabled={!jokers.fifty || !!locked || !canReveal}
            title="50/50 : retire deux mauvaises réponses"
          >
            50/50
          </button>
          <button
            type="button"
            className="joker"
            onClick={useTime}
            disabled={!jokers.time || !!locked}
            title="+5 secondes"
          >
            +5 s
          </button>
        </div>
      </div>

      <div key={idx} className="quiz-body">
        <Tilt className="question-card glass">
          <span className="question-index">{String(idx + 1).padStart(2, '0')}</span>
          <p className="question-text">{q.question}</p>
        </Tilt>

        <div className="answers-list">
          {q.choices.map((choice, i) => {
            let state = '';
            if (locked) {
              if (canReveal && i === locked.correct) state = 'answer-correct';
              else if (i === locked.chosen) state = canReveal ? 'answer-wrong' : 'answer-selected';
              else state = 'answer-dim';
            }
            return (
              <button
                key={i}
                type="button"
                className={`answer-button ${state} ${hidden.includes(i) ? 'answer-hidden' : ''}`}
                style={{ animationDelay: `${0.06 * i + 0.1}s` }}
                onClick={(e) => answer(i, e.currentTarget)}
                disabled={!!locked || hidden.includes(i)}
              >
                <span className="answer-letter">{LETTERS[i]}</span>
                <span className="answer-text">{choice}</span>
                {state === 'answer-correct' && <span className="answer-icon">✓</span>}
                {state === 'answer-wrong' && <span className="answer-icon answer-icon-wrong">✗</span>}
              </button>
            );
          })}
        </div>

        {locked && locked.chosen === -1 && <p className="timeout-note">⏰ Temps écoulé !</p>}
      </div>

      {error && (
        <div className="error-message">
          {error}{' '}
          <button type="button" className="link-btn" onClick={finish}>
            Réessayer
          </button>
        </div>
      )}
      {submitting && !error && <p className="keyboard-hint">Calcul du score…</p>}
      <p className="keyboard-hint">Clavier : 1-4 ou A-D pour répondre · Entrée pour passer</p>
    </div>
  );
}

export default Quiz;
