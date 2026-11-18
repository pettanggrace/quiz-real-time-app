import { useState, useEffect } from 'react';
import { fetchScores } from '../services/api';
import Spinner from '../components/Spinner';
import Avatar from '../components/Avatar';

const MEDALS = ['🥇', '🥈', '🥉'];

function Leaderboard({ pseudo, onReplay }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchScores()
      .then(setScores)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="page error-page">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  const myIndex = scores.findIndex((s) => s.pseudo === pseudo);
  // Ordre visuel du podium : 2e, 1er, 3e
  const podium = [1, 0, 2].filter((i) => scores[i]);
  const rest = scores.slice(3);

  return (
    <div className="page leaderboard-page">
      <h2 className="leaderboard-title">Classement</h2>
      <p className="leaderboard-subtitle">Top 10, du meilleur score au plus bas.</p>

      {scores.length === 0 ? (
        <p className="empty-row glass">Personne n&apos;a encore joué. Sois le premier !</p>
      ) : (
        <>
          <div className="podium">
            {podium.map((i) => (
              <div key={i} className={`podium-col pos-${i + 1} ${i === myIndex ? 'me' : ''}`}>
                <span className="podium-medal">{MEDALS[i]}</span>
                <Avatar name={scores[i].pseudo} size={i === 0 ? 56 : 46} />
                <span className="podium-name">{scores[i].pseudo}</span>
                <span className="podium-score">
                  {scores[i].score}/10{scores[i].points > 0 && ` · ${scores[i].points} pts`}
                </span>
                <div className="podium-bar" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <ol className="rank-list glass" start={4}>
              {rest.map((s, k) => {
                const i = k + 3;
                return (
                  <li
                    key={i}
                    className={i === myIndex ? 'me' : ''}
                    style={{ animationDelay: `${0.5 + k * 0.06}s` }}
                  >
                    <span className="rank-num">{i + 1}</span>
                    <Avatar name={s.pseudo} size={32} />
                    <span className="rank-name">
                      {s.pseudo}
                      {i === myIndex && <em className="me-tag">Toi</em>}
                    </span>
                    <span className="rank-score">
                      {s.score}/10
                      {s.points > 0 && <small className="rank-pts">{s.points} pts</small>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      <button className="btn btn-primary btn-shine" onClick={onReplay}>
        Rejouer
      </button>
    </div>
  );
}

export default Leaderboard;
