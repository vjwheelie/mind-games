// Nonogram: fill cells so every row and column matches its number clues
// (each number is a run of filled cells, in order, with gaps between runs).
// Puzzles are generated at random, and only kept if pure line-by-line logic can solve them,
// so there is always exactly one answer and you never need to guess.

const Nonogram = (() => {
  const SIZES = [5, 10, 15];
  const EMPTY = 0, FILLED = 1, CROSSED = 2;

  let size = 10, solution, rowClues, colClues, cells, over, startedAt, message, mode = FILLED, revealed;
  let root, timer, painting = null;

  // ---------- generation ----------

  function runs(line) {
    const out = [];
    let n = 0;
    for (const v of line) {
      if (v === FILLED) n++;
      else if (n) { out.push(n); n = 0; }
    }
    if (n) out.push(n);
    return out;
  }

  const row = (grid, n, r) => grid.slice(r * n, r * n + n);
  const col = (grid, n, c) => Array.from({ length: n }, (_, r) => grid[r * n + c]);

  // Given a line's clue and what's already known (-1 unknown, 0 empty, 1 filled),
  // try every placement of the runs that fits, and return the cells that are the same in all of them.
  function solveLine(clue, known) {
    const n = known.length;
    const canFill = Array(n).fill(false), canEmpty = Array(n).fill(false);
    const line = Array(n).fill(0);
    let any = false;

    function place(k, start) {
      if (k === clue.length) {
        for (let i = start; i < n; i++) if (known[i] === 1) return;
        any = true;
        for (let i = 0; i < n; i++) ((i < start && line[i]) ? canFill : canEmpty)[i] = true;
        return;
      }
      const len = clue[k];
      const rest = clue.slice(k + 1).reduce((s, x) => s + x + 1, 0);
      for (let p = start; p + len + rest <= n; p++) {
        if (p > start && known[p - 1] === 1) break;               // can't skip past a known filled cell
        let ok = true;
        for (let i = p; i < p + len; i++) if (known[i] === 0) { ok = false; break; }
        if (!ok || known[p + len] === 1) continue;
        for (let i = start; i < p; i++) line[i] = 0;
        for (let i = p; i < p + len; i++) line[i] = 1;
        if (p + len < n) line[p + len] = 0;
        place(k + 1, Math.min(n, p + len + 1));
      }
      for (let i = start; i < n; i++) line[i] = 0;
    }

    place(0, 0);
    if (!any) return null;
    return known.map((v, i) => (canFill[i] && !canEmpty[i] ? 1 : canEmpty[i] && !canFill[i] ? 0 : v));
  }

  function logicSolvable(n, rc, cc) {
    const g = Array(n * n).fill(-1);
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        const r = solveLine(rc[i], row(g, n, i));
        if (!r) return false;
        r.forEach((v, c) => { if (g[i * n + c] !== v) { g[i * n + c] = v; changed = true; } });
        const c = solveLine(cc[i], col(g, n, i));
        if (!c) return false;
        c.forEach((v, r2) => { if (g[r2 * n + i] !== v) { g[r2 * n + i] = v; changed = true; } });
      }
    }
    return !g.includes(-1);
  }

  function generate(n) {
    for (let attempt = 0; attempt < 2000; attempt++) {
      const density = 0.55 + Math.random() * 0.1;
      const grid = Array.from({ length: n * n }, () => (Math.random() < density ? FILLED : EMPTY));
      const rc = Array.from({ length: n }, (_, i) => runs(row(grid, n, i)));
      const cc = Array.from({ length: n }, (_, i) => runs(col(grid, n, i)));
      if (logicSolvable(n, rc, cc)) return { grid, rc, cc };
    }
    throw new Error("Couldn't generate a puzzle");
  }

  // ---------- game ----------

  function newGame(n = size) {
    size = n;
    const p = generate(n);
    solution = p.grid; rowClues = p.rc; colClues = p.cc;
    cells = Array(n * n).fill(EMPTY);
    over = false; revealed = false; startedAt = null; message = "";
    if (root?.isConnected) build();
  }

  const lineDone = (line, clue) => runs(line).join() === clue.join();

  function isSolved() {
    for (let i = 0; i < size; i++) {
      if (!lineDone(row(cells, size, i), rowClues[i]) || !lineDone(col(cells, size, i), colClues[i])) return false;
    }
    return true;
  }

  function finish(won) {
    over = true;
    const ms = Date.now() - (startedAt ?? Date.now());
    message = won ? `🎉 Solved in ${formatClock(ms)}!` : "Here's the solution.";
    Stats.record({ game: "nonogram", won, ms, size });
    if (!won) { revealed = true; cells = solution.map((v) => (v === FILLED ? FILLED : EMPTY)); }
    render();
  }

  function formatClock(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function paint(i) {
    if (over || painting === null || cells[i] === painting) return;
    if (startedAt === null) startedAt = Date.now();
    cells[i] = painting;
    render();
  }

  // The win check runs when a stroke ends, so dragging across cells doesn't finish mid-drag.
  function stopPainting() {
    if (painting === null) return;
    painting = null;
    if (!over && isSolved()) finish(true);
  }
  window.addEventListener("pointerup", stopPainting);

  function mount(el) {
    root = el;
    if (!solution) newGame();
    build();
    timer = setInterval(updateClock, 500);
  }

  function unmount() {
    clearInterval(timer);
    painting = null;
  }

  const q = (id) => root.querySelector(`[data-id="${id}"]`);

  function build() {
    root.innerHTML = `
      <div class="page nono-page">
        <h1>Nonogram</h1>
        <p class="sub">Fill the grid so every row and column matches its clues.</p>
        <div class="toolbar">
          <div class="seg" data-id="sizes">${SIZES.map((s) => `<button data-size="${s}">${s}×${s}</button>`).join("")}</div>
          <span class="clock" data-id="clock">0:00</span>
        </div>
        <div class="nono-wrap"><div class="nono" data-id="grid" style="--n:${size}; --cs:${size === 5 ? 44 : size === 10 ? 30 : 22}px"></div></div>
        <div class="toolbar" style="margin-top:14px">
          <div class="seg" data-id="mode">
            <button data-mode="${FILLED}">■ Fill</button><button data-mode="${CROSSED}">✕ Mark empty</button>
          </div>
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn" data-id="clear">Clear</button>
          <button class="btn" data-id="giveup">Show solution</button>
          <button class="btn primary" data-id="newgame">New puzzle</button>
        </div>
        <p class="msg" data-id="msg"></p>
        <details>
          <summary>How to play</summary>
          <p>Each number is a run of filled squares in that row or column, in order, with at least one empty square between runs.
             <b>3 1</b> means three filled in a row, a gap, then one more.</p>
          <p>Click or drag to fill. Right-click (or switch to <b>✕ Mark empty</b>) to mark squares you know are empty.
             Clues fade once their line is satisfied. Every puzzle can be solved by logic alone.</p>
        </details>
      </div>`;

    const grid = q("grid");
    const corner = document.createElement("div");
    corner.className = "nono-corner";
    grid.append(corner);
    colClues.forEach((clue, c) => {
      const d = document.createElement("div");
      d.className = "nono-clue col";
      d.dataset.col = c;
      d.innerHTML = (clue.length ? clue : [0]).map((x) => `<span>${x}</span>`).join("");
      grid.append(d);
    });
    for (let r = 0; r < size; r++) {
      const d = document.createElement("div");
      d.className = "nono-clue row";
      d.dataset.row = r;
      d.innerHTML = (rowClues[r].length ? rowClues[r] : [0]).map((x) => `<span>${x}</span>`).join("");
      grid.append(d);
      for (let c = 0; c < size; c++) {
        const cell = document.createElement("div");
        cell.className = "nono-cell";
        cell.dataset.i = r * size + c;
        if (c % 5 === 4 && c < size - 1) cell.classList.add("edge-r");
        if (r % 5 === 4 && r < size - 1) cell.classList.add("edge-b");
        grid.append(cell);
      }
    }

    grid.addEventListener("contextmenu", (e) => e.preventDefault());
    grid.addEventListener("pointerdown", (e) => {
      const i = e.target.closest(".nono-cell")?.dataset.i;
      if (i === undefined || over) return;
      e.preventDefault();
      const target = e.button === 2 ? CROSSED : mode;
      painting = cells[i] === target ? EMPTY : target;   // first cell decides: paint, or erase
      paint(Number(i));
    });
    grid.addEventListener("pointermove", (e) => {
      if (painting === null) return;
      const i = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".nono-cell")?.dataset.i;
      if (i !== undefined) paint(Number(i));
    });
    grid.addEventListener("pointercancel", stopPainting);

    q("sizes").onclick = (e) => { const s = e.target.dataset.size; if (s) newGame(Number(s)); };
    q("mode").onclick = (e) => { const m = e.target.dataset.mode; if (m) { mode = Number(m); render(); } };
    q("clear").onclick = () => { if (!over) { cells.fill(EMPTY); render(); } };
    q("giveup").onclick = () => { if (!over) finish(false); };
    q("newgame").onclick = () => newGame();
    render();
  }

  function updateClock() {
    const c = root?.isConnected && q("clock");
    if (c && !over) c.textContent = formatClock(startedAt ? Date.now() - startedAt : 0);
  }

  function render() {
    if (!root?.isConnected) return;
    root.querySelectorAll(".nono-cell").forEach((el) => {
      const v = cells[el.dataset.i];
      el.className = el.className.replace(/\b(filled|crossed|revealed)\b/g, "").trim();
      if (v === FILLED) el.classList.add("filled");
      if (v === CROSSED) el.classList.add("crossed");
      if (revealed && v === FILLED) el.classList.add("revealed");
    });
    root.querySelectorAll(".nono-clue.row").forEach((el) =>
      el.classList.toggle("done", lineDone(row(cells, size, +el.dataset.row), rowClues[+el.dataset.row])));
    root.querySelectorAll(".nono-clue.col").forEach((el) =>
      el.classList.toggle("done", lineDone(col(cells, size, +el.dataset.col), colClues[+el.dataset.col])));
    root.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("on", +b.dataset.size === size));
    root.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", +b.dataset.mode === mode));
    q("msg").textContent = message;
    q("giveup").disabled = over;
    q("clear").disabled = over;
    updateClock();
  }

  return {
    id: "nonogram", title: "Nonogram", mount, unmount,
    describe: (r) => `${r.size}×${r.size}`,
    _test: { solveLine, logicSolvable, generate, runs },
  };
})();
