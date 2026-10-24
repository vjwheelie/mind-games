// Lights Out: pressing a light flips it and its four neighbors. Turn every light off.
// Par is the true minimum number of presses, found by solving the board as a system of
// equations mod 2 (pressing a light twice cancels out, so each light is pressed 0 or 1 times).

const LightsOut = (() => {
  const SIZES = [4, 5, 6];

  let size = 5, start, board, moves, par, hints, over, startedAt, message, hintCell, solutionShown;
  let root;

  function neighbors(i, n) {
    const r = Math.floor(i / n), c = i % n, out = [i];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  // Fewest presses that turn `lights` off, or null if impossible. Gaussian elimination over GF(2),
  // then try every combination of free variables and keep the solution with the fewest presses.
  function solve(lights, n) {
    const N = n * n;
    const rows = Array.from({ length: N }, (_, i) => {
      const r = Array(N + 1).fill(0);
      for (const j of neighbors(i, n)) r[j] = 1;   // pressing j toggles i (the relation is symmetric)
      r[N] = lights[i] ? 1 : 0;
      return r;
    });

    const pivotCol = [];
    let pr = 0;
    for (let c = 0; c < N && pr < N; c++) {
      const p = rows.findIndex((r, idx) => idx >= pr && r[c]);
      if (p === -1) continue;
      [rows[pr], rows[p]] = [rows[p], rows[pr]];
      for (let r = 0; r < N; r++) {
        if (r !== pr && rows[r][c]) for (let k = c; k <= N; k++) rows[r][k] ^= rows[pr][k];
      }
      pivotCol.push(c);
      pr++;
    }
    for (let r = pr; r < N; r++) if (rows[r][N]) return null;   // 0 = 1: unsolvable

    const free = [...Array(N).keys()].filter((c) => !pivotCol.includes(c));
    let best = null;
    for (let mask = 0; mask < 1 << free.length; mask++) {
      const x = Array(N).fill(0);
      free.forEach((c, k) => (x[c] = (mask >> k) & 1));
      pivotCol.forEach((c, r) => {
        let v = rows[r][N];
        for (const f of free) if (rows[r][f]) v ^= x[f];
        x[c] = v;
      });
      if (!best || x.reduce((a, b) => a + b) < best.reduce((a, b) => a + b)) best = x;
    }
    return best;
  }

  function newGame(n = size) {
    size = n;
    do {
      start = Array(n * n).fill(false);
      for (let i = 0; i < n * n; i++) {
        if (Math.random() < 0.5) for (const j of neighbors(i, n)) start[j] = !start[j];
      }
      par = solve(start, n).reduce((a, b) => a + b);
    } while (par < n);   // skip boards that are too easy
    board = [...start];
    moves = 0; hints = 0; over = false; startedAt = null; message = ""; hintCell = null; solutionShown = null;
    if (root?.isConnected) build();
  }

  function press(i) {
    if (over) return;
    if (startedAt === null) startedAt = Date.now();
    for (const j of neighbors(i, size)) board[j] = !board[j];
    moves++;
    hintCell = null;
    if (board.every((v) => !v)) finish(true);
    else render();
  }

  function finish(won) {
    over = true;
    const ms = Date.now() - (startedAt ?? Date.now());
    if (won) {
      const diff = moves - par;
      message = diff === 0 ? `🏆 Perfect! ${moves} moves, exactly par.` : `🎉 Lights out in ${moves} moves (par ${par}, +${diff}).`;
    } else {
      solutionShown = solve(board, size);
      message = "The highlighted lights are the presses that would have finished it.";
    }
    Stats.record({ game: "lights-out", won, ms, moves, par, hints, size });
    render();
  }

  function hint() {
    if (over) return;
    const x = solve(board, size);
    const options = x.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    hintCell = options[Math.floor(Math.random() * options.length)];
    hints++;
    render();
  }

  function restart() {
    if (over) return;
    board = [...start];
    moves = 0;
    hintCell = null;
    render();
  }

  function mount(el) {
    root = el;
    if (!start) newGame();
    build();
  }

  const q = (id) => root.querySelector(`[data-id="${id}"]`);

  function build() {
    root.innerHTML = `
      <div class="page">
        <h1>Lights Out</h1>
        <p class="sub">Turn off every light. Each press flips a light and its neighbors.</p>
        <div class="toolbar">
          <div class="seg" data-id="sizes">${SIZES.map((s) => `<button data-size="${s}">${s}×${s}</button>`).join("")}</div>
          <span class="clock" data-id="count"></span>
        </div>
        <div class="lo-board" data-id="board" style="--n:${size}"></div>
        <div class="actions" style="margin-top:16px">
          <button class="btn" data-id="hint">💡 Hint</button>
          <button class="btn" data-id="restart">Restart</button>
          <button class="btn" data-id="giveup">Show solution</button>
          <button class="btn primary" data-id="newgame">New puzzle</button>
        </div>
        <p class="msg" data-id="msg"></p>
        <details>
          <summary>How to play</summary>
          <p>Pressing a light flips it and the lights directly above, below, left and right of it: on becomes off, off becomes on.
             Turn them <b>all off</b>.</p>
          <p><b>Par</b> is the fewest presses that can possibly solve this board. Tips: the order of presses never matters, and pressing
             the same light twice undoes it. Try "chasing" lights down: clear each row by pressing the light below it.</p>
        </details>
      </div>`;

    const b = q("board");
    for (let i = 0; i < size * size; i++) {
      const cell = document.createElement("button");
      cell.className = "lo-cell";
      cell.dataset.i = i;
      cell.setAttribute("aria-label", `Light ${Math.floor(i / size) + 1}, ${(i % size) + 1}`);
      cell.onclick = () => press(i);
      b.append(cell);
    }
    q("sizes").onclick = (e) => { const s = e.target.dataset.size; if (s) newGame(Number(s)); };
    q("hint").onclick = hint;
    q("restart").onclick = restart;
    q("giveup").onclick = () => { if (!over) finish(false); };
    q("newgame").onclick = () => newGame();
    render();
  }

  function render() {
    if (!root?.isConnected) return;
    root.querySelectorAll(".lo-cell").forEach((el) => {
      const i = Number(el.dataset.i);
      el.classList.toggle("on", board[i]);
      el.classList.toggle("hint", hintCell === i);
      el.classList.toggle("answer", !!solutionShown?.[i]);
      el.setAttribute("aria-pressed", board[i] ? "true" : "false");
      el.disabled = over;
    });
    root.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("on", +b.dataset.size === size));
    q("count").textContent = `Moves ${moves} · Par ${par}${hints ? ` · Hints ${hints}` : ""}`;
    q("msg").textContent = message;
    for (const id of ["hint", "restart", "giveup"]) q(id).disabled = over;
  }

  return {
    id: "lights-out", title: "Lights Out", mount,
    describe: (r) => `${r.moves} moves (par ${r.par})`,
    _test: { solve, neighbors },
  };
})();
