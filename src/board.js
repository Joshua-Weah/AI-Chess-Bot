/**
 * board.js — Chess board state and move generation
 *
 * Incremental improvement stages:
 *   Stage 1 (this file): Basic board representation + pseudo-legal moves
 *   Stage 2: Add check detection, legal move filtering
 *   Stage 3: Add en passant, castling, promotion
 */

// Piece constants
export const PIECES = {
  EMPTY: 0,
  W_PAWN: 1, W_KNIGHT: 2, W_BISHOP: 3, W_ROOK: 4, W_QUEEN: 5, W_KING: 6,
  B_PAWN: 7, B_KNIGHT: 8, B_BISHOP: 9, B_ROOK: 10, B_QUEEN: 11, B_KING: 12,
};

export const WHITE = 'white';
export const BLACK = 'black';

export function isWhite(piece) { return piece >= 1 && piece <= 6; }
export function isBlack(piece) { return piece >= 7 && piece <= 12; }
export function isEmpty(piece) { return piece === 0; }
export function sideOf(piece) { return isWhite(piece) ? WHITE : BLACK; }

// Starting position FEN
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FEN_MAP = {
  'P': PIECES.W_PAWN,   'N': PIECES.W_KNIGHT, 'B': PIECES.W_BISHOP,
  'R': PIECES.W_ROOK,   'Q': PIECES.W_QUEEN,  'K': PIECES.W_KING,
  'p': PIECES.B_PAWN,   'n': PIECES.B_KNIGHT, 'b': PIECES.B_BISHOP,
  'r': PIECES.B_ROOK,   'q': PIECES.B_QUEEN,  'k': PIECES.B_KING,
};

const PIECE_TO_FEN = Object.fromEntries(Object.entries(FEN_MAP).map(([k,v]) => [v, k]));

/**
 * GameState holds all information needed to describe a chess position.
 */
export class GameState {
  constructor() {
    // 8x8 board, row 0 = rank 8, row 7 = rank 1
    this.board = Array(8).fill(null).map(() => Array(8).fill(PIECES.EMPTY));
    this.turn = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null; // {row, col} or null
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.moveHistory = [];
  }

  clone() {
    const s = new GameState();
    s.board = this.board.map(r => [...r]);
    s.turn = this.turn;
    s.castling = { ...this.castling };
    s.enPassant = this.enPassant ? { ...this.enPassant } : null;
    s.halfMoves = this.halfMoves;
    s.fullMoves = this.fullMoves;
    s.moveHistory = [...this.moveHistory];
    return s;
  }

  get(row, col) { return this.board[row]?.[col] ?? null; }
  set(row, col, piece) { this.board[row][col] = piece; }

  inBounds(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
}

/** Parse a FEN string into a GameState */
export function parseFEN(fen = STARTING_FEN) {
  const state = new GameState();
  const parts = fen.trim().split(' ');
  const rows = parts[0].split('/');

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        c += parseInt(ch);
      } else {
        state.board[r][c] = FEN_MAP[ch] ?? PIECES.EMPTY;
        c++;
      }
    }
  }

  state.turn = parts[1] === 'b' ? BLACK : WHITE;

  const cast = parts[2] ?? '-';
  state.castling = {
    wK: cast.includes('K'), wQ: cast.includes('Q'),
    bK: cast.includes('k'), bQ: cast.includes('q'),
  };

  if (parts[3] && parts[3] !== '-') {
    const col = parts[3].charCodeAt(0) - 97;
    const row = 8 - parseInt(parts[3][1]);
    state.enPassant = { row, col };
  }

  state.halfMoves = parseInt(parts[4] ?? '0');
  state.fullMoves = parseInt(parts[5] ?? '1');
  return state;
}

/** Convert GameState to FEN string */
export function toFEN(state) {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p === PIECES.EMPTY) { empty++; }
      else {
        if (empty) { fen += empty; empty = 0; }
        fen += PIECE_TO_FEN[p];
      }
    }
    if (empty) fen += empty;
    if (r < 7) fen += '/';
  }
  fen += ' ' + (state.turn === WHITE ? 'w' : 'b');
  const cast = (state.castling.wK ? 'K' : '') + (state.castling.wQ ? 'Q' : '') +
               (state.castling.bK ? 'k' : '') + (state.castling.bQ ? 'q' : '');
  fen += ' ' + (cast || '-');
  fen += ' ' + (state.enPassant
    ? String.fromCharCode(97 + state.enPassant.col) + (8 - state.enPassant.row)
    : '-');
  fen += ' ' + state.halfMoves + ' ' + state.fullMoves;
  return fen;
}

// ─── Move generation ─────────────────────────────────────────────────────────

/**
 * A Move is: { fromRow, fromCol, toRow, toCol, promotion? }
 */

/** Generate all pseudo-legal moves for the current side */
export function generateMoves(state) {
  const moves = [];
  const side = state.turn;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece === PIECES.EMPTY) continue;
      if (sideOf(piece) !== side) continue;

      const type = isWhite(piece) ? piece : piece - 6;

      switch (type) {
        case PIECES.W_PAWN:   addPawnMoves(state, r, c, moves); break;
        case PIECES.W_KNIGHT: addKnightMoves(state, r, c, moves); break;
        case PIECES.W_BISHOP: addSlidingMoves(state, r, c, moves, [[1,1],[1,-1],[-1,1],[-1,-1]]); break;
        case PIECES.W_ROOK:   addSlidingMoves(state, r, c, moves, [[1,0],[-1,0],[0,1],[0,-1]]); break;
        case PIECES.W_QUEEN:  addSlidingMoves(state, r, c, moves, [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]); break;
        case PIECES.W_KING:   addKingMoves(state, r, c, moves); break;
      }
    }
  }

  return moves;
}

function addPawnMoves(state, r, c, moves) {
  const piece = state.board[r][c];
  const dir = isWhite(piece) ? -1 : 1;
  const startRow = isWhite(piece) ? 6 : 1;
  const promoRow = isWhite(piece) ? 0 : 7;
  const side = sideOf(piece);

  // Forward one
  if (state.inBounds(r + dir, c) && isEmpty(state.board[r + dir][c])) {
    if (r + dir === promoRow) {
      for (const promo of ['q', 'r', 'b', 'n']) {
        moves.push({ fromRow: r, fromCol: c, toRow: r + dir, toCol: c, promotion: promo });
      }
    } else {
      moves.push({ fromRow: r, fromCol: c, toRow: r + dir, toCol: c });
      // Forward two from start
      if (r === startRow && isEmpty(state.board[r + 2 * dir][c])) {
        moves.push({ fromRow: r, fromCol: c, toRow: r + 2 * dir, toCol: c });
      }
    }
  }

  // Captures
  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc;
    if (!state.inBounds(nr, nc)) continue;
    const target = state.board[nr][nc];

    const isEnPassant = state.enPassant?.row === nr && state.enPassant?.col === nc;
    const isCapture = !isEmpty(target) && sideOf(target) !== side;

    if (isCapture || isEnPassant) {
      if (nr === promoRow) {
        for (const promo of ['q', 'r', 'b', 'n']) {
          moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc, promotion: promo });
        }
      } else {
        moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
      }
    }
  }
}

function addKnightMoves(state, r, c, moves) {
  const piece = state.board[r][c];
  const side = sideOf(piece);
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nc = c + dc;
    if (!state.inBounds(nr, nc)) continue;
    const target = state.board[nr][nc];
    if (isEmpty(target) || sideOf(target) !== side) {
      moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
    }
  }
}

function addSlidingMoves(state, r, c, moves, dirs) {
  const piece = state.board[r][c];
  const side = sideOf(piece);
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (state.inBounds(nr, nc)) {
      const target = state.board[nr][nc];
      if (isEmpty(target)) {
        moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
      } else {
        if (sideOf(target) !== side) {
          moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
        }
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function addKingMoves(state, r, c, moves) {
  const piece = state.board[r][c];
  const side = sideOf(piece);
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (!state.inBounds(nr, nc)) continue;
    const target = state.board[nr][nc];
    if (isEmpty(target) || sideOf(target) !== side) {
      moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
    }
  }

  // Castling (basic — does not check for squares being attacked)
  if (side === WHITE && r === 7 && c === 4) {
    if (state.castling.wK && isEmpty(state.board[7][5]) && isEmpty(state.board[7][6]) &&
        state.board[7][7] === PIECES.W_ROOK) {
      moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 6, castle: 'K' });
    }
    if (state.castling.wQ && isEmpty(state.board[7][3]) && isEmpty(state.board[7][2]) &&
        isEmpty(state.board[7][1]) && state.board[7][0] === PIECES.W_ROOK) {
      moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 2, castle: 'Q' });
    }
  }
  if (side === BLACK && r === 0 && c === 4) {
    if (state.castling.bK && isEmpty(state.board[0][5]) && isEmpty(state.board[0][6]) &&
        state.board[0][7] === PIECES.B_ROOK) {
      moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 6, castle: 'k' });
    }
    if (state.castling.bQ && isEmpty(state.board[0][3]) && isEmpty(state.board[0][2]) &&
        isEmpty(state.board[0][1]) && state.board[0][0] === PIECES.B_ROOK) {
      moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 2, castle: 'q' });
    }
  }
}

/** Apply a move to a cloned state, returning the new state */
export function applyMove(state, move) {
  const next = state.clone();
  const { fromRow, fromCol, toRow, toCol } = move;
  const piece = next.board[fromRow][fromCol];
  const side = sideOf(piece);

  // En passant capture
  if (next.enPassant?.row === toRow && next.enPassant?.col === toCol) {
    const captureRow = side === WHITE ? toRow + 1 : toRow - 1;
    next.board[captureRow][toCol] = PIECES.EMPTY;
  }

  // Set en passant square for double pawn push
  next.enPassant = null;
  const pawnType = side === WHITE ? PIECES.W_PAWN : PIECES.B_PAWN;
  if (piece === pawnType && Math.abs(toRow - fromRow) === 2) {
    next.enPassant = { row: (fromRow + toRow) / 2, col: fromCol };
  }

  // Castling — move rook
  if (move.castle) {
    if (move.castle === 'K') { next.board[7][5] = PIECES.W_ROOK; next.board[7][7] = PIECES.EMPTY; }
    if (move.castle === 'Q') { next.board[7][3] = PIECES.W_ROOK; next.board[7][0] = PIECES.EMPTY; }
    if (move.castle === 'k') { next.board[0][5] = PIECES.B_ROOK; next.board[0][7] = PIECES.EMPTY; }
    if (move.castle === 'q') { next.board[0][3] = PIECES.B_ROOK; next.board[0][0] = PIECES.EMPTY; }
  }

  // Update castling rights
  if (piece === PIECES.W_KING) { next.castling.wK = false; next.castling.wQ = false; }
  if (piece === PIECES.B_KING) { next.castling.bK = false; next.castling.bQ = false; }
  if (fromRow === 7 && fromCol === 7) next.castling.wK = false;
  if (fromRow === 7 && fromCol === 0) next.castling.wQ = false;
  if (fromRow === 0 && fromCol === 7) next.castling.bK = false;
  if (fromRow === 0 && fromCol === 0) next.castling.bQ = false;

  // Move piece
  next.board[toRow][toCol] = piece;
  next.board[fromRow][fromCol] = PIECES.EMPTY;

  // Promotion
  if (move.promotion) {
    const promoMap = { q: side === WHITE ? PIECES.W_QUEEN : PIECES.B_QUEEN,
                       r: side === WHITE ? PIECES.W_ROOK  : PIECES.B_ROOK,
                       b: side === WHITE ? PIECES.W_BISHOP: PIECES.B_BISHOP,
                       n: side === WHITE ? PIECES.W_KNIGHT: PIECES.B_KNIGHT };
    next.board[toRow][toCol] = promoMap[move.promotion];
  }

  // Clocks
  next.halfMoves = (piece === pawnType || !isEmpty(state.board[toRow][toCol])) ? 0 : state.halfMoves + 1;
  if (side === BLACK) next.fullMoves++;
  next.turn = side === WHITE ? BLACK : WHITE;
  next.moveHistory.push(move);
  return next;
}

/** Check if a square is attacked by `side` */
export function isAttacked(state, row, col, side) {
  // Temporarily flip turn to generate opponent moves
  const probe = state.clone();
  probe.turn = side;
  const moves = generateMoves(probe);
  return moves.some(m => m.toRow === row && m.toCol === col);
}

/** Is the current side's king in check? */
export function isInCheck(state) {
  const side = state.turn;
  const kingPiece = side === WHITE ? PIECES.W_KING : PIECES.B_KING;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === kingPiece) {
        const opp = side === WHITE ? BLACK : WHITE;
        return isAttacked(state, r, c, opp);
      }
    }
  }
  return false;
}

/** Filter pseudo-legal moves to only legal ones (king not in check after move) */
export function getLegalMoves(state) {
  return generateMoves(state).filter(move => {
    const next = applyMove(state, move);
    // After moving, check if OUR king is in check (flip turn back to check)
    const check = next.clone();
    check.turn = state.turn;
    return !isInCheck(check);
  });
}

/** Check for checkmate or stalemate */
export function getGameStatus(state) {
  const legal = getLegalMoves(state);
  if (legal.length > 0) return 'playing';
  return isInCheck(state) ? 'checkmate' : 'stalemate';
}
