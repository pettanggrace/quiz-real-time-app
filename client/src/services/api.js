const API_BASE = '/api';

export async function fetchQuestions() {
  const res = await fetch(`${API_BASE}/questions`);
  if (!res.ok) throw new Error('Impossible de charger les questions.');
  return res.json();
}

// `points` est optionnel : le serveur peut l'ignorer (le score officiel reste `score`)
export async function submitAnswers(pseudo, answers, points) {
  const res = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, answers, points }),
  });
  if (!res.ok) throw new Error('Erreur lors de la soumission.');
  return res.json();
}

export async function fetchScores() {
  const res = await fetch(`${API_BASE}/scores`);
  if (!res.ok) throw new Error('Impossible de charger le classement.');
  return res.json();
}
