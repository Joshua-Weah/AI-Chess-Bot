/**
 * openings.js — Simple opening book
 *
 * Move keys are: fromRow + fromCol + toRow + toCol
 * Row 0 = rank 8 (Black's back rank), Row 7 = rank 1 (White's back rank)
 * Col 0 = a-file, Col 7 = h-file
 */

export function moveToKey(move) {
  return `${move.fromRow}${move.fromCol}${move.toRow}${move.toCol}`;
}

export function keyToMove(key) {
  return {
    fromRow: parseInt(key[0]),
    fromCol: parseInt(key[1]),
    toRow:   parseInt(key[2]),
    toCol:   parseInt(key[3]),
  };
}

const BOOK = {
  // 1. e4
  '': '6444',

  // 1. e4 e5
  '6444': '1434',
  '64441434': '7655',       
  '644414347655': '0212',   

  // Ruy Lopez: 3.Bb5
  '6444143476550212': '7531',

  // Italian: 3.Bc4
  '644414347655021275310212': '7524',

  // Sicilian: 1.e4 c5
  '64441232': '7655',
  '644412327655': '1323',   
  '6444123276551323': '6343', 

  // French: 1.e4 e6
  '64441465': '6343',
  '644414656343': '1433',   

  // Caro-Kann: 1.e4 c6
  '64441426': '6343',
  '644414266343': '1433',   

  // Queen's Gambit: 1.d4 d5 2.c4
  '63431433': '6242',
  '634314336242': '1322',   
  '6343143362421322': '7655',

  // King's Indian: 1.d4 Nf6 2.c4 g6
  '63430625': '6242',
  '634306256242': '1364',
  '6343062562421364': '7152',

  // London: 1.d4 d5 2.Nf3 Bf4
  '634314337655': '7534',
  '6343143376557534': '0625',
};

export function getBookMove(moveHistory) {
  const historyKey = moveHistory.map(moveToKey).join('');
  console.log('Book lookup key:', historyKey);
  const bookMove = BOOK[historyKey];
  if (!bookMove) return null;
  return keyToMove(bookMove);
}