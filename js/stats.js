// Saves finished games in the browser's localStorage so the dashboard can show stats.
// Every finished game is one record: { game, won, ms, at, ...game-specific fields }.
// Guess games add `guesses`; par games add `moves` and `par`; Nonogram adds `size`.

const Stats = (() => {
  const KEY = "mindGames.v1";

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data?.games) ? data.games : [];
    } catch {
      return [];
    }
  }

  function save(games) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ games }));
    } catch {
      // Storage can be unavailable (e.g. private browsing). The games still work; stats just won't persist.
    }
  }

  function record(entry) {
    const games = load();
    games.push({ ...entry, at: new Date().toISOString() });
    save(games);
  }

  function clear() {
    save([]);
  }

  // Numbers every game shares. Game-specific numbers are worked out by the dashboard from `records`.
  function summary(game) {
    const records = load().filter((g) => g.game === game);
    const wins = records.filter((g) => g.won);

    let best = 0, run = 0;
    for (const g of records) {
      run = g.won ? run + 1 : 0;
      best = Math.max(best, run);
    }

    return {
      records,
      wins,
      played: records.length,
      winRate: records.length ? Math.round((wins.length / records.length) * 100) : 0,
      streak: run,
      bestStreak: best,
      fastest: wins.length ? Math.min(...wins.map((g) => g.ms)) : null,
    };
  }

  return { load, record, clear, summary };
})();
