import { useState, useEffect, useRef } from 'react';
import Confetti from '../components/Confetti';
import Avatar from '../components/Avatar';
import { play } from '../lib/sound';
import { saveGame } from '../lib/history';

function getRank(score, total) {
  const pct = score / total;
  if (pct === 1) return { emoji: '🏆', title: 'Légende', msg: 'Score parfait. Intouchable.', hue: 45 };
  if (pct >= 0.8) return { emoji: '🎉', title: 'Maître du quiz', msg: 'Excellent travail !', hue: 150 };
  if (pct >= 0.6) return { emoji: '👏', title: 'Challenger', msg: 'Bien joué, encore un effort !', hue: 255 };
  if (pct >= 0.4) return { emoji: '💪', title: 'Apprenti', msg: 'Tu peux mieux faire.', hue: 35 };
  return { emoji: '📚', title: 'Débutant', msg: 'Continue à apprendre !', hue: 350 };
}

function Result({ pseudo, score, total, stats, mode, onLeaderboard, onReplay }) {
  const rank = getRank(score, total);
  const results = stats?.results || [];
  const hasPoints = stats?.hasPoints;
  const points = stats?.points || 0;
  const answered = results.filter((r) => r.chosen !== -1);
  const avg = answered.length
    ? (answered.reduce((s, r) => s + r.time, 0) / answered.length).toFixed(1)
    : '—';
  const accuracy = Math.round((score / total) * 100);

  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  // Record battu ? Lu une seule fois, avant que l'effet ci-dessous ne mette à jour le meilleur score
  const [record] = useState(() => {
    try {
      const prev = Number(localStorage.getItem('quiz:best')) || 0;
      return hasPoints && prev > 0 && points > prev;
    } catch {
      return false;
    }
  });
  const saved = useRef(false);

  useEffect(() => {
    if (score / total >= 0.6) play('win');
    else play('click');
    if (!saved.current) {
      saved.current = true;
      saveGame({ pseudo, score, total, points: hasPoints ? points : 0, mode: mode?.id });
      if (hasPoints) {
        try {
          const prev = Number(localStorage.getItem('quiz:best')) || 0;
          if (points > prev) localStorage.setItem('quiz:best', String(points));
        } catch {
          /* ignore */
        }
      }
    }
    let cur = 0;
    const timer = setInterval(() => {
      cur += 1;
      setCount(cur);
      if (cur >= score) clearInterval(timer);
    }, 90);
    if (score === 0) clearInterval(timer);
    return () => clearInterval(timer);
  }, [score, total, points, hasPoints, pseudo, mode]);

  const share = async () => {
    const modeText = mode ? ` en mode ${mode.label}` : '';
    const text = `${pseudo} a fait ${score}/${total}${hasPoints ? ` (${points} pts)` : ''}${modeText} au Quiz — ${rank.title} ${rank.emoji}. Tu fais mieux ?`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* partage annulé */
    }
  };

  return (
    <div className="page result-page" style={{ '--rh': rank.hue }}>
      <Confetti active={score / total >= 0.6} />

      <span className="result-emoji">{rank.emoji}</span>
      <span className="rank-pill">{rank.title}</span>
      <h2 className="result-title">
        Bravo, <span className="grad-text">{pseudo}</span>
      </h2>
      <Avatar name={pseudo} size={52} />

      <div className="score-card">
        <span className="score-value">
          {count}
          <small>/{total}</small>
        </span>
        <p className="result-message">{rank.msg}</p>
        {record && <span className="record-badge">✨ Nouveau record !</span>}
      </div>

      <div className="recap" aria-label="Récapitulatif des réponses">
        {results.map((r, i) => (
          <span
            key={i}
            className={`recap-dot ${!r.reveal ? '' : r.ok ? 'ok' : 'ko'}`}
            style={{ animationDelay: `${0.4 + i * 0.07}s` }}
            title={`Q${i + 1} : ${r.chosen === -1 ? 'temps écoulé' : r.ok ? 'juste' : 'faux'}`}
          >
            {i + 1}
          </span>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat">
          <b>{accuracy}%</b>
          <span>Précision</span>
        </div>
        {hasPoints && (
          <div className="stat">
            <b>{points}</b>
            <span>Points</span>
          </div>
        )}
        <div className="stat">
          <b>{stats?.bestStreak ?? 0}</b>
          <span>Meilleure série</span>
        </div>
        <div className="stat">
          <b>{avg}{avg !== '—' && 's'}</b>
          <span>Temps moyen</span>
        </div>
      </div>

      <p className="result-hint">Score officiel vérifié par le serveur.</p>

      <button className="btn btn-primary btn-shine" onClick={onLeaderboard}>
        Voir le classement
      </button>
      <div className="btn-row">
        <button className="btn btn-outline" onClick={share}>
          {copied ? '✓ Copié !' : 'Partager'}
        </button>
        <button className="btn btn-outline" onClick={onReplay}>
          Rejouer
        </button>
      </div>
    </div>
  );
}

export default Result;
