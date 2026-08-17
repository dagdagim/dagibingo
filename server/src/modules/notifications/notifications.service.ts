import mongoose from 'mongoose';
import { Notification } from '../../models/Notification';

export class NotificationsService {
  public async getUserNotifications(userId: string) {
    const notifications = await Notification.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });

    return {
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }

  public async markAsRead(userId: string, notificationId: string) {
    await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      { isRead: true }
    );
    return { success: true };
  }

  public async markAllAsRead(userId: string) {
    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}
