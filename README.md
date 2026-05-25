# ♟ Chess Bot

A playable chess game with a built-in AI, written in **vanilla JavaScript (ES modules)** — no build tools, no dependencies.

Open `index.html` in a browser and play immediately.

---

## Features

- Full legal move generation (including en passant, castling, promotion)
- Check / checkmate / stalemate detection
- AI powered by **alpha-beta minimax** with piece-square tables
- Adjustable search depth (1–5)
- Switchable random-move mode for testing
- Move history log
- Undo last move pair
- Flip board view

---

## Project Structure

```
chess-bot/
├── index.html          ← UI entry point (game controller + styles)
├── src/
│   ├── board.js        ← Board state, FEN parser, move generation, game rules
│   ├── ai.js           ← AI engine (random / minimax / alpha-beta)
│   └── ui.js           ← Board rendering, move formatting
└── README.md
```

---

## Running Locally

Because the project uses ES modules, you need a local HTTP server (not `file://`):

```bash
# Python (built-in)
python3 -m http.server 8080

# Node / npx
npx serve .

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open [http://localhost:8080](http://localhost:8080).

---

## Incremental Roadmap

The code is structured so you can improve it stage by stage, committing after each:

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

### Stage 3 — Stronger search
- [ ] Iterative deepening (search deeper with time limit)
- [ ] Transposition table (hash positions to avoid re-searching)
- [ ] Quiescence search (avoid horizon-effect blunders)
- [ ] Better move ordering (killer moves, history heuristic)

### Stage 4 — Stronger evaluation
- [ ] King safety (pawn shield, open files near king)
- [ ] Pawn structure (doubled, isolated, passed pawns)
- [ ] Endgame detection + endgame PSTs
- [ ] Mobility score (number of legal moves)

### Stage 5 — Opening & polish
- [ ] Opening book (Polyglot .bin format)
- [ ] Endgame tablebase probing (Syzygy via WASM)
- [ ] FEN / PGN import-export
- [ ] Engine vs engine mode
- [ ] Web worker for AI (non-blocking UI during deep search)

---

## Suggested Git Workflow

Commit after each meaningful change so your history tells a story:

```bash
git init
git add .
git commit -m "Stage 1: board representation and random AI"

# ... improve ai.js with minimax ...
git commit -m "Stage 2: alpha-beta minimax with piece-square tables"

# ... add transposition table ...
git commit -m "Stage 3a: transposition table with Zobrist hashing"
```

---

## How the AI Works

1. **Move generation** — `generateMoves()` creates all pseudo-legal moves; `getLegalMoves()` filters out moves that leave the king in check.
2. **Evaluation** — `evaluate()` sums material values and piece-square table bonuses. Positive = White advantage.
3. **Alpha-beta search** — `alphaBeta()` is a standard negamax-style minimax that prunes branches where the score can never improve on already-found lines.
4. **Move ordering** — captures are tried first, which dramatically improves pruning efficiency.

---

## License

MIT
