import { RNGService } from '../src/game-engine/RNGService';
import { TOTAL_BINGO_BALLS } from '@bingo/shared';

describe('RNGService Non-Repeating Deck Generation', () => {
  it('should generate exactly 75 balls', () => {
    const deck = RNGService.generateShuffledBallDeck();
    expect(deck.length).toBe(TOTAL_BINGO_BALLS);
  });

  it('should contain all numbers from 1 to 75 with no duplicates', () => {
    const deck = RNGService.generateShuffledBallDeck();
    const set = new Set(deck);

    expect(set.size).toBe(75);

    for (let i = 1; i <= 75; i++) {
      expect(set.has(i)).toBe(true);
    }
  });

  it('should correctly map column letters for all ranges', () => {
    expect(RNGService.getLetterForNumber(1)).toBe('B');
    expect(RNGService.getLetterForNumber(15)).toBe('B');
    expect(RNGService.getLetterForNumber(16)).toBe('I');
    expect(RNGService.getLetterForNumber(30)).toBe('I');
    expect(RNGService.getLetterForNumber(31)).toBe('N');
    expect(RNGService.getLetterForNumber(45)).toBe('N');
    expect(RNGService.getLetterForNumber(46)).toBe('G');
    expect(RNGService.getLetterForNumber(60)).toBe('G');
    expect(RNGService.getLetterForNumber(61)).toBe('O');
    expect(RNGService.getLetterForNumber(75)).toBe('O');
  });
});
