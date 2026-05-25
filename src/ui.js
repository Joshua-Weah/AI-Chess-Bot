/**
 * ui.js — Board rendering and user interaction
 */

import { PIECES, isWhite, WHITE, BLACK } from './board.js';

// Unicode chess pieces
const PIECE_GLYPHS = {
  [PIECES.W_KING]: '♔', [PIECES.W_QUEEN]: '♕', [PIECES.W_ROOK]: '♖',
  [PIECES.W_BISHOP]: '♗', [PIECES.W_KNIGHT]: '♘', [PIECES.W_PAWN]: '♙',
  [PIECES.B_KING]: '♚', [PIECES.B_QUEEN]: '♛', [PIECES.B_ROOK]: '♜',
  [PIECES.B_BISHOP]: '♝', [PIECES.B_KNIGHT]: '♞', [PIECES.B_PAWN]: '♟',
  [PIECES.EMPTY]: '',
};

/**
 * Render the board into a container element.
 * @param {HTMLElement} container
 * @param {GameState} state
 * @param {Object} opts
 * @param {Array|null} opts.legalMoves   - legal moves for currently selected piece
 * @param {Object|null} opts.selected    - { row, col } of selected square
 * @param {Object|null} opts.lastMove    - { fromRow, fromCol, toRow, toCol }
 * @param {Function} opts.onSquareClick  - callback(row, col)
 * @param {boolean} opts.flipped         - render from Black's side
 */
export function renderBoard(container, state, opts = {}) {
  const { legalMoves = [], selected = null, lastMove = null, onSquareClick, flipped = false } = opts;

  const legalSet = new Set(legalMoves.map(m => `${m.toRow},${m.toCol}`));
  const lastMoveSet = lastMove
    ? new Set([`${lastMove.fromRow},${lastMove.fromCol}`, `${lastMove.toRow},${lastMove.toCol}`])
    : new Set();

  container.innerHTML = '';
  container.className = 'board';

  const rows = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  for (const r of rows) {
    for (const c of cols) {
      const sq = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      const key = `${r},${c}`;

      sq.className = 'square ' + (isLight ? 'light' : 'dark');
      if (selected && selected.row === r && selected.col === c) sq.classList.add('selected');
      if (lastMoveSet.has(key)) sq.classList.add('last-move');

      const piece = state.board[r][c];
      if (piece !== PIECES.EMPTY) {
        const span = document.createElement('span');
        span.className = 'piece ' + (isWhite(piece) ? 'white-piece' : 'black-piece');
        span.textContent = PIECE_GLYPHS[piece];
        sq.appendChild(span);
      }

      if (legalSet.has(key)) {
        const dot = document.createElement('div');
        dot.className = piece !== PIECES.EMPTY ? 'capture-ring' : 'move-dot';
        sq.appendChild(dot);
      }

      if (onSquareClick) {
        sq.addEventListener('click', () => onSquareClick(r, c));
      }

      container.appendChild(sq);
    }
  }

  // Rank labels
  rows.forEach((r, i) => {
    const label = document.createElement('div');
    label.className = 'rank-label';
    label.textContent = 8 - r;
    label.style.gridRow = i + 1;
    container.appendChild(label);
  });

  // File labels
  const fileLetters = 'abcdefgh';
  cols.forEach((c, i) => {
    const label = document.createElement('div');
    label.className = 'file-label';
    label.textContent = fileLetters[c];
    label.style.gridColumn = i + 1;
    container.appendChild(label);
  });
}

/** Format a move in algebraic-ish notation for the move log */
export function formatMove(move, pieceAtFrom) {
  const files = 'abcdefgh';
  const from = files[move.fromCol] + (8 - move.fromRow);
  const to   = files[move.toCol]   + (8 - move.toRow);
  const glyph = PIECE_GLYPHS[pieceAtFrom] ?? '';
  return `${glyph} ${from}→${to}${move.promotion ? '=' + move.promotion.toUpperCase() : ''}`;
}

/** Append a move entry to the move history log element */
export function appendMoveLog(logEl, moveNumber, whiteEntry, blackEntry) {
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML = `<span class="move-num">${moveNumber}.</span>
    <span class="move-white">${whiteEntry}</span>
    <span class="move-black">${blackEntry || ''}</span>`;
  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;
}
