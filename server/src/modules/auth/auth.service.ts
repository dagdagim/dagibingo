import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../../models/User';
import { Wallet } from '../../models/Wallet';
import { AuditLog } from '../../models/AuditLog';
import { Notification } from '../../models/Notification';
import { env } from '../../config/environment';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../utils/errors';
import { RegisterInput, LoginInput, AuthResponse, UserProfile, AuthTokens } from '../../shared';

export class AuthService {
  public async register(input: RegisterInput, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const { firstName, lastName, username, email, password, phone, country, dateOfBirth } = input;

    // Check existing username or email
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new ConflictError('An account with this email address already exists');
      }
      throw new ConflictError('This username is already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      passwordHash,
      country,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      role: 'USER',
      kycStatus: 'NOT_STARTED',
      isEmailVerified: true, // Auto-verified in demo
      isPhoneVerified: false,
      isActive: true,
      lastLoginAt: new Date(),
    });

    // Create starting wallet with 1,000 ETB Demo credits
    await Wallet.create({
      userId: user._id,
      availableBalance: 1000,
      lockedBalance: 0,
      bonusBalance: 0,
      currency: 'ETB',
      isDemo: true,
    });

    // Welcome notification
    await Notification.create({
      userId: user._id,
      type: 'WELCOME',
      title: 'Welcome to Bingo Arena!',
      message: 'Your account is ready with 1,000 ETB Demo starting credits. Enjoy the games!',
      link: '/lobby',
    });

    // Audit log
    await AuditLog.create({
      actorId: user._id,
      actorName: user.username,
      action: 'USER_REGISTERED',
      resource: 'USER',
      resourceId: user._id.toString(),
      ipAddress: ip,
      userAgent,
    });

    const tokens = this.generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await user.save();

    return {
      user: this.mapUserToProfile(user),
      tokens,
    };
  }

  public async login(input: LoginInput, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const { emailOrUsername, password } = input;
    const identifier = emailOrUsername.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is suspended. Please contact support.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    const tokens = this.generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorName: user.username,
      action: 'USER_LOGIN',
      resource: 'USER',
      resourceId: user._id.toString(),
      ipAddress: ip,
      userAgent,
    });

    return {
      user: this.mapUserToProfile(user),
      tokens,
    };
  }

  public async refreshToken(token: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive || !user.refreshTokenHash) {
        throw new UnauthorizedError('Invalid refresh session');
      }

      const isMatch = await bcrypt.compare(token, user.refreshTokenHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid refresh session');
      }

      const tokens = this.generateTokens(user);
      user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
      await user.save();

      return tokens;
    } catch {
      throw new UnauthorizedError('Session expired, please sign in again');
    }
  }

  public async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
  }

  public generateTokens(user: IUser): AuthTokens {
    const payload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign({ userId: user._id.toString() }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  public mapUserToProfile(user: IUser): UserProfile {
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      kycStatus: user.kycStatus,
      country: user.country,
      dateOfBirth: user.dateOfBirth?.toISOString(),
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isActive: user.isActive,
      stats: user.stats || {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        totalWinnings: 0,
        highestWin: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
      responsibleGaming: user.responsibleGaming || {},
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
