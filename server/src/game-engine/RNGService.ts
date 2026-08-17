import { BINGO_COLUMNS, BingoColumnLetter, CalledBall, TOTAL_BINGO_BALLS } from '../shared';

export class RNGService {
  /**
   * Generates a complete, pre-shuffled, non-repeating sequence of 75 balls.
   */
  public static generateShuffledBallDeck(): number[] {
    const deck: number[] = [];
    for (let i = 1; i <= TOTAL_BINGO_BALLS; i++) {
      deck.push(i);
    }

    // High-entropy Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  /**
   * Maps any 1-75 integer to its corresponding B-I-N-G-O column letter.
   */
  public static getLetterForNumber(num: number): BingoColumnLetter {
    if (num >= BINGO_COLUMNS.B.min && num <= BINGO_COLUMNS.B.max) return 'B';
    if (num >= BINGO_COLUMNS.I.min && num <= BINGO_COLUMNS.I.max) return 'I';
    if (num >= BINGO_COLUMNS.N.min && num <= BINGO_COLUMNS.N.max) return 'N';
    if (num >= BINGO_COLUMNS.G.min && num <= BINGO_COLUMNS.G.max) return 'G';
    return 'O';
  }

  /**
   * Creates a structured CalledBall object.
   */
  public static createCalledBall(num: number, sequence: number): CalledBall {
    return {
      letter: this.getLetterForNumber(num),
      number: num,
      sequence,
      timestamp: new Date().toISOString(),
    };
  }
}
