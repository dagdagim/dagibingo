import { User } from '../../models/User';
import { KycRecord } from '../../models/KycRecord';
import { AuditLog } from '../../models/AuditLog';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { UserProfile, ResponsibleGamingLimits } from '../../shared';

export class UsersService {
  public async getProfile(userId: string): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

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

  public async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.phone) user.phone = data.phone;
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;

    await user.save();
    return this.getProfile(userId);
  }

  public async updateResponsibleGaming(userId: string, limits: ResponsibleGamingLimits): Promise<ResponsibleGamingLimits> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.responsibleGaming = {
      ...user.responsibleGaming,
      ...limits,
    };

    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorName: user.username,
      action: 'UPDATE_RESPONSIBLE_GAMING',
      resource: 'USER',
      resourceId: user._id.toString(),
      metadata: { limits },
    });

    return user.responsibleGaming;
  }

  public async submitKyc(userId: string, data: { documentType: string; documentNumber: string }): Promise<{ success: boolean; message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const record = await KycRecord.create({
      userId: user._id,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      status: 'PENDING',
    });

    user.kycStatus = 'PENDING';
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorName: user.username,
      action: 'KYC_SUBMITTED',
      resource: 'KYC',
      resourceId: record._id.toString(),
    });

    return {
      success: true,
      message: 'KYC verification documents submitted successfully and currently pending review',
    };
  }
}
