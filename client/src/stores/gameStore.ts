import { create } from 'zustand';
import { CalledBall, GameRoomDetails, BingoTicketDTO } from '@bingo/shared';

export interface ChatMessage {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface WinnerState {
  winnerId: string;
  winnerName: string;
  prize: number;
  pattern: string;
  winningTicketId: string;
}

interface GameState {
  game: GameRoomDetails | null;
  tickets: BingoTicketDTO[];
  currentBall: CalledBall | null;
  calledBalls: CalledBall[];
  drawnNumbersSet: Set<number>;
  markedMap: Record<string, Set<string>>; // ticketId -> Set of "row,col"
  autoDaub: boolean;
  voiceEnabled: boolean;
  soundVolume: number;
  voiceRate: number;
  isClaiming: boolean;
  claimResult: { isValid: boolean; message: string } | null;
  winner: WinnerState | null;
  chatMessages: ChatMessage[];
  onlinePlayersCount: number;

  setGame: (game: GameRoomDetails | null) => void;
  setTickets: (tickets: BingoTicketDTO[]) => void;
  setCurrentBall: (ball: CalledBall) => void;
  addCalledBall: (ball: CalledBall) => void;
  toggleMark: (ticketId: string, row: number, col: number) => void;
  setAutoDaub: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setVoiceRate: (rate: number) => void;
  setIsClaiming: (isClaiming: boolean) => void;
  setClaimResult: (result: { isValid: boolean; message: string } | null) => void;
  setWinner: (winner: WinnerState | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setOnlinePlayersCount: (count: number) => void;
  resetRoomState: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  tickets: [],
  currentBall: null,
  calledBalls: [],
  drawnNumbersSet: new Set<number>(),
  markedMap: {},
  autoDaub: true,
  voiceEnabled: true,
  soundVolume: 0.8,
  voiceRate: 1.0,
  isClaiming: false,
  claimResult: null,
  winner: null,
  chatMessages: [],
  onlinePlayersCount: 1,

  setGame: (game) => {
    if (!game) {
      set({ game: null });
      return;
    }
    const drawnSet = new Set<number>(game.calledBalls.map((b) => b.number));
    set({
      game,
      calledBalls: game.calledBalls || [],
      currentBall: game.currentBall || (game.calledBalls.length > 0 ? game.calledBalls[game.calledBalls.length - 1] : null),
      drawnNumbersSet: drawnSet,
      onlinePlayersCount: game.currentPlayers || 1,
    });
  },

  setTickets: (tickets) => {
    const markedMap: Record<string, Set<string>> = {};
    tickets.forEach((t) => {
      markedMap[t.id] = new Set<string>();
      // Free space [2,2] is always marked
      markedMap[t.id].add('2,2');

      // If autoDaub is on, mark all numbers that have already been called
      const drawn = get().drawnNumbersSet;
      t.grid.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val !== 0 && drawn.has(val)) {
            markedMap[t.id].add(`${r},${c}`);
          }
        });
      });
    });

    set({ tickets, markedMap });
  },

  setCurrentBall: (ball) => set({ currentBall: ball }),

  addCalledBall: (ball) => {
    const { drawnNumbersSet, calledBalls, tickets, markedMap, autoDaub } = get();
    const newDrawnSet = new Set(drawnNumbersSet).add(ball.number);
    const newCalledBalls = [...calledBalls, ball];

    // If auto-daub is enabled, automatically mark matching numbers on user's tickets
    const updatedMarkedMap = { ...markedMap };
    if (autoDaub) {
      tickets.forEach((t) => {
        if (!updatedMarkedMap[t.id]) {
          updatedMarkedMap[t.id] = new Set(['2,2']);
        }
        t.grid.forEach((row, r) => {
          row.forEach((val, c) => {
            if (val === ball.number) {
              updatedMarkedMap[t.id].add(`${r},${c}`);
            }
          });
        });
      });
    }

    set({
      currentBall: ball,
      calledBalls: newCalledBalls,
      drawnNumbersSet: newDrawnSet,
      markedMap: updatedMarkedMap,
    });
  },

  toggleMark: (ticketId, row, col) => {
    if (row === 2 && col === 2) return; // Free space cannot be unmarked

    const { markedMap } = get();
    const key = `${row},${col}`;
    const ticketMarks = new Set(markedMap[ticketId] || ['2,2']);

    if (ticketMarks.has(key)) {
      ticketMarks.delete(key);
    } else {
      ticketMarks.add(key);
    }

    set({
      markedMap: {
        ...markedMap,
        [ticketId]: ticketMarks,
      },
    });
  },

  setAutoDaub: (enabled) => {
    set({ autoDaub: enabled });
    // If turned on, auto-mark all past called numbers
    if (enabled) {
      const { tickets, drawnNumbersSet, markedMap } = get();
      const updatedMarkedMap = { ...markedMap };
      tickets.forEach((t) => {
        if (!updatedMarkedMap[t.id]) updatedMarkedMap[t.id] = new Set(['2,2']);
        t.grid.forEach((row, r) => {
          row.forEach((val, c) => {
            if (val === 0 || drawnNumbersSet.has(val)) {
              updatedMarkedMap[t.id].add(`${r},${c}`);
            }
          });
        });
      });
      set({ markedMap: updatedMarkedMap });
    }
  },

  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
  setSoundVolume: (volume) => set({ soundVolume: volume }),
  setVoiceRate: (rate) => set({ voiceRate: rate }),
  setIsClaiming: (isClaiming) => set({ isClaiming }),
  setClaimResult: (claimResult) => set({ claimResult }),
  setWinner: (winner) => set({ winner }),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages.slice(-50), msg] })),
  setOnlinePlayersCount: (count) => set({ onlinePlayersCount: count }),

  resetRoomState: () =>
    set({
      game: null,
      tickets: [],
      currentBall: null,
      calledBalls: [],
      drawnNumbersSet: new Set(),
      markedMap: {},
      winner: null,
      claimResult: null,
      chatMessages: [],
    }),
}));
