// Historique des parties, stocké dans le navigateur (aucune donnée envoyée au serveur)
const KEY = 'quiz:history';
const MAX = 30;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveGame(game) {
  try {
    const list = [...loadHistory(), { ...game, date: Date.now() }].slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible : l'historique est un bonus */
  }
}
