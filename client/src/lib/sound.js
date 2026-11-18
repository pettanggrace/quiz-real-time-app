// Petit synthé WebAudio : aucun fichier audio à charger
let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem('quiz:muted') === '1';
} catch {
  /* stockage indisponible */
}

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  try {
    localStorage.setItem('quiz:muted', v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function tone(freq, start, dur, type = 'sine', vol = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

const SOUNDS = {
  click: () => tone(520, 0, 0.08, 'triangle'),
  correct: () => {
    tone(523, 0, 0.12);
    tone(659, 0.09, 0.12);
    tone(784, 0.18, 0.22);
  },
  wrong: () => {
    tone(220, 0, 0.18, 'sawtooth', 0.05);
    tone(165, 0.12, 0.28, 'sawtooth', 0.05);
  },
  tick: () => tone(880, 0, 0.05, 'square', 0.03),
  power: () => {
    tone(440, 0, 0.08, 'triangle');
    tone(880, 0.07, 0.16, 'triangle');
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle', 0.09)),
};

export function play(name) {
  if (muted) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name]?.();
  } catch {
    /* audio non supporté */
  }
}

export const haptic = (ms = 15) => {
  if (!muted) navigator.vibrate?.(ms);
};
