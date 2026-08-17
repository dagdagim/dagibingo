import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, CalledBall } from '@bingo/shared';

type BingoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: BingoSocket | null = null;

  public connect(): BingoSocket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = localStorage.getItem('bingo_access_token');

    this.socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: {
        token: token || undefined,
      },
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to BINGO Arena Real-Time Socket Gateway');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket Gateway:', reason);
    });

    return this.socket;
  }

  public getSocket(): BingoSocket | null {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  public joinRoom(gameId: string, callback?: (res: { success: boolean; error?: string }) => void): void {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('room:join', gameId, callback);
    }
  }

  public leaveRoom(gameId: string): void {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('room:leave', gameId);
    }
  }

  public claimBingo(
    payload: { gameId: string; ticketId: string },
    callback?: (res: { success: boolean; isValid: boolean; message: string }) => void
  ): void {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('game:claim-bingo', payload, callback);
    }
  }

  public sendChatMessage(
    payload: { gameId: string; message: string },
    callback?: (res: { success: boolean; error?: string }) => void
  ): void {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('chat:send', payload, callback);
    }
  }

  public onNumberDrawn(callback: (ball: CalledBall) => void): () => void {
    const socket = this.getSocket();
    if (socket) {
      const handler = (data: { gameId: string; ball: CalledBall; totalCalled: number }) => {
        callback(data.ball);
      };
      socket.on('game:number-called', handler);
      return () => {
        socket.off('game:number-called', handler);
      };
    }
    return () => {};
  }

  public onChatMessage(callback: (msg: any) => void): () => void {
    const socket = this.getSocket();
    if (socket) {
      socket.on('chat:message', callback);
      return () => {
        socket.off('chat:message', callback);
      };
    }
    return () => {};
  }

  public onWinnerAnnounced(callback: (winner: any) => void): () => void {
    const socket = this.getSocket();
    if (socket) {
      socket.on('game:winner', callback);
      return () => {
        socket.off('game:winner', callback);
      };
    }
    return () => {};
  }

  public onRoundEnded(callback: (data: { gameId: string; nextRoundInSeconds: number; message: string }) => void): () => void {
    const socket = this.getSocket();
    if (socket) {
      socket.on('game:round-ended', callback);
      return () => {
        socket.off('game:round-ended', callback);
      };
    }
    return () => {};
  }

  public onRoundReset(callback: (data: { gameId: string; status: string }) => void): () => void {
    const socket = this.getSocket();
    if (socket) {
      socket.on('game:round-reset', callback);
      return () => {
        socket.off('game:round-reset', callback);
      };
    }
    return () => {};
  }

  public onGameStarted(callback: (data: { gameId: string; startTime: string }) => void): () => void {
    const socket = this.getSocket();
    if (socket) {
      socket.on('game:started', callback);
      return () => {
        socket.off('game:started', callback);
      };
    }
    return () => {};
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
