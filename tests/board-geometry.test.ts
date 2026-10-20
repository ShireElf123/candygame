import { describe, expect, it } from 'vitest';
import { calculateFallOffsets, translationBetween, type CellPoint } from '../src/game/board-geometry';

describe('cell-measured motion geometry', () => {
  it.each([28, 35, 64])('uses the rendered grid pitch of %i pixels, including the gap', pitch => {
    const swap = translationBetween({ left: 12, top: 80 }, { left: 12 + pitch, top: 80 });
    expect(swap).toEqual({ x: pitch, y: 0 });

    const board = Array.from({ length: 5 }, (_, row) => [{ id: row + 1 }]);
    const getCellPoint = (row: number, col: number): CellPoint | null =>
      col === 0 && row >= 0 && row < board.length ? { left: 24, top: 30 + row * pitch } : null;

    // A three-row fall moves from row 0 into row 3. The offset must use three
    // complete cell pitches, not three tile-height percentages.
    expect(calculateFallOffsets(board, { 4: 3 }, getCellPoint)).toEqual({ 4: { x: 0, y: -3 * pitch } });
  });

  it('handles a one-row fall and a newly spawned candy above the board', () => {
    const board = Array.from({ length: 4 }, (_, row) => [{ id: row + 10 }]);
    const getCellPoint = (row: number): CellPoint | null =>
      row >= 0 && row < board.length ? { left: 5, top: 16 + row * 34 } : null;

    expect(calculateFallOffsets(board, { 12: 1 }, row => getCellPoint(row))).toEqual({
      12: { x: 0, y: -34 },
    });
    expect(calculateFallOffsets(board, { 11: 2 }, row => getCellPoint(row))).toEqual({
      11: { x: 0, y: -68 },
    });
  });

  it('estimates a spawn from the top of an active segment when rows above are void', () => {
    const board = [[{ id: 1 }], [{ id: 2 }], [{ id: 3 }], [{ id: 4 }]];
    const getCellPoint = (row: number): CellPoint | null =>
      row >= 2 && row < board.length ? { left: 12, top: 40 + (row - 2) * 32 } : null;

    expect(calculateFallOffsets(board, { 4: 2 }, row => getCellPoint(row))).toEqual({
      4: { x: 0, y: -64 },
    });
  });

  it('skips offsets when required cell geometry is unavailable or invalid', () => {
    const board = [[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]];
    expect(calculateFallOffsets(board, { 2: 1 }, () => null)).toEqual({});
    expect(calculateFallOffsets(board, { 3: Number.NaN }, () => ({ left: 0, top: 0 }))).toEqual({});
  });
});
