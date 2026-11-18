const R = 22;
const C = 2 * Math.PI * R;

// Anneau de temps purement visuel (la logique du décompte est dans Quiz)
export default function Timer({ left, total }) {
  const ratio = Math.max(0, Math.min(1, left / total));
  const urgent = left <= 5;
  return (
    <div
      className={`timer ${urgent ? 'timer-urgent' : ''}`}
      role="timer"
      aria-label={`${Math.ceil(left)} secondes restantes`}
    >
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={R} className="timer-track" />
        <circle
          cx="28"
          cy="28"
          r={R}
          className="timer-arc"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <span className="timer-text">{Math.ceil(left)}</span>
    </div>
  );
}
