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

## How the AI Works

1. **Move generation** — `generateMoves()` creates all pseudo-legal moves; `getLegalMoves()` filters out moves that leave the king in check.
2. **Evaluation** — `evaluate()` sums material values and piece-square table bonuses. Positive = White advantage.
3. **Alpha-beta search** — `alphaBeta()` is a standard negamax-style minimax that prunes branches where the score can never improve on already-found lines.
4. **Move ordering** — captures are tried first, which dramatically improves pruning efficiency.

---

## License

MIT
