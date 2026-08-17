import { TicketGenerator } from '../src/game-engine/TicketGenerator';
import { BINGO_COLUMNS, FREE_SPACE_VALUE } from '@bingo/shared';

describe('TicketGenerator Authoritative 75-Ball Engine', () => {
  it('should generate a 5x5 grid conforming to B-I-N-G-O column ranges', () => {
    const grid = TicketGenerator.generateTicket();

    expect(grid.length).toBe(5);
    expect(grid[0].length).toBe(5);

    // Column 0 (B: 1-15)
    for (let r = 0; r < 5; r++) {
      expect(grid[r][0]).toBeGreaterThanOrEqual(BINGO_COLUMNS.B.min);
      expect(grid[r][0]).toBeLessThanOrEqual(BINGO_COLUMNS.B.max);
    }

    // Column 1 (I: 16-30)
    for (let r = 0; r < 5; r++) {
      expect(grid[r][1]).toBeGreaterThanOrEqual(BINGO_COLUMNS.I.min);
      expect(grid[r][1]).toBeLessThanOrEqual(BINGO_COLUMNS.I.max);
    }

    // Column 2 (N: 31-45, center is FREE_SPACE_VALUE)
    for (let r = 0; r < 5; r++) {
      if (r === 2) {
        expect(grid[r][2]).toBe(FREE_SPACE_VALUE);
      } else {
        expect(grid[r][2]).toBeGreaterThanOrEqual(BINGO_COLUMNS.N.min);
        expect(grid[r][2]).toBeLessThanOrEqual(BINGO_COLUMNS.N.max);
      }
    }

    // Column 3 (G: 46-60)
    for (let r = 0; r < 5; r++) {
      expect(grid[r][3]).toBeGreaterThanOrEqual(BINGO_COLUMNS.G.min);
      expect(grid[r][3]).toBeLessThanOrEqual(BINGO_COLUMNS.G.max);
    }

    // Column 4 (O: 61-75)
    for (let r = 0; r < 5; r++) {
      expect(grid[r][4]).toBeGreaterThanOrEqual(BINGO_COLUMNS.O.min);
      expect(grid[r][4]).toBeLessThanOrEqual(BINGO_COLUMNS.O.max);
    }
  });

  it('should have zero duplicate numbers within any individual column', () => {
    const grid = TicketGenerator.generateTicket();

    for (let c = 0; c < 5; c++) {
      const colNumbers = [];
      for (let r = 0; r < 5; r++) {
        if (c === 2 && r === 2) continue; // Skip center FREE slot
        colNumbers.push(grid[r][c]);
      }
      const uniqueSet = new Set(colNumbers);
      expect(uniqueSet.size).toBe(colNumbers.length);
    }
  });
});
