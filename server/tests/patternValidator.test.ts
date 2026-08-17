import { PatternValidator } from '../src/game-engine/PatternValidator';
import { TicketGrid } from '@bingo/shared';

describe('PatternValidator Algorithm', () => {
  const sampleGrid: TicketGrid = [
    [7, 18, 34, 52, 68],
    [2, 24, 31, 47, 73],
    [11, 16, 0, 55, 70], // Center 0 is FREE
    [9, 21, 38, 46, 64],
    [4, 29, 42, 58, 75],
  ];

  it('should validate a winning row in CLASSIC pattern', () => {
    // Row 0 complete: [7, 18, 34, 52, 68]
    const drawnNumbers = [7, 18, 34, 52, 68, 1, 2, 3];
    const result = PatternValidator.validate(sampleGrid, drawnNumbers, 'CLASSIC');

    expect(result.isValid).toBe(true);
    expect(result.patternMatched).toBe('Row 1');
  });

  it('should validate a winning column in CLASSIC pattern', () => {
    // Column 0 complete: [7, 2, 11, 9, 4]
    const drawnNumbers = [7, 2, 11, 9, 4];
    const result = PatternValidator.validate(sampleGrid, drawnNumbers, 'CLASSIC');

    expect(result.isValid).toBe(true);
    expect(result.patternMatched).toBe('Column 1');
  });

  it('should validate a diagonal with FREE space in CLASSIC pattern', () => {
    // Main Diagonal: [7, 24, FREE, 46, 75]
    const drawnNumbers = [7, 24, 46, 75];
    const result = PatternValidator.validate(sampleGrid, drawnNumbers, 'CLASSIC');

    expect(result.isValid).toBe(true);
    expect(result.patternMatched).toBe('Main Diagonal');
  });

  it('should reject claim if required numbers are missing', () => {
    // Only 3 numbers drawn
    const drawnNumbers = [7, 18, 34];
    const result = PatternValidator.validate(sampleGrid, drawnNumbers, 'CLASSIC');

    expect(result.isValid).toBe(false);
  });

  it('should validate Four Corners pattern correctly', () => {
    // Four Corners: [7, 68, 4, 75]
    const drawnNumbers = [7, 68, 4, 75];
    const result = PatternValidator.validate(sampleGrid, drawnNumbers, 'FOUR_CORNERS');

    expect(result.isValid).toBe(true);
    expect(result.patternMatched).toBe('Four Corners');
  });
});
