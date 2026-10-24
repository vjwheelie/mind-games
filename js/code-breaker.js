// Code Breaker: guess the hidden 4-color code. Clues tell you how many pegs are
// the right color in the right spot, and how many are the right color in the wrong spot.

const CodeBreaker = (() => {
  const COLORS = ["#ef5b5b", "#f5a524", "#f2e05a", "#4fd17a", "#4aa8ff", "#b77cff"];
  const CODE_LENGTH = 4, MAX_GUESSES = 10;

  let secret, guesses, current, over, startedAt, message;
  let root;

  function newGame() {
    secret = Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * COLORS.length));
    guesses = [];   // [{ pegs: [...], exact, near }]
    current = [];
    over = false;
    startedAt = null;
    message = "";
    render();
  }

  function score(guess) {
    let exact = 0;
    const secretLeft = {}, guessLeft = {};
    guess.forEach((c, i) => {
      if (c === secret[i]) exact++;
      else {
        secretLeft[secret[i]] = (secretLeft[secret[i]] || 0) + 1;
        guessLeft[c] = (guessLeft[c] || 0) + 1;
      }
    });
    let near = 0;
    for (const c in guessLeft) near += Math.min(guessLeft[c], secretLeft[c] || 0);
    return { exact, near };
  }

  function addColor(c) {
    if (over || current.length >= CODE_LENGTH) return;
    if (startedAt === null) startedAt = Date.now();
    current.push(c);
    render();
  }

  function undo() {
    if (over) return;
    current.pop();
    render();
  }

  function removeAt(i) {
    if (over || i >= current.length) return;
    current.splice(i, 1);
    render();
  }

  function submit() {
    if (over || current.length < CODE_LENGTH) return;
    const result = score(current);
    guesses.push({ pegs: current, ...result });
    current = [];
    const won = result.exact === CODE_LENGTH;
    if (won || guesses.length === MAX_GUESSES) {
      over = true;
      const n = guesses.length;
      message = won
        ? (n === 1 ? "🤯 First try?! Incredible." : `🎉 Cracked it in ${n} guesses!`)
        : "💥 Out of guesses. The code is revealed below.";
      Stats.record({ game: "code-breaker", won, guesses: n, ms: Date.now() - startedAt });
    }
    render();
  }

  function pegEl(color, extraClass = "") {
    const el = document.createElement("button");
    el.className = "peg " + extraClass;
    if (color !== undefined) el.style.background = COLORS[color];
    return el;
  }

  function mount(el) {
    root = el;
    root.innerHTML = `
      <div class="page">
        <h1>Code Breaker</h1>
        <p class="sub">Crack the hidden 4-color code in 10 guesses.</p>
        <div class="board" data-id="board"></div>
        <div class="secret">
          <span class="label">Secret</span>
          <div class="pegs" data-id="secret"></div>
        </div>
        <div class="palette" data-id="palette"></div>
        <div class="actions">
          <button class="btn" data-id="undo">⌫ Undo</button>
          <button class="btn primary" data-id="submit">Check guess</button>
          <button class="btn" data-id="newgame">New game</button>
        </div>
        <p class="msg" data-id="msg"></p>
        <details open>
          <summary>How to play</summary>
          <p>The computer has picked a secret code of 4 colors. Colors <b>can repeat</b>.
             Fill a row by clicking colors (or pressing keys <b>1–6</b>), then hit <b>Check guess</b> (or <b>Enter</b>).
             Click a placed peg to remove it.</p>
          <p>Each guess gets clues on the right:<br>
             <span class="legend" style="background:#fff"></span> right color, <b>right spot</b><br>
             <span class="legend" style="border:2px solid #fff"></span> right color, <b>wrong spot</b><br>
             The clues don't tell you <i>which</i> peg they refer to. That's the puzzle.</p>
        </details>
      </div>`;

    COLORS.forEach((color, i) => {
      const b = document.createElement("button");
      b.style.background = color;
      b.textContent = i + 1;
      b.title = `Key ${i + 1}`;
      b.onclick = () => addColor(i);
      q("palette").append(b);
    });
    q("undo").onclick = undo;
    q("submit").onclick = submit;
    q("newgame").onclick = newGame;

    if (!secret) newGame();
    else render();   // resume the game in progress
  }

  const q = (id) => root.querySelector(`[data-id="${id}"]`);

  function render() {
    if (!root?.isConnected) return;
    const board = q("board");
    board.innerHTML = "";
    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement("div");
      row.className = "row";
      const isActive = !over && r === guesses.length;
      if (isActive) row.classList.add("active");

      const num = document.createElement("span");
      num.className = "num";
      num.textContent = r + 1;

      const pegs = document.createElement("div");
      pegs.className = "pegs";
      const g = guesses[r];
      const colors = g ? g.pegs : isActive ? current : [];
      for (let i = 0; i < CODE_LENGTH; i++) {
        const p = pegEl(colors[i], isActive && i === current.length ? "cursor" : "");
        if (isActive) p.onclick = () => removeAt(i);
        pegs.append(p);
      }

      const clues = document.createElement("div");
      clues.className = "clues";
      for (let i = 0; i < CODE_LENGTH; i++) {
        const c = document.createElement("span");
        c.className = "clue";
        if (g && i < g.exact) c.classList.add("exact");
        else if (g && i < g.exact + g.near) c.classList.add("near");
        clues.append(c);
      }

      row.append(num, pegs, clues);
      board.append(row);
    }

    const s = q("secret");
    s.innerHTML = "";
    secret.forEach((c) => {
      const p = over ? pegEl(c) : pegEl(undefined);
      if (!over) p.textContent = "?";
      s.append(p);
    });

    q("msg").textContent = message;
    q("submit").disabled = over || current.length < CODE_LENGTH;
    q("undo").disabled = over || current.length === 0;
  }

  function onKey(e) {
    if (e.key >= "1" && e.key <= String(COLORS.length)) addColor(Number(e.key) - 1);
    else if (e.key === "Backspace") undo();
    else if (e.key === "Enter") { e.preventDefault(); submit(); }
  }

  return { id: "code-breaker", title: "Code Breaker", maxGuesses: MAX_GUESSES, mount, onKey,
           describe: (r) => `${r.guesses} guesses`,
           _test: { score, setSecret: (s) => (secret = s) } };
})();
