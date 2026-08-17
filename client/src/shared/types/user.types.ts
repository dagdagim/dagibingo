export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';

export type KycStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface ResponsibleGamingLimits {
  dailyDepositLimit?: number;
  weeklyDepositLimit?: number;
  monthlyDepositLimit?: number;
  sessionTimeLimitMinutes?: number;
  coolingOffUntil?: string | null;
  selfExcludedUntil?: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  kycStatus: KycStatus;
  country: string;
  dateOfBirth?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalWinnings: number;
    highestWin: number;
    currentStreak: number;
    bestStreak: number;
  };
  responsibleGaming: ResponsibleGamingLimits;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}
