import { useState } from 'react';
import Avatar from '../components/Avatar';
import { play } from '../lib/sound';
import { MODES } from '../lib/scoring';
import { loadHistory } from '../lib/history';

// Mini courbe des dernières parties (score sur 10)
function Sparkline({ games }) {
  const pts = games.map((g, i) => {
    const x = games.length === 1 ? 50 : (i / (games.length - 1)) * 100;
    const y = 30 - (g.score / g.total) * 26;
    return [x, y];
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={line} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Points : un segment de longueur nulle à bouts ronds = un vrai cercle, sans déformation */}
      <path
        d={pts.map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`).join('')}
        className="spark-dots"
        strokeWidth="7"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const FEATURES = [
  ['⏱', '15 s par question'],
  ['⚡', 'Séries & multiplicateurs'],
  ['🎯', '2 jokers par partie'],
  ['⚔️', 'Duel 1 contre 1'],
];

function readStore(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function Home({ onStart, onDuel, mode, onModeChange }) {
  const [pseudo, setPseudo] = useState(() => readStore('quiz:pseudo'));
  const [error, setError] = useState('');
  const best = Number(readStore('quiz:best')) || 0;
  const [history] = useState(() => loadHistory().slice(-8));
  const avg = history.length
    ? (history.reduce((s, g) => s + g.score, 0) / history.length).toFixed(1)
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = pseudo.trim();
    if (trimmed.length < 2 || trimmed.length > 15) {
      setError('Le pseudo doit contenir entre 2 et 15 caractères.');
      return;
    }
    setError('');
    try {
      localStorage.setItem('quiz:pseudo', trimmed);
    } catch {
      /* ignore */
    }
    play('power');
    onStart(trimmed);
  };

  return (
    <div className="page home-page">
      <div className="home-badge">
        <span className="badge-dot" />
        10 questions · Temps réel
      </div>

      <h1 className="home-title" aria-label="Quiz">
        {'QUIZ'.split('').map((l, i) => (
          <span key={i} className="title-letter" style={{ animationDelay: `${0.1 + i * 0.09}s` }}>
            {l}
          </span>
        ))}
      </h1>
      <p className="home-subtitle">
        Réponds vite, enchaîne les bonnes réponses et grimpe dans le classement.
        <br />
        Un seul essai. Zéro pitié.
      </p>

      <form className="home-form glass" onSubmit={handleSubmit} noValidate>
        <label className="form-label" htmlFor="pseudo">
          Ton pseudo
        </label>
        <div className="input-row">
          <Avatar name={pseudo} size={44} />
          <input
            id="pseudo"
            className="form-input"
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ex : NeoCoder"
            maxLength={15}
            autoComplete="off"
            autoFocus
          />
        </div>
        <p className={error ? 'form-error' : 'form-hint'} role={error ? 'alert' : undefined}>
          {error || '2 à 15 caractères'}
        </p>

        <span className="form-label" id="mode-label">
          Mode de jeu
        </span>
        <div className="mode-picker" role="radiogroup" aria-labelledby="mode-label">
          {Object.values(MODES).map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode.id === m.id}
              className={`mode-chip ${mode.id === m.id ? 'active' : ''}`}
              onClick={() => {
                play('click');
                onModeChange(m.id);
              }}
            >
              <span className="mode-icon">{m.icon}</span>
              <b>{m.label}</b>
              <small>{m.hint}</small>
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary btn-shine">
          Démarrer le quiz
          <span className="btn-arrow">→</span>
        </button>
        <button type="button" className="btn btn-outline btn-duel" onClick={() => onDuel(pseudo.trim())}>
          ⚔️ Défier un ami en duel
        </button>
      </form>

      <ul className="feature-chips">
        {FEATURES.map(([icon, label], i) => (
          <li key={label} style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
            <span>{icon}</span> {label}
          </li>
        ))}
      </ul>

      {history.length > 0 && (
        <section className="history glass" aria-label="Tes dernières parties">
          <div className="history-head">
            <span>Tes {history.length} dernière{history.length > 1 ? 's' : ''} partie{history.length > 1 ? 's' : ''}</span>
            <span>
              Moyenne <b>{avg}/10</b>
              {best > 0 && <> · 🏅 {best} pts</>}
            </span>
          </div>
          <Sparkline games={history} />
        </section>
      )}
    </div>
  );
}

export default Home;
