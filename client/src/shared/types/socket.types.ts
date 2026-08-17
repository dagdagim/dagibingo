import { CalledBall, GameRoomDetails, GameRoomSummary, GameStatus, TicketGrid } from './game.types';

export interface ServerToClientEvents {
  // Room lifecycle
  'room:joined': (data: { gameId: string; userCount: number }) => void;
  'room:left': (data: { gameId: string; userCount: number }) => void;
  'game:starting': (data: { gameId: string; countdownSeconds: number }) => void;
  'game:started': (data: { gameId: string; startTime: string }) => void;
  'game:state': (data: GameRoomDetails) => void;
  'game:number-called': (data: { gameId: string; ball: CalledBall; totalCalled: number }) => void;
  'game:player-joined': (data: { gameId: string; userId: string; username: string; currentPlayers: number }) => void;
  'game:player-left': (data: { gameId: string; userId: string; username: string; currentPlayers: number }) => void;
  'game:bingo-claim-received': (data: { gameId: string; userId: string; username: string }) => void;
  'game:winner': (data: {
    gameId: string;
    winnerId: string;
    winnerName: string;
    prize: number;
    pattern: string;
    winningTicketId: string;
  }) => void;
  'game:finished': (data: { gameId: string; summary: GameRoomSummary }) => void;
  'game:round-ended': (data: { gameId: string; nextRoundInSeconds: number; message: string }) => void;
  'game:round-reset': (data: { gameId: string; status: GameStatus }) => void;
  'game:cancelled': (data: { gameId: string; reason: string }) => void;

  // Live Chat
  'chat:message': (data: {
    id: string;
    gameId: string;
    userId: string;
    username: string;
    message: string;
    timestamp: string;
    isSystem?: boolean;
  }) => void;

  // Direct Notifications
  'notification:new': (data: {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
  }) => void;
}

export interface ClientToServerEvents {
  'room:join': (gameId: string, callback?: (response: { success: boolean; error?: string }) => void) => void;
  'room:leave': (gameId: string) => void;
  'game:claim-bingo': (
    payload: { gameId: string; ticketId: string },
    callback?: (response: { success: boolean; isValid: boolean; message: string }) => void
  ) => void;
  'chat:send': (
    payload: { gameId: string; message: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
}
