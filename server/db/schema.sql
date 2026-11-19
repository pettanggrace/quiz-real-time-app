-- Schéma de la base de données pour Quiz Real-Time App
-- Tables: users, questions, scores, rooms, players

-- Utilisateurs (authentification légère)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  pseudo TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_pseudo ON users(pseudo);

-- Questions du quiz
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  choices JSONB NOT NULL, -- ["choice1", "choice2", "choice3", "choice4"]
  answer INTEGER NOT NULL CHECK (answer >= 0 AND answer <= 3),
  category TEXT,
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour rechercher par catégorie/difficulté
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Scores / leaderboard
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pseudo TEXT NOT NULL,
  score INTEGER NOT NULL, -- nombre de bonnes réponses
  points INTEGER NOT NULL, -- points calculés (avec bonus temps + série)
  mode TEXT NOT NULL DEFAULT 'solo', -- solo, duel
  total_questions INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour leaderboard (top 10 par score)
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC, points DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);

-- Salles de duel
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- code à 4 caractères
  state TEXT NOT NULL DEFAULT 'lobby', -- lobby, play, end
  current_question_index INTEGER DEFAULT -1,
  total_questions INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_state ON rooms(state);

-- Joueurs dans les salles
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pseudo TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  is_creator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
