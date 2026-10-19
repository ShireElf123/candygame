export type CellPoint = Pick<DOMRectReadOnly, 'left' | 'top'>;

export type MotionOffset = {
  x: number;
  y: number;
};

/** Return the pixel translation that moves an item from one measured cell to another. */
export function translationBetween(from: CellPoint, to: CellPoint): MotionOffset {
  return { x: to.left - from.left, y: to.top - from.top };
}

/**
 * Resolve engine fall distances into pixel offsets using the rendered grid pitch.
 * The measured points include both candy size and CSS grid gaps; translateY(%)
 * cannot represent that distance because percentages are relative to one tile.
 */
export function calculateFallOffsets<T extends { id: number }>(
  board: readonly (readonly T[])[],
  fallDistances: Readonly<Record<number, number>>,
  getCellPoint: (row: number, col: number) => CellPoint | null,
): Record<number, MotionOffset> {
  const offsets: Record<number, MotionOffset> = {};

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const candy = board[row][col];
      const distance = fallDistances[candy.id] ?? 0;
      if (!Number.isInteger(distance) || distance <= 0) continue;

      const destination = getCellPoint(row, col);
      if (!destination) continue;

      const sourceRow = row - distance;
      let source: CellPoint | null;
      if (sourceRow >= 0) {
        source = getCellPoint(sourceRow, col);
      } else {
        const first = getCellPoint(0, col);
        const second = getCellPoint(1, col);
        if (!first || !second) continue;
        const rowPitch = second.top - first.top;
        if (!Number.isFinite(rowPitch) || rowPitch <= 0) continue;
        source = { left: first.left, top: first.top + sourceRow * rowPitch };
      }

      if (source) offsets[candy.id] = translationBetween(destination, source);
    }
  }

  return offsets;
}
