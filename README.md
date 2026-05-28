# ♟ Chess Bot

A playable chess game with a built-in AI, written in **vanilla JavaScript (ES modules)** — no build tools, no dependencies.

Open `index.html` in a browser and play immediately.

---

## Features

- Full legal move generation (including en passant, castling, promotion)
- Check / checkmate / stalemate detection with king highlight
- AI powered by **alpha-beta minimax** with quiescence search and iterative deepening
- King safety and pawn structure evaluation
- Opening book covering e4 and d4 lines
- Adjustable search depth (1–5)
- Auto board flip based on which side you play
- Move history log and undo
- Web Worker for non-blocking AI search

---

## Project Structure

```
chess-bot/
├── index.html              ← UI entry point (game controller + styles)
├── src/
│   ├── board.js            ← Board state, FEN parser, move generation, game rules
│   ├── ai.js               ← AI engine (minimax, alpha-beta, evaluation)
│   ├── openings.js         ← Opening book (e4/d4 lines)
│   ├── worker.js           ← Web Worker wrapper for AI search
│   └── ui.js               ← Board rendering, move formatting
└── README.md
```

---

## Running Locally

Because the project uses ES modules, you need a local HTTP server (not `file://`):

```bash
# Node / npx
npx serve .

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open [http://localhost:3000](http://localhost:3000).

---

## How the AI Works

1. **Opening book** — for the first few moves, `openings.js` returns a pre-set response instantly with no search required.
2. **Move generation** — `generateMoves()` creates all pseudo-legal moves; `getLegalMoves()` filters out moves that leave the king in check.
3. **Evaluation** — `evaluate()` scores the position using material values, piece-square tables, king safety, and pawn structure.
4. **Alpha-beta search** — `alphaBeta()` is a minimax search that prunes branches where the score can never improve on already-found lines.
5. **Quiescence search** — at depth 0, instead of evaluating statically, the engine keeps searching captures until the position is "quiet" to avoid horizon-effect blunders.
6. **Iterative deepening** — the engine searches from depth 1 upward within a 1.5 second time limit, so it always responds quickly regardless of position complexity.
7. **Web Worker** — the entire search runs on a background thread so the UI never freezes.

---

## What was built

### Stage 1 — Playable baseline ✅
- [x] Board representation (8×8 array, FEN parsing)
- [x] Pseudo-legal move generation for all pieces
- [x] Legal move filter (king-safety check)
- [x] Random AI
- [x] Basic UI (clickable board, move dots)

### Stage 2 — Smarter AI ✅
- [x] Material evaluation (centipawn values)
- [x] Piece-square tables (positional bonuses)
- [x] Minimax with alpha-beta pruning
- [x] Basic move ordering (captures first)

### Stage 3 — Stronger search ✅
- [x] Web Worker (non-blocking UI during deep search)
- [x] Quiescence search (avoid horizon-effect blunders)
- [x] Iterative deepening with time limit

### Stage 4 — Stronger evaluation ✅
- [x] King safety (pawn shield, open files near king)
- [x] Pawn structure (doubled, isolated, passed pawns)

### Stage 5 — Opening & polish ✅
- [x] Opening book (e4/d4 lines)
- [x] Auto board flip based on player side
- [x] King highlighted in red when in check
- [x] Improved piece visibility

---

## Built with

- Vanilla JavaScript (ES Modules)
- HTML / CSS
- Web Workers API