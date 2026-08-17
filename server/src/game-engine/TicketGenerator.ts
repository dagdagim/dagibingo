import crypto from 'crypto';
import { BINGO_COLUMNS, BingoColumnLetter, BINGO_LETTERS, FREE_SPACE_VALUE, TicketGrid } from '../shared';

export class TicketGenerator {
  /**
   * Generates a single valid 75-ball 5x5 Bingo ticket with strong cryptographic entropy
   * Format: matrix[row][col] where col 0=B (1-15), 1=I (16-30), 2=N (31-45), 3=G (46-60), 4=O (61-75)
   */
  public static generateTicket(): TicketGrid {
    const grid: TicketGrid = Array.from({ length: 5 }, () => Array(5).fill(0));

    BINGO_LETTERS.forEach((letter, colIndex) => {
      const { min, max } = BINGO_COLUMNS[letter];
      const count = colIndex === 2 ? 4 : 5; // N column has 4 numbers + 1 FREE center
      const columnNumbers = this.getRandomUniqueNumbers(min, max, count);

      let numIdx = 0;
      for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
        if (colIndex === 2 && rowIndex === 2) {
          // Center space is always FREE
          grid[rowIndex][colIndex] = FREE_SPACE_VALUE;
        } else {
          grid[rowIndex][colIndex] = columnNumbers[numIdx++];
        }
      }
    });

    return grid;
  }

  /**
   * Generates a guaranteed unique ticket that does not match any existing signatures in the room
   */
  public static generateUniqueTicket(existingSignatures: Set<string> = new Set()): TicketGrid {
    let attempts = 0;
    while (attempts < 100) {
      const grid = this.generateTicket();
      const sig = this.getGridSignature(grid);
      if (!existingSignatures.has(sig)) {
        existingSignatures.add(sig);
        return grid;
      }
      attempts++;
    }
    return this.generateTicket();
  }

  /**
   * Serializes a 5x5 grid into a unique hash signature for collision checking
   */
  public static getGridSignature(grid: TicketGrid): string {
    return grid.map((row) => row.join(',')).join(';');
  }

  /**
   * Helper to pick `count` unique cryptographically random integers between `min` and `max` inclusive
   */
  private static getRandomUniqueNumbers(min: number, max: number, count: number): number[] {
    const pool: number[] = [];
    for (let i = min; i <= max; i++) {
      pool.push(i);
    }

    // Cryptographically secure Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  }
}

