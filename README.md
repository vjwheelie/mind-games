# Mind Games

Five logic games and a stats dashboard. They run entirely in your browser, with no installs.

## Play

Double-click `index.html`, or run `open index.html` from this folder.

- **Code Breaker**: deduce a hidden 4-color code in 10 guesses.
- **Word Breaker**: find a hidden 5-letter word in 6 guesses. Turn on hard mode if you want to be forced to use every clue.
- **Nonogram**: fill a grid from row and column number clues. Every puzzle can be solved by logic alone.
- **Lights Out**: each press flips a light and its neighbors. Turn them all off in as few presses as possible (par).
- **Word Ladder**: change one letter at a time to get from one word to another.
- **Dashboard**: games played, win rate, streaks, a chart per game, and your recent games.

Stats are saved in your browser's local storage, so they stay on this computer and in this browser only.

## Files

- `index.html`: the page and a small router that switches between views
- `css/style.css`: all styling
- `js/stats.js`: saves finished games and works out shared stats
- `js/dashboard.js`: the dashboard
- `js/code-breaker.js`, `js/word-breaker.js`, `js/nonogram.js`, `js/lights-out.js`, `js/word-ladder.js`: the games
- `js/words.js`, `js/words4.js`: word lists (5- and 4-letter), generated from the macOS dictionary

## How the puzzles stay fair

- **Nonogram** only keeps random grids that row-by-row logic can solve completely, so there's always exactly one answer.
- **Lights Out** computes par exactly by solving the board as a system of equations mod 2.
- **Word Ladder** computes par with a breadth-first search over everyday words.
