export const BINGO_COLUMNS = {
  B: { min: 1, max: 15, name: 'B' },
  I: { min: 16, max: 30, name: 'I' },
  N: { min: 31, max: 45, name: 'N' },
  G: { min: 46, max: 60, name: 'G' },
  O: { min: 61, max: 75, name: 'O' },
} as const;

export type BingoColumnLetter = keyof typeof BINGO_COLUMNS;

export const BINGO_LETTERS: BingoColumnLetter[] = ['B', 'I', 'N', 'G', 'O'];

export const TOTAL_BINGO_BALLS = 75;

export const FREE_SPACE_VALUE = 0;

export const NUMBER_WORDS: Record<number, string> = {
  1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE',
  6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN',
  11: 'ELEVEN', 12: 'TWELVE', 13: 'THIRTEEN', 14: 'FOURTEEN', 15: 'FIFTEEN',
  16: 'SIXTEEN', 17: 'SEVENTEEN', 18: 'EIGHTEEN', 19: 'NINETEEN', 20: 'TWENTY',
  21: 'TWENTY ONE', 22: 'TWENTY TWO', 23: 'TWENTY THREE', 24: 'TWENTY FOUR', 25: 'TWENTY FIVE',
  26: 'TWENTY SIX', 27: 'TWENTY SEVEN', 28: 'TWENTY EIGHT', 29: 'TWENTY NINE', 30: 'THIRTY',
  31: 'THIRTY ONE', 32: 'THIRTY TWO', 33: 'THIRTY THREE', 34: 'THIRTY FOUR', 35: 'THIRTY FIVE',
  36: 'THIRTY SIX', 37: 'THIRTY SEVEN', 38: 'THIRTY EIGHT', 39: 'THIRTY NINE', 40: 'FORTY',
  41: 'FORTY ONE', 42: 'FORTY TWO', 43: 'FORTY THREE', 44: 'FORTY FOUR', 45: 'FORTY FIVE',
  46: 'FORTY SIX', 47: 'FORTY SEVEN', 48: 'FORTY EIGHT', 49: 'FORTY NINE', 50: 'FIFTY',
  51: 'FIFTY ONE', 52: 'FIFTY TWO', 53: 'FIFTY THREE', 54: 'FIFTY FOUR', 55: 'FIFTY FIVE',
  56: 'FIFTY SIX', 57: 'FIFTY SEVEN', 58: 'FIFTY EIGHT', 59: 'FIFTY NINE', 60: 'SIXTY',
  61: 'SIXTY ONE', 62: 'SIXTY TWO', 63: 'SIXTY THREE', 64: 'SIXTY FOUR', 65: 'SIXTY FIVE',
  66: 'SIXTY SIX', 67: 'SIXTY SEVEN', 68: 'SIXTY EIGHT', 69: 'SIXTY NINE', 70: 'SEVENTY',
  71: 'SEVENTY ONE', 72: 'SEVENTY TWO', 73: 'SEVENTY THREE', 74: 'SEVENTY FOUR', 75: 'SEVENTY FIVE'
};

export const GAME_SPEEDS = {
  RELAXED: { intervalSeconds: 6, label: 'Relaxed (6s)' },
  STANDARD: { intervalSeconds: 4.5, label: 'Standard (4.5s)' },
  TURBO: { intervalSeconds: 3, label: 'Turbo (3s)' },
} as const;

export const DEFAULT_TICKET_PRICE = 50; // ETB Demo
export const MAX_TICKETS_PER_PLAYER = 4;
