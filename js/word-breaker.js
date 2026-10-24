// Word Breaker: guess the hidden 5-letter word in 6 tries. Each letter is marked
// green (right letter, right spot), gold (in the word, wrong spot) or gray (not in the word).
// Hard mode: every clue you've been given must be used in later guesses.

const WordBreaker = (() => {
  const LENGTH = 5, MAX_GUESSES = 6;
  const VALID = new Set(ANSWERS);
  for (let i = 0; i < EXTRA_GUESSES.length; i += LENGTH) VALID.add(EXTRA_GUESSES.slice(i, i + LENGTH));
  const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "⏎zxcvbnm⌫"];
  const RANK = { miss: 1, near: 2, hit: 3 };

  let secret, guesses, current, over, startedAt, message, hard = loadHard();
  let root;

  function loadHard() {
    try { return localStorage.getItem("mindGames.wordHard") === "1"; } catch { return false; }
  }

  function setHard(on) {
    hard = on;
    try { localStorage.setItem("mindGames.wordHard", on ? "1" : "0"); } catch {}
  }

  function newGame() {
    secret = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    guesses = [];   // [{ word, marks: ["hit"|"near"|"miss", ...] }]
    current = "";
    over = false;
    startedAt = null;
    message = "";
    render();
  }

  // Two passes so repeated letters are handled correctly: exact matches claim
  // letters first, then remaining letters can earn "near" only while unclaimed copies remain.
  function score(word, target = secret) {
    const marks = Array(LENGTH).fill("miss");
    const left = {};
    for (let i = 0; i < LENGTH; i++) {
      if (word[i] === target[i]) marks[i] = "hit";
      else left[target[i]] = (left[target[i]] || 0) + 1;
    }
    for (let i = 0; i < LENGTH; i++) {
      if (marks[i] !== "hit" && left[word[i]] > 0) {
        marks[i] = "near";
        left[word[i]]--;
      }
    }
    return marks;
  }

  // In hard mode, returns why `word` breaks an earlier clue, or null if it's allowed.
  function hardModeProblem(word) {
    const ordinal = (n) => ["1st", "2nd", "3rd", "4th", "5th"][n];
    for (const g of guesses) {
      const needed = {};
      for (let i = 0; i < LENGTH; i++) {
        if (g.marks[i] === "hit" && word[i] !== g.word[i]) return `${ordinal(i)} letter must be ${g.word[i].toUpperCase()}`;
        if (g.marks[i] !== "miss") needed[g.word[i]] = (needed[g.word[i]] || 0) + 1;
      }
      for (const [letter, n] of Object.entries(needed)) {
        const have = [...word].filter((c) => c === letter).length;
        if (have < n) return `Guess must contain ${n > 1 ? n + "× " : ""}${letter.toUpperCase()}`;
      }
    }
    return null;
  }

  function type(letter) {
    if (over || current.length >= LENGTH) return;
    if (startedAt === null) startedAt = Date.now();
    current += letter;
    message = "";
    render();
  }

  function backspace() {
    if (over) return;
    current = current.slice(0, -1);
    message = "";
    render();
  }

  function reject(text) {
    message = text;
    render();
    const row = q("grid").children[guesses.length];
    row?.classList.add("shake");
  }

  function submit() {
    if (over) return;
    if (current.length < LENGTH) return reject("Not enough letters");
    if (!VALID.has(current)) return reject("Not in the word list");
    if (hard) {
      const problem = hardModeProblem(current);
      if (problem) return reject(problem);
    }
    guesses.push({ word: current, marks: score(current) });
    const won = current === secret;
    current = "";
    if (won || guesses.length === MAX_GUESSES) {
      over = true;
      const n = guesses.length;
      const praise = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
      message = won ? `🎉 ${praise[n - 1]} Solved in ${n}.` : `💥 The word was ${secret.toUpperCase()}.`;
      Stats.record({ game: "word-breaker", won, guesses: n, ms: Date.now() - startedAt });
    }
    render();
  }

  function mount(el) {
    root = el;
    root.innerHTML = `
      <div class="page">
        <h1>Word Breaker</h1>
        <p class="sub">Find the hidden 5-letter word in 6 guesses.</p>
        <div class="grid" data-id="grid"></div>
        <p class="msg" data-id="msg"></p>
        <div class="keyboard" data-id="keyboard"></div>
        <label class="toggle"><input type="checkbox" data-id="hard"> Hard mode: clues you've found must be reused</label>
        <div class="actions" style="margin-top:14px"><button class="btn" data-id="newgame">New game</button></div>
        <details>
          <summary>How to play</summary>
          <p>Type any real 5-letter word and press <b>Enter</b>. Each letter then gets a color:</p>
          <p><span class="tile small hit">A</span> right letter, <b>right spot</b><br>
             <span class="tile small near">B</span> in the word, <b>wrong spot</b><br>
             <span class="tile small miss">C</span> not in the word (or no more copies of it)</p>
          <p>Letters can repeat. The keyboard remembers what you've learned about each letter.</p>
        </details>
      </div>`;

    for (const row of KEY_ROWS) {
      const r = document.createElement("div");
      r.className = "krow";
      for (const k of row) {
        const b = document.createElement("button");
        b.className = "key";
        b.dataset.key = k;
        if (k === "⏎") { b.textContent = "Enter"; b.classList.add("wide"); b.onclick = submit; }
        else if (k === "⌫") { b.textContent = "⌫"; b.classList.add("wide"); b.onclick = backspace; }
        else { b.textContent = k; b.onclick = () => type(k); }
        r.append(b);
      }
      q("keyboard").append(r);
    }

    q("hard").onchange = (e) => setHard(e.target.checked);
    q("newgame").onclick = newGame;

    if (!secret) newGame();
    else render();
  }

  const q = (id) => root.querySelector(`[data-id="${id}"]`);

  function render() {
    if (!root?.isConnected) return;
    const grid = q("grid");
    grid.innerHTML = "";
    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement("div");
      row.className = "wrow";
      const g = guesses[r];
      const letters = g ? g.word : r === guesses.length ? current : "";
      for (let i = 0; i < LENGTH; i++) {
        const t = document.createElement("div");
        t.className = "tile";
        t.textContent = letters[i] || "";
        if (g) t.classList.add(g.marks[i]);
        else if (letters[i]) t.classList.add("filled");
        row.append(t);
      }
      grid.append(row);
    }

    const best = {};
    for (const g of guesses) {
      [...g.word].forEach((c, i) => {
        if (!best[c] || RANK[g.marks[i]] > RANK[best[c]]) best[c] = g.marks[i];
      });
    }
    root.querySelectorAll(".key").forEach((b) => {
      b.classList.remove("hit", "near", "miss");
      if (best[b.dataset.key]) b.classList.add(best[b.dataset.key]);
    });

    q("msg").textContent = message;
    const hardBox = q("hard");
    hardBox.checked = hard;
    hardBox.disabled = guesses.length > 0 && !over;   // can't switch mid-game
    hardBox.parentElement.title = hardBox.disabled ? "Finish or restart the game to change this" : "";
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key)) type(e.key.toLowerCase());
    else if (e.key === "Backspace") backspace();
    else if (e.key === "Enter") { e.preventDefault(); submit(); }
  }

  return { id: "word-breaker", title: "Word Breaker", maxGuesses: MAX_GUESSES, mount, onKey,
           describe: (r) => `${r.won ? r.guesses : "X"}/${MAX_GUESSES}`,
           _test: { score, isValid: (w) => VALID.has(w) } };
})();
