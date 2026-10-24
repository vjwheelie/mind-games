// Dashboard: overall stats, a card per game with a chart that fits how that game is scored,
// and a table of recent games.

const Dashboard = (() => {
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // Guess games: how many guesses each win took.
  const guessGame = (mod, desc) => ({
    mod, desc,
    chartTitle: "Guess distribution",
    extra: (s) => ["Avg",s.wins.length ? (s.wins.reduce((a, g) => a + g.guesses, 0) / s.wins.length).toFixed(1) : "–"],
    rows: (s) => Array.from({ length: mod.maxGuesses }, (_, i) => {
      const n = s.wins.filter((g) => g.guesses === i + 1).length;
      return { key: String(i + 1), n, tip: `Won in ${i + 1} ${i ? "guesses" : "guess"}: ${plural(n, "game")}` };
    }),
    lostTip: (n) => `Lost (used all ${mod.maxGuesses} guesses): ${plural(n, "game")}`,
  });

  // Par games: how far over the minimum number of moves each win was.
  const parGame = (mod, desc, unit) => ({
    mod, desc,
    chartTitle: `${unit[0].toUpperCase() + unit.slice(1)}s over par`,
    extra: (s) => ["On par", s.wins.length ? Math.round((s.wins.filter((g) => g.moves <= g.par).length / s.wins.length) * 100) + "%" : "–"],
    rows: (s) => ["Par", "+1", "+2", "+3", "+4"].map((key, d) => {
      const n = s.wins.filter((g) => (d === 0 ? g.moves <= g.par : d === 4 ? g.moves - g.par >= 4 : g.moves - g.par === d)).length;
      const what = d === 0 ? "at or under par" : d === 4 ? `4+ ${unit}s over par` : `${plural(d, unit)} over par`;
      return { key: d === 4 ? "+4…" : key, n, tip: `Won ${what}: ${plural(n, "game")}` };
    }),
    lostTip: (n) => `Gave up: ${plural(n, "game")}`,
  });

  // Nonogram: puzzles solved at each size.
  const sizeGame = (mod, desc, sizes) => ({
    mod, desc,
    chartTitle: "Puzzles solved by size",
    extra: (s) => ["Biggest", s.wins.length ? `${Math.max(...s.wins.map((g) => g.size))}²` : "–"],
    rows: (s) => sizes.map((n) => {
      const w = s.wins.filter((g) => g.size === n);
      const best = w.length ? `, best ${formatTime(Math.min(...w.map((g) => g.ms)))}` : "";
      return { key: `${n}²`, n: w.length, tip: `${n}×${n}: ${plural(w.length, "solve")}${best}` };
    }),
    lostTip: (n) => `Gave up: ${plural(n, "puzzle")}`,
  });

  const GAMES = [
    guessGame(CodeBreaker, "Deduce a hidden 4-color code from white and hollow clue pegs."),
    guessGame(WordBreaker, "Find a hidden 5-letter word. Letters light up green or gold as you get close."),
    sizeGame(Nonogram, "Fill a grid from row and column number clues to reveal a picture.", [5, 10, 15]),
    parGame(LightsOut, "Every press flips a light and its neighbors. Get them all off in as few presses as possible.", "move"),
    parGame(WordLadder, "Climb from one word to another, changing a single letter each step.", "step"),
  ];
  // Each game's neon identity color and a small icon hinting at how it plays (drawn in that color).
  const LOOK = {
    "code-breaker": { color: "#ff5d73", icon: `<circle cx="4.5" cy="12" r="2.6" fill="currentColor"/><circle cx="11" cy="12" r="2.6" fill="currentColor"/>
      <circle cx="17.5" cy="12" r="2.6" fill="currentColor" opacity=".55"/><circle cx="21" cy="5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/>` },
    "word-breaker": { color: "#3ddc97", icon: `<rect x="1.5" y="7.5" width="6" height="9" rx="1.5" fill="currentColor"/>
      <rect x="9" y="7.5" width="6" height="9" rx="1.5" fill="currentColor" opacity=".55"/><rect x="16.5" y="7.5" width="6" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>` },
    "nonogram": { color: "#4cc9f0", icon: [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) =>
      `<rect x="${3 + c * 6.5}" y="${3 + r * 6.5}" width="5" height="5" rx="1" fill="currentColor" opacity="${[1, 0.25, 1, 1, 1, 0.25, 0.25, 1, 0.25][r * 3 + c]}"/>`)).join("") },
    "lights-out": { color: "#ffd23f", icon: `<rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <rect x="3" y="13" width="8" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor"/>` },
    "word-ladder": { color: "#b388ff", icon: `<path d="M6 2v20M18 2v20M6 6h12M6 12h12M6 18h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` },
  };
  const byId = Object.fromEntries(GAMES.map((g) => [g.mod.id, g.mod]));
  let confirmingReset = false;

  function formatTime(ms) {
    if (ms == null) return "–";
    const s = Math.round(ms / 1000);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m`;
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  }

  function formatWhen(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
    if (diff < 172800) return "yesterday";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function tile(label, value, note = "", noteClass = "") {
    return `<div class="tile-stat"><div class="label">${label}</div><div class="value">${value}</div>
            <div class="note ${noteClass}">${note}</div></div>`;
  }

  function chart(game, s) {
    if (!s.played) return `<div class="empty">No games yet. Your results will be charted here.</div>`;
    const rows = game.rows(s);
    const lost = s.played - s.wins.length;
    rows.push({ key: "✕", n: lost, lost: true, tip: game.lostTip(lost) });
    const max = Math.max(1, ...rows.map((r) => r.n));
    return `<div class="dist-title">${game.chartTitle}</div><div class="dist">` + rows.map((r) => {
      const pct = Math.round((r.n / s.played) * 100);
      return `<div class="dist-row${r.lost ? " lost" : ""}" tabindex="0" data-tip="${r.tip} (${pct}% of games)" aria-label="${r.tip}">
        <span class="k">${r.key}</span>
        <span class="track"><span class="bar" style="width: ${(r.n / max) * 100}%"></span></span>
        <span class="count">${r.n}</span></div>`;
    }).join("") + `</div>`;
  }

  function card(game) {
    const { mod, desc } = game;
    const s = Stats.summary(mod.id);
    const [extraLabel, extraValue] = game.extra(s);
    const stat = (v, l) => `<div><div class="v">${v}</div><div class="l">${l}</div></div>`;
    const look = LOOK[mod.id];
    return `<section class="card" style="--game:${look.color}">
      <div class="card-head">
        <div class="game-icon" style="color:${look.color}"><svg viewBox="0 0 24 24" aria-hidden="true">${look.icon}</svg></div>
        <a class="btn primary" href="#/${mod.id}">Play</a>
      </div>
      <div><h2>${mod.title}</h2><p class="card-desc">${desc}</p></div>
      <div class="mini-stats">
        ${stat(s.played, "Played")}${stat(s.played ? s.winRate + "%" : "–", "Win %")}
        ${stat(s.streak, "Streak")}${stat(s.bestStreak, "Best")}${stat(extraValue, extraLabel)}
      </div>
      <div>${chart(game, s)}</div>
      <div class="fastest">Fastest win: ${formatTime(s.fastest)}</div>
    </section>`;
  }

  function recentTable(all) {
    if (!all.length) return `<div class="table-wrap"><div class="empty" style="padding:16px">
      Nothing here yet. Finish a game and it'll appear in this list.</div></div>`;
    const rows = all.slice(-10).reverse().map((g) => {
      const mod = byId[g.game];
      return `<tr>
        <td>${mod?.title || g.game}</td>
        <td class="${g.won ? "result-won" : "result-lost"}">${g.won ? "✓ Won" : "✕ Lost"}</td>
        <td class="score">${mod?.describe ? mod.describe(g) : ""}</td>
        <td class="num-col">${formatTime(g.ms)}</td>
        <td class="when">${formatWhen(g.at)}</td></tr>`;
    }).join("");
    return `<div class="table-wrap"><table>
      <thead><tr><th>Game</th><th>Result</th><th>Score</th><th class="num-col">Time</th><th>When</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function mount(el) {
    const all = Stats.load();
    const wins = all.filter((g) => g.won).length;
    const bestStreak = Math.max(0, ...GAMES.map(({ mod }) => Stats.summary(mod.id).bestStreak));
    const totalMs = all.reduce((s, g) => s + (g.ms || 0), 0);

    el.innerHTML = `
      <div class="page wide">
        <header class="dash-head">
          <h1>Dashboard</h1>
          <p class="sub">Five bite-sized logic puzzles. No sign-up, no ads — just clues, deduction, and a dashboard that remembers every win.</p>
        </header>
        <div class="tiles">
          ${tile("Games played", all.length)}
          ${tile("Wins", wins, all.length ? `${Math.round((wins / all.length) * 100)}% win rate` : "", "good")}
          ${tile("Best streak", bestStreak, "wins in a row")}
          ${tile("Time thinking", formatTime(totalMs))}
        </div>
        <div class="cards">${GAMES.map(card).join("")}</div>
        <div class="section-head">
          <h2>Recent games</h2>
          ${all.length ? `<button class="btn${confirmingReset ? " danger" : ""}" data-id="reset">
             ${confirmingReset ? "Click again to erase all stats" : "Reset stats"}</button>` : ""}
          ${confirmingReset ? `<button class="btn" data-id="cancel">Cancel</button>` : ""}
        </div>
        ${recentTable(all)}
      </div>`;

    el.querySelector('[data-id="reset"]')?.addEventListener("click", () => {
      if (confirmingReset) Stats.clear();
      confirmingReset = !confirmingReset;
      mount(el);
    });
    el.querySelector('[data-id="cancel"]')?.addEventListener("click", () => { confirmingReset = false; mount(el); });

    attachTooltips(el);
  }

  function attachTooltips(el) {
    let tip = document.querySelector(".tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "tooltip";
      tip.hidden = true;
      document.body.append(tip);
    }
    const show = (row, x, y) => {
      tip.textContent = row.dataset.tip;
      tip.hidden = false;
      const w = tip.offsetWidth;
      tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 12)) + "px";
      tip.style.top = y - 36 + "px";
    };
    el.querySelectorAll(".dist-row").forEach((row) => {
      row.addEventListener("mousemove", (e) => show(row, e.clientX, e.clientY));
      row.addEventListener("focus", () => { const r = row.getBoundingClientRect(); show(row, r.left + 30, r.top); });
      row.addEventListener("mouseleave", () => (tip.hidden = true));
      row.addEventListener("blur", () => (tip.hidden = true));
    });
  }

  function unmount() {
    confirmingReset = false;
    const tip = document.querySelector(".tooltip");
    if (tip) tip.hidden = true;
  }

  return { id: "dashboard", games: GAMES.map((g) => g.mod), mount, unmount };
})();
