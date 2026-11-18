// Règles de points (affichage côté client ; le score officiel est calculé par le serveur)
export const TIME = 15; // durée du mode classique, aussi utilisée par le duel
export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 50;

// Modes de jeu : ils changent le chrono et la valeur des points, pas le score officiel
export const MODES = {
  zen: { id: 'zen', label: 'Zen', icon: '🧘', time: 25, mult: 0.8, hint: '25 s · points ×0,8' },
  classic: { id: 'classic', label: 'Classique', icon: '🎯', time: TIME, mult: 1, hint: '15 s · points ×1' },
  blitz: { id: 'blitz', label: 'Éclair', icon: '⚡', time: 8, mult: 1.5, hint: '8 s · points ×1,5' },
};
export const DEFAULT_MODE = 'classic';

// ×1 sans série, +0,25 par bonne réponse d'affilée, plafonné à ×2
export const multiplierFor = (streak) => 1 + Math.min(Math.max(streak, 0), 4) * 0.25;

// `left` = secondes restantes au moment de la réponse
export function pointsFor(left, streak, mode = MODES.classic) {
  const ratio = Math.min(1, Math.max(0, left / mode.time));
  const raw = BASE_POINTS + Math.round(ratio * MAX_SPEED_BONUS);
  return Math.round(raw * multiplierFor(streak) * mode.mult);
}
