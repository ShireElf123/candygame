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
      let source: CellPoint | null = sourceRow >= 0 ? getCellPoint(sourceRow, col) : null;
      if (!source) {
        // A new candy can enter above a column's first playable cell, or above
        // a lower gravity segment whose preceding rows are intentional voids.
        // Estimate the row pitch from the destination and the nearest measured
        // active cell in that column instead of treating a hole as a candy.
        let rowPitch: number | null = null;
        for (let offset = 1; offset < board.length && rowPitch === null; offset += 1) {
          const below = getCellPoint(row + offset, col);
          if (below) rowPitch = (below.top - destination.top) / offset;
          else {
            const above = getCellPoint(row - offset, col);
            if (above) rowPitch = (destination.top - above.top) / offset;
          }
        }
        if (rowPitch !== null && Number.isFinite(rowPitch) && rowPitch > 0) {
          source = { left: destination.left, top: destination.top + (sourceRow - row) * rowPitch };
        }
      }
      if (source) offsets[candy.id] = translationBetween(destination, source);
    }
  }

  return offsets;
}
