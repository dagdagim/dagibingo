import { KycStatus, UserRole } from './user.types';
import { GamePattern, GameSpeed, GameStatus } from './game.types';
import { TransactionStatus, TransactionType } from './wallet.types';

export interface AdminDashboardMetrics {
  activePlayersOnline: number;
  totalRegisteredUsers: number;
  liveGamesCount: number;
  gamesFinishedToday: number;
  demoDepositsVolume24h: number;
  demoWithdrawalsVolume24h: number;
  virtualPrizesDistributed24h: number;
  pendingKycCount: number;
  highRiskAlertsCount: number;
  userGrowth: { date: string; count: number }[];
  dailyGameVolume: { date: string; count: number; volume: number }[];
}

export interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  kycStatus: KycStatus;
  isActive: boolean;
  walletBalance: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AdminGameListItem {
  id: string;
  code: string;
  title: string;
  pattern: GamePattern;
  speed: GameSpeed;
  entryFee: number;
  prizePool: number;
  status: GameStatus;
  currentPlayers: number;
  maxPlayers: number;
  calledNumbersCount: number;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type BetOutcome = 'WON' | 'LOST' | 'ACTIVE' | 'CANCELLED';

export interface AdminBetRecord {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCode: string;
  gameStatus: GameStatus;
  pattern: GamePattern;
  userId: string;
  username: string;
  email: string;
  ticketsCount: number;
  betAmount: number;
  prizeWon: number;
  netPlayerProfit: number;
  houseRevenueImpact: number;
  outcome: BetOutcome;
  timestamp: string;
}

export interface AdminBetLedgerData {
  records: AdminBetRecord[];
  summary: {
    totalBetsCount: number;
    totalBetsVolume: number;
    totalPrizesPaid: number;
    netHouseProfit: number;
    totalPlayerWins: number;
    totalPlayerLosses: number;
    activeBetsCount: number;
  };
}

export interface FraudAlert {
  id: string;
  userId: string;
  username: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  detectedAt: string;
}
