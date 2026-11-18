import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Leaderboard from './pages/Leaderboard';
import Duel from './pages/Duel';
import Aurora from './components/Aurora';
import Particles from './components/Particles';
import { isMuted, setMuted, play } from './lib/sound';
import { MODES, DEFAULT_MODE } from './lib/scoring';
import './App.css';

function App() {
  // Un lien d'invitation /?duel=ABCD ouvre directement le duel
  const inviteCode = new URLSearchParams(window.location.search).get('duel') || '';
  const [screen, setScreen] = useState(inviteCode ? 'duel' : 'home');
  const [pseudo, setPseudo] = useState(() => {
    try {
      return localStorage.getItem('quiz:pseudo') || '';
    } catch {
      return '';
    }
  });
  const [result, setResult] = useState(null);
  const [muted, setMutedState] = useState(isMuted());
  const [run, setRun] = useState(0); // force un Quiz tout neuf à chaque partie
  const [modeId, setModeId] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz:mode');
      return MODES[saved] ? saved : DEFAULT_MODE;
    } catch {
      return DEFAULT_MODE;
    }
  });
  const mode = MODES[modeId];
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz:theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f5fb' : '#07070f');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('quiz:theme', next);
    } catch {
      /* ignore */
    }
    play('click');
  };

  const changeMode = (id) => {
    setModeId(id);
    try {
      localStorage.setItem('quiz:mode', id);
    } catch {
      /* ignore */
    }
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) play('click');
  };

  const handleStart = (name) => {
    setPseudo(name);
    setRun((r) => r + 1);
    setScreen('quiz');
  };

  const handleReplay = () => {
    setResult(null);
    setScreen('home');
  };

  return (
    <>
      <Aurora />
      <Particles />
      <button
        type="button"
        className="sound-toggle"
        onClick={toggleSound}
        aria-label={muted ? 'Activer le son' : 'Couper le son'}
        title={muted ? 'Activer le son' : 'Couper le son'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <button
        type="button"
        className="sound-toggle theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'light' ? 'Passer en thème sombre' : 'Passer en thème clair'}
        title={theme === 'light' ? 'Thème sombre' : 'Thème clair'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <main className="app">
        {screen === 'home' && (
          <Home
            onStart={handleStart}
            mode={mode}
            onModeChange={changeMode}
            onDuel={(name) => {
              if (name) setPseudo(name);
              setScreen('duel');
            }}
          />
        )}
        {screen === 'duel' && (
          <Duel
            initialPseudo={pseudo}
            initialCode={inviteCode.toUpperCase().slice(0, 4)}
            onExit={() => {
              window.history.replaceState(null, '', window.location.pathname);
              setScreen('home');
            }}
          />
        )}
        {screen === 'quiz' && (
          <Quiz
            key={run}
            pseudo={pseudo}
            mode={mode}
            onFinish={(data) => {
              setResult(data);
              setScreen('result');
            }}
          />
        )}
        {screen === 'result' && result && (
          <Result
            pseudo={pseudo}
            score={result.score}
            total={result.total}
            stats={result.stats}
            mode={mode}
            onLeaderboard={() => setScreen('leaderboard')}
            onReplay={handleReplay}
          />
        )}
        {screen === 'leaderboard' && <Leaderboard pseudo={pseudo} onReplay={handleReplay} />}
      </main>
    </>
  );
}

export default App;
