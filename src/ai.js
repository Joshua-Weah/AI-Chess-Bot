/**
 * ai.js — Chess AI engine
 *
 * Incremental improvement stages:
 *   Stage 1: Random move selection
 *   Stage 2: Basic material evaluation
 *   Stage 3: Minimax search (uncomment minimaxSearch)
 *   Stage 4: Alpha-beta pruning (uncomment alphaBeta)
 *   Stage 5: Move ordering, quiescence search, opening book
 */

import { getLegalMoves, applyMove, getGameStatus, isWhite, isBlack, PIECES, WHITE, BLACK } from './board.js';

// ─── Stage 1: Random AI ───────────────────────────────────────────────────────

/** Pick a uniformly random legal move */
export function randomMove(state) {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// ─── Stage 2: Material evaluation ────────────────────────────────────────────

/**
 * Piece values in centipawns.
 * Positive = good for White, negative = good for Black.
 */
const PIECE_VALUES = {
  [PIECES.W_PAWN]:   100,  [PIECES.B_PAWN]:   -100,
  [PIECES.W_KNIGHT]: 320,  [PIECES.B_KNIGHT]: -320,
  [PIECES.W_BISHOP]: 330,  [PIECES.B_BISHOP]: -330,
  [PIECES.W_ROOK]:   500,  [PIECES.B_ROOK]:   -500,
  [PIECES.W_QUEEN]:  900,  [PIECES.B_QUEEN]:  -900,
  [PIECES.W_KING]:   20000,[PIECES.B_KING]:   -20000,
  [PIECES.EMPTY]:    0,
};

/**
 * Piece-square tables (White's perspective; negate for Black).
 * Indexed [row][col], row 0 = rank 8.
 * Encourages pawns to advance, knights to centralise, etc.
 */
const PST_PAWN = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0],
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const PST_ROOK = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  5,  5,  0,  0,  0],
];

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const PST_KING = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
];

const PST_MAP = {
  [PIECES.W_PAWN]: PST_PAWN, [PIECES.W_KNIGHT]: PST_KNIGHT,
  [PIECES.W_BISHOP]: PST_BISHOP, [PIECES.W_ROOK]: PST_ROOK,
  [PIECES.W_QUEEN]: PST_QUEEN, [PIECES.W_KING]: PST_KING,
};

/** Static evaluation function — positive favours White, negative favours Black */
export function evaluate(state) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece === PIECES.EMPTY) continue;

      const value = PIECE_VALUES[piece];
      score += value;

      // Piece-square bonus
      if (isWhite(piece)) {
        const pst = PST_MAP[piece];
        if (pst) score += pst[r][c];
      } else {
        // Black: mirror row and negate
        const wPiece = piece - 6;
        const pst = PST_MAP[wPiece];
        if (pst) score -= pst[7 - r][c];
      }
    }
  }
  return score;
}

// ─── Stage 3 & 4: Minimax with Alpha-Beta pruning ─────────────────────────────

const CHECKMATE_SCORE = 100000;

/**
 * Alpha-beta minimax search.
 * @param {GameState} state
 * @param {number} depth - remaining depth
 * @param {number} alpha
 * @param {number} beta
 * @param {boolean} maximising - true = White's turn
 */
function alphaBeta(state, depth, alpha, beta, maximising) {
  const status = getGameStatus(state);
  if (status === 'checkmate') return maximising ? -CHECKMATE_SCORE : CHECKMATE_SCORE;
  if (status === 'stalemate') return 0;
  if (depth === 0) return evaluate(state);

  const moves = getLegalMoves(state);

  // Move ordering: captures first (improves alpha-beta efficiency)
  moves.sort((a, b) => {
    const capA = state.board[a.toRow][a.toCol] !== PIECES.EMPTY ? 1 : 0;
    const capB = state.board[b.toRow][b.toCol] !== PIECES.EMPTY ? 1 : 0;
    return capB - capA;
  });

  if (maximising) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyMove(state, move);
      const score = alphaBeta(next, depth - 1, alpha, beta, false);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break; // β cut-off
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = applyMove(state, move);
      const score = alphaBeta(next, depth - 1, alpha, beta, true);
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break; // α cut-off
    }
    return best;
  }
}

/**
 * Find the best move using alpha-beta search at a given depth.
 * @param {GameState} state
 * @param {number} depth - search depth (3 = fast, 4–5 = stronger but slower)
 */
export function bestMove(state, depth = 3) {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  const maximising = state.turn === WHITE;
  let bestScore = maximising ? -Infinity : Infinity;
  let best = moves[0];

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = alphaBeta(next, depth - 1, -Infinity, Infinity, !maximising);
    if (maximising ? score > bestScore : score < bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

// ─── AI selector ─────────────────────────────────────────────────────────────

/**
 * Main AI entry point.
 * @param {GameState} state
 * @param {'random'|'minimax'} mode
 * @param {number} depth
 */
export function getAIMove(state, mode = 'minimax', depth = 3) {
  if (mode === 'random') return randomMove(state);
  return bestMove(state, depth);
}
