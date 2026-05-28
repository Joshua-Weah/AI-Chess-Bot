/**
 * worker.js — Web Worker for AI move calculation
 *
 * Runs the alpha-beta search on a background thread so the
 * main thread (UI) never freezes during deep searches.
 *
 * Messages IN  (from main thread): { type: 'find_move', state, mode, depth }
 * Messages OUT (to main thread):   { type: 'move_result', move }
 *                                  { type: 'error', message }
 */

import { parseFEN } from './board.js';
import { getAIMove } from './ai.js';

self.onmessage = function (e) {
  const { type, fen, history, mode, depth } = e.data;

  if (type === 'find_move') {
    try {
      const state = parseFEN(fen);
      state.moveHistory = history || [];
      const move = getAIMove(state, mode, depth);
      self.postMessage({ type: 'move_result', move });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};
