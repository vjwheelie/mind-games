// Word Ladder: turn the start word into the target word, changing one letter per step.
// Every step must be a real word. Par is the shortest ladder using everyday words.

const WordLadder = (() => {
  const LENGTH = 4;
  const LEVELS = { easy: [3, 3], medium: [4, 5], hard: [6, 8] };
  const COMMON = new Set(COMMON4);
  const VALID = new Set(COMMON4);
  for (let i = 0; i < EXTRA4.length; i += LENGTH) VALID.add(EXTRA4.slice(i, i + LENGTH));

  let level = "medium", startWord, target, chain, par, hints, over, startedAt, message, hintWord;
  let root;

  function neighbors(word, dict) {
    const out = [];
    for (let i = 0; i < LENGTH; i++) {
      for (let c = 97; c <= 122; c++) {
        const w = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
        if (w !== word && dict.has(w)) out.push(w);
      }
    }
    return out;
  }

  // Breadth-first search: returns { dist, prev } maps from `from`.
  function bfs(from, dict) {
    const dist = new Map([[from, 0]]), prev = new Map(), queue = [from];
    for (let k = 0; k < queue.length; k++) {
      const w = queue[k];
      for (const n of neighbors(w, dict)) {
        if (!dist.has(n)) { dist.set(n, dist.get(w) + 1); prev.set(n, w); queue.push(n); }
      }
    }
    return { dist, prev };
  }

  // Shortest ladder from `from` to `to`, preferring everyday words, falling back to the full dictionary.
  function shortestPath(from, to) {
    for (const dict of [COMMON, VALID]) {
      const d = new Set(dict).add(from);
      const { prev } = bfs(from, d);
      if (from === to || prev.has(to)) {
        const path = [to];
        while (path[0] !== from) path.unshift(prev.get(path[0]));
        return path;
      }
    }
    return null;
  }

  function newGame(lvl = level) {
    level = lvl;
    const [lo, hi] = LEVELS[level];
    for (;;) {
      startWord = COMMON4[Math.floor(Math.random() * COMMON4.length)];
      const { dist } = bfs(startWord, COMMON);
      const picks = [...dist].filter(([, d]) => d >= lo && d <= hi).map(([w]) => w);
      if (picks.length) {
        target = picks[Math.floor(Math.random() * picks.length)];
        par = dist.get(target);
        break;
      }
    }
    chain = [startWord];
    hints = 0; over = false; startedAt = null; message = ""; hintWord = null;
    if (root?.isConnected) build();
  }

  const last = () => chain[chain.length - 1];
  const diffCount = (a, b) => [...a].filter((ch, i) => ch !== b[i]).length;

  function addWord(raw) {
    if (over) return;
    const w = raw.trim().toLowerCase();
    let problem = null;
    if (!/^[a-z]{4}$/.test(w)) problem = "Words must be 4 letters";
    else if (diffCount(w, last()) !== 1) problem = `Change exactly one letter of ${last().toUpperCase()}`;
    else if (!VALID.has(w)) problem = `${w.toUpperCase()} isn't in the word list`;
    else if (chain.includes(w)) problem = `You've already used ${w.toUpperCase()}`;
    if (problem) { message = problem; render(); return false; }

    if (startedAt === null) startedAt = Date.now();
    chain.push(w);
    message = ""; hintWord = null;
    if (w === target) finish(true);
    else render();
    return true;
  }

  function undo() {
    if (over || chain.length < 2) return;
    chain.pop();
    message = ""; hintWord = null;
    render();
  }

  function hint() {
    if (over) return;
    const path = shortestPath(last(), target);
    hintWord = path?.[1] ?? null;
    hints++;
    message = hintWord ? `Hint: try ${hintWord.toUpperCase()}` : "No route from here. Try undoing a step.";
    render();
  }

  function finish(won) {
    over = true;
    const steps = chain.length - 1;
    const ms = Date.now() - (startedAt ?? Date.now());
    if (won) {
      const diff = steps - par;
      message = diff < 0 ? `🤯 ${steps} steps, under par (${par})! Nice vocabulary.`
              : diff === 0 ? `🏆 Perfect! ${steps} steps, exactly par.`
              : `🎉 Made it in ${steps} steps (par ${par}, +${diff}).`;
    } else {
      message = "One shortest ladder: " + shortestPath(startWord, target).map((x) => x.toUpperCase()).join(" → ");
    }
    Stats.record({ game: "word-ladder", won, ms, moves: steps, par, hints });
    render();
  }

  function mount(el) {
    root = el;
    if (!startWord) newGame();
    build();
  }

  const q = (id) => root.querySelector(`[data-id="${id}"]`);

  function build() {
    root.innerHTML = `
      <div class="page">
        <h1>Word Ladder</h1>
        <p class="sub">Change one letter at a time to climb from the top word to the bottom one.</p>
        <div class="toolbar">
          <div class="seg" data-id="levels">${Object.keys(LEVELS).map((l) =>
            `<button data-level="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}</div>
          <span class="clock" data-id="count"></span>
        </div>
        <div class="ladder" data-id="ladder"></div>
        <form class="ladder-form" data-id="form" autocomplete="off">
          <input type="text" data-id="input" maxlength="4" placeholder="Next word" spellcheck="false" autocapitalize="off">
          <button class="btn primary">Add</button>
        </form>
        <div class="ladder-target" data-id="target"></div>
        <p class="msg" data-id="msg"></p>
        <div class="actions">
          <button class="btn" data-id="undo">⌫ Undo step</button>
          <button class="btn" data-id="hint">💡 Hint</button>
          <button class="btn" data-id="giveup">Show answer</button>
          <button class="btn primary" data-id="newgame">New ladder</button>
        </div>
        <details>
          <summary>How to play</summary>
          <p>Type a word that changes <b>exactly one letter</b> of the last word. Keep going until you reach the target.
             Example: COLD → CORD → CARD → WARD → WARM.</p>
          <p><b>Par</b> is the shortest ladder using everyday words. Beat it with rarer words if you can.
             Letters already in the right place in the target turn green.</p>
        </details>
      </div>`;

    q("levels").onclick = (e) => { const l = e.target.dataset.level; if (l) newGame(l); };
    q("form").onsubmit = (e) => {
      e.preventDefault();
      if (addWord(q("input").value) !== false) q("input").value = "";
      q("input").focus();
    };
    q("undo").onclick = undo;
    q("hint").onclick = hint;
    q("giveup").onclick = () => { if (!over) finish(false); };
    q("newgame").onclick = () => newGame();
    render();
    q("input").focus();
  }

  function wordRow(word, prev, cls = "") {
    const letters = [...word].map((ch, i) => {
      const changed = prev && ch !== prev[i] ? " changed" : "";
      const match = ch === target[i] ? " match" : "";
      return `<span class="lt${changed}${match}">${ch}</span>`;
    }).join("");
    return `<div class="ladder-row ${cls}">${letters}</div>`;
  }

  function render() {
    if (!root?.isConnected) return;
    q("ladder").innerHTML = chain.map((w, i) => wordRow(w, chain[i - 1], i === 0 ? "first" : "")).join("");
    q("target").innerHTML = over && last() === target ? "" :
      `<div class="ladder-label">Target</div>` + `<div class="ladder-row goal">${[...target].map((c) => `<span class="lt">${c}</span>`).join("")}</div>`;
    root.querySelectorAll("[data-level]").forEach((b) => b.classList.toggle("on", b.dataset.level === level));
    q("count").textContent = `Steps ${chain.length - 1} · Par ${par}${hints ? ` · Hints ${hints}` : ""}`;
    q("msg").textContent = message;
    q("form").hidden = over;
    q("undo").disabled = over || chain.length < 2;
    q("hint").disabled = over;
    q("giveup").disabled = over;
  }

  return {
    id: "word-ladder", title: "Word Ladder", mount,
    describe: (r) => `${r.moves} steps (par ${r.par})`,
    _test: { shortestPath, isValid: (w) => VALID.has(w), newGame: (l) => { newGame(l); return { startWord, target, par }; } },
  };
})();
