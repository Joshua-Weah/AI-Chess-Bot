/**
 * ai.js — Chess AI engine
 *
 * Stages implemented:
 *   - Random move selection
 *   - Material evaluation with piece-square tables
 *   - Alpha-beta minimax with quiescence search
 *   - King safety and pawn structure evaluation
 *   - Iterative deepening with time limit
 *   - Transposition table for position caching
 *   - Opening book
 */

import { getLegalMoves, applyMove, getGameStatus, isWhite, isBlack, PIECES, WHITE, BLACK } from './board.js';
import { getBookMove } from './openings.js';

// ─── Transposition table ───

const transpositionTable = new Map();

function getPositionKey(state) {
  return state.board.map(row => row.join(',')).join('|') + '|' + state.turn;
}

// ─── Random AI ───

export function randomMove(state) {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// ─── Material evaluation ───

const PIECE_VALUES = {
  [PIECES.W_PAWN]:   100,  [PIECES.B_PAWN]:   -100,
  [PIECES.W_KNIGHT]: 320,  [PIECES.B_KNIGHT]: -320,
  [PIECES.W_BISHOP]: 330,  [PIECES.B_BISHOP]: -330,
  [PIECES.W_ROOK]:   500,  [PIECES.B_ROOK]:   -500,
  [PIECES.W_QUEEN]:  900,  [PIECES.B_QUEEN]:  -900,
  [PIECES.W_KING]:   20000,[PIECES.B_KING]:   -20000,
  [PIECES.EMPTY]:    0,
};

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

// ─── King safety ───

function kingSafety(state, side) {
  const kingPiece = side === WHITE ? PIECES.W_KING : PIECES.B_KING;
  const pawnPiece = side === WHITE ? PIECES.W_PAWN : PIECES.B_PAWN;
  let score = 0;
  let kingRow = -1, kingCol = -1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === kingPiece) { kingRow = r; kingCol = c; }
    }
  }
  if (kingRow === -1) return 0;

  const shieldRow = side === WHITE ? kingRow - 1 : kingRow + 1;
  if (shieldRow >= 0 && shieldRow < 8) {
    for (let c = kingCol - 1; c <= kingCol + 1; c++) {
      if (c >= 0 && c < 8 && state.board[shieldRow][c] === pawnPiece) score += 10;
    }
  }

  let pawnOnFile = false;
  for (let r = 0; r < 8; r++) {
    if (state.board[r][kingCol] === pawnPiece) { pawnOnFile = true; break; }
  }
  if (!pawnOnFile) score -= 20;

  const pieceCount = state.board.flat().filter(p => p !== PIECES.EMPTY).length;
  const isEndgame = pieceCount < 14;
  if (!isEndgame && kingCol >= 2 && kingCol <= 5) score -= 30;

  return score;
}

// ─── Pawn structure ───

function pawnStructure(state, side) {
  const pawnPiece = side === WHITE ? PIECES.W_PAWN : PIECES.B_PAWN;
  const enemyPawn = side === WHITE ? PIECES.B_PAWN : PIECES.W_PAWN;
  let score = 0;

  const pawnFiles = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === pawnPiece) pawnFiles.push({ r, c });
    }
  }

  for (const { r, c } of pawnFiles) {
    const doubled = pawnFiles.filter(p => p.c === c).length > 1;
    if (doubled) score -= 20;

    const hasNeighbour = pawnFiles.some(p => p.c === c - 1 || p.c === c + 1);
    if (!hasNeighbour) score -= 15;

    let passed = true;
    const forwardRows = side === WHITE
      ? Array.from({ length: r }, (_, i) => i)
      : Array.from({ length: 7 - r }, (_, i) => r + 1 + i);

    for (const fr of forwardRows) {
      for (const fc of [c - 1, c, c + 1]) {
        if (fc < 0 || fc > 7) continue;
        if (state.board[fr][fc] === enemyPawn) { passed = false; break; }
      }
      if (!passed) break;
    }
    if (passed) score += 30;
  }

  return score;
}

// ─── Static evaluation ───

export function evaluate(state) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece === PIECES.EMPTY) continue;
      score += PIECE_VALUES[piece];
      if (isWhite(piece)) {
        const pst = PST_MAP[piece];
        if (pst) score += pst[r][c];
      } else {
        const wPiece = piece - 6;
        const pst = PST_MAP[wPiece];
        if (pst) score -= pst[7 - r][c];
      }
    }
  }
  score += kingSafety(state, WHITE);
  score -= kingSafety(state, BLACK);
  score += pawnStructure(state, WHITE);
  score -= pawnStructure(state, BLACK);
  return score;
}

// ─── Search ───

const CHECKMATE_SCORE = 100000;

function quiescence(state, alpha, beta, maximising) {
  const stand_pat = evaluate(state);
  if (maximising) {
    if (stand_pat >= beta) return beta;
    alpha = Math.max(alpha, stand_pat);
  } else {
    if (stand_pat <= alpha) return alpha;
    beta = Math.min(beta, stand_pat);
  }

  const moves = getLegalMoves(state).filter(m => state.board[m.toRow][m.toCol] !== PIECES.EMPTY);
  for (const move of moves) {
    const next = applyMove(state, move);
    const score = quiescence(next, alpha, beta, !maximising);
    if (maximising) {
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    } else {
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
  }
  return maximising ? alpha : beta;
}

function alphaBeta(state, depth, alpha, beta, maximising) {
  // Check transposition table
  const key = getPositionKey(state);
  const cached = transpositionTable.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'exact') return cached.score;
    if (cached.flag === 'lower') alpha = Math.max(alpha, cached.score);
    if (cached.flag === 'upper') beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  const status = getGameStatus(state);
  if (status === 'checkmate') return maximising ? -CHECKMATE_SCORE : CHECKMATE_SCORE;
  if (status === 'stalemate') return 0;
  if (depth === 0) return quiescence(state, alpha, beta, maximising);

  const moves = getLegalMoves(state);
  moves.sort((a, b) => {
    const capA = state.board[a.toRow][a.toCol] !== PIECES.EMPTY ? 1 : 0;
    const capB = state.board[b.toRow][b.toCol] !== PIECES.EMPTY ? 1 : 0;
    return capB - capA;
  });

  const originalAlpha = alpha;
  let best = maximising ? -Infinity : Infinity;

  if (maximising) {
    for (const move of moves) {
      const next = applyMove(state, move);
      const score = alphaBeta(next, depth - 1, alpha, beta, false);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
  } else {
    for (const move of moves) {
      const next = applyMove(state, move);
      const score = alphaBeta(next, depth - 1, alpha, beta, true);
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
  }

  // Store in transposition table
  const flag = best <= originalAlpha ? 'upper' : best >= beta ? 'lower' : 'exact';
  transpositionTable.set(key, { score: best, depth, flag });
  if (transpositionTable.size > 100000) transpositionTable.clear();

  return best;
}

export function bestMove(state, depth = 3) {
  transpositionTable.clear();
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  const maximising = state.turn === WHITE;
  const TIME_LIMIT = 1500;
  const start = Date.now();
  let best = moves[0];

  for (let d = 1; d <= depth; d++) {
    if (Date.now() - start > TIME_LIMIT) break;

    let bestScore = maximising ? -Infinity : Infinity;
    let bestAtDepth = moves[0];

    for (const move of moves) {
      if (Date.now() - start > TIME_LIMIT) break;
      const next = applyMove(state, move);
      const score = alphaBeta(next, d - 1, -Infinity, Infinity, !maximising);
      if (maximising ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestAtDepth = move;
      }
    }

    best = bestAtDepth;
  }

  return best;
}

// ─── AI selector ───

export function getAIMove(state, mode = 'minimax', depth = 3) {
  if (mode === 'random') return randomMove(state);

  const bookMove = getBookMove(state.moveHistory);
  if (bookMove) {
    const legal = getLegalMoves(state);
    const found = legal.find(m =>
      m.fromRow === bookMove.fromRow && m.fromCol === bookMove.fromCol &&
      m.toRow === bookMove.toRow && m.toCol === bookMove.toCol
    );
    if (found) {
      console.log('Book move played!');
      return found;
    }
  }

  return bestMove(state, depth);
}