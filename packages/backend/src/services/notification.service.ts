import webpush from 'web-push';
import prisma from '../config/database.js';

/**
 * Notification Service
 * 
 * Handles push notification delivery to subscribed clients.
 * Supports web push notifications for PWA clients.
 */

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

class NotificationService {
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidSubject: string;

  constructor() {
    // Initialize VAPID keys from environment variables
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    this.vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@zena.ai';

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
    }
  }

  /**
   * Register a new push subscription for a user
   */
  async registerSubscription(
    userId: string,
    subscription: PushSubscriptionData
  ): Promise<void> {
    try {
      await prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          keys: subscription.keys,
          updatedAt: new Date(),
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
      });
    } catch (error) {
      console.error('Error registering push subscription:', error);
      throw new Error('Failed to register push subscription');
    }
  }

  /**
   * Unregister a push subscription
   */
  async unregisterSubscription(endpoint: string): Promise<void> {
    try {
      await prisma.pushSubscription.delete({
        where: { endpoint },
      });
    } catch (error) {
      console.error('Error unregistering push subscription:', error);
      throw new Error('Failed to unregister push subscription');
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string) {
    try {
      let preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await prisma.notificationPreferences.create({
          data: {
            userId,
            highPriorityThreads: true,
            riskDeals: true,
            calendarReminders: true,
            taskReminders: true,
            newThreads: false,
          },
        });
      }

      return preferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw new Error('Failed to get notification preferences');
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<{
      highPriorityThreads: boolean;
      riskDeals: boolean;
      calendarReminders: boolean;
      taskReminders: boolean;
      newThreads: boolean;
    }>
  ) {
    try {
      return await prisma.notificationPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences,
        },
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Send a push notification to a user
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // Get user's push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
      });

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
      }

      // Send notification to all subscriptions
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
        } catch (error: any) {
          // If subscription is no longer valid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid subscription: ${sub.endpoint}`);
            await this.unregisterSubscription(sub.endpoint);
          } else {
            console.error(`Error sending notification to ${sub.endpoint}:`, error);
          }
        }
      });

      await Promise.all(sendPromises);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw new Error('Failed to send push notification');
    }
  }

  /**
   * Send notification for high-priority thread
   */
  async notifyHighPriorityThread(
    userId: string,
    threadId: string,
    subject: string
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.highPriorityThreads) {
      return;
    }

    await this.sendNotification(userId, {
      title: 'High Priority Thread',
      body: `Action required: ${subject}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `thread-${threadId}`,
      data: {
        type: 'high_priority_thread',
        threadId,
      },
      requireInteraction: true,
    });
  }

  /**
   * Send notification for at-risk deal
   */
  async notifyRiskDeal(
    userId: string,
    dealId: string,
    propertyAddress: string,
    riskReason: string
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.riskDeals) {
      return;
    }

    await this.sendNotification(userId, {
      title: 'Deal At Risk',
      body: `${propertyAddress}: ${riskReason}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `deal-risk-${dealId}`,
      data: {
        type: 'risk_deal',
        dealId,
      },
      requireInteraction: true,
    });
  }

  /**
   * Send notification for calendar event reminder
   */
  async notifyCalendarReminder(
    userId: string,
    eventId: string,
    eventTitle: string,
    eventTime: Date
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.calendarReminders) {
      return;
    }

    const timeStr = eventTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    await this.sendNotification(userId, {
      title: 'Upcoming Event',
      body: `${eventTitle} at ${timeStr}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `calendar-${eventId}`,
      data: {
        type: 'calendar_reminder',
        eventId,
      },
    });
  }

  /**
   * Send notification for task reminder
   */
  async notifyTaskReminder(
    userId: string,
    taskId: string,
    taskLabel: string,
    dueDate: Date
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.taskReminders) {
      return;
    }

    const dueDateStr = dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    await this.sendNotification(userId, {
      title: 'Task Due',
      body: `${taskLabel} - Due ${dueDateStr}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `task-${taskId}`,
      data: {
        type: 'task_reminder',
        taskId,
      },
    });
  }

  /**
   * Send notification for new thread
   */
  async notifyNewThread(
    userId: string,
    threadId: string,
    subject: string,
    sender: string
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.newThreads) {
      return;
    }

    await this.sendNotification(userId, {
      title: 'New Thread',
      body: `${sender}: ${subject}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `thread-new-${threadId}`,
      data: {
        type: 'new_thread',
        threadId,
      },
    });
  }

  /**
   * Generate VAPID keys (for initial setup)
   */
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }
}

export const notificationService = new NotificationService();
