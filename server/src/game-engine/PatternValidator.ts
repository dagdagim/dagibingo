import { GamePattern, TicketGrid } from '@bingo/shared';

export interface ValidationResult {
  isValid: boolean;
  patternMatched?: string;
  reason?: string;
}

export class PatternValidator {
  /**
   * Validates if a ticket satisfies the required winning pattern against the authoritative called numbers.
   */
  public static validate(
    grid: TicketGrid,
    drawnNumbers: number[],
    requiredPattern: GamePattern
  ): ValidationResult {
    const drawnSet = new Set(drawnNumbers);

    // Create a 5x5 boolean matrix indicating if each cell is marked (called number or FREE space)
    const markedMatrix: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellValue = grid[r][c];
        if (r === 2 && c === 2) {
          // Free space is always considered marked
          markedMatrix[r][c] = true;
        } else if (drawnSet.has(cellValue)) {
          markedMatrix[r][c] = true;
        }
      }
    }

    switch (requiredPattern) {
      case 'CLASSIC':
        return this.validateClassic(markedMatrix);
      case 'FULL_HOUSE':
        return this.validateFullHouse(markedMatrix);
      case 'FOUR_CORNERS':
        return this.validateFourCorners(markedMatrix);
      case 'X_PATTERN':
        return this.validateXPattern(markedMatrix);
      case 'SPEED_BINGO':
        return this.validateClassic(markedMatrix); // In speed bingo, any single line counts
      default:
        return this.validateClassic(markedMatrix);
    }
  }

  /**
   * Classic pattern: Any completed horizontal row, vertical column, or diagonal.
   */
  private static validateClassic(m: boolean[][]): ValidationResult {
    // Check Rows
    for (let r = 0; r < 5; r++) {
      if (m[r][0] && m[r][1] && m[r][2] && m[r][3] && m[r][4]) {
        return { isValid: true, patternMatched: `Row ${r + 1}` };
      }
    }

    // Check Columns
    for (let c = 0; c < 5; c++) {
      if (m[0][c] && m[1][c] && m[2][c] && m[3][c] && m[4][c]) {
        return { isValid: true, patternMatched: `Column ${c + 1}` };
      }
    }

    // Check Main Diagonal (Top-Left to Bottom-Right)
    if (m[0][0] && m[1][1] && m[2][2] && m[3][3] && m[4][4]) {
      return { isValid: true, patternMatched: 'Main Diagonal' };
    }

    // Check Anti Diagonal (Top-Right to Bottom-Left)
    if (m[0][4] && m[1][3] && m[2][2] && m[3][1] && m[4][0]) {
      return { isValid: true, patternMatched: 'Anti Diagonal' };
    }

    return { isValid: false, reason: 'No valid line completed' };
  }

  /**
   * Full House (Blackout): All 25 cells marked.
   */
  private static validateFullHouse(m: boolean[][]): ValidationResult {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!m[r][c]) {
          return { isValid: false, reason: 'Card is not completely full' };
        }
      }
    }
    return { isValid: true, patternMatched: 'Full House / Blackout' };
  }

  /**
   * Four Corners: Positions [0,0], [0,4], [4,0], [4,4].
   */
  private static validateFourCorners(m: boolean[][]): ValidationResult {
    if (m[0][0] && m[0][4] && m[4][0] && m[4][4]) {
      return { isValid: true, patternMatched: 'Four Corners' };
    }
    return { isValid: false, reason: 'Four corners are not all called' };
  }

  /**
   * X Pattern: Both diagonals marked.
   */
  private static validateXPattern(m: boolean[][]): ValidationResult {
    const mainDiag = m[0][0] && m[1][1] && m[2][2] && m[3][3] && m[4][4];
    const antiDiag = m[0][4] && m[1][3] && m[2][2] && m[3][1] && m[4][0];

    if (mainDiag && antiDiag) {
      return { isValid: true, patternMatched: 'X Pattern' };
    }
    return { isValid: false, reason: 'Both intersecting diagonals are not marked' };
  }
}
