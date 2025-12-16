import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service.js';

/**
 * Notification Controller
 * 
 * Handles HTTP requests for push notification management.
 */

/**
 * Register a push notification subscription
 * POST /api/notifications/register
 */
export async function registerSubscription(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ 
        error: 'Invalid subscription data. Required: endpoint, keys.p256dh, keys.auth' 
      });
    }

    await notificationService.registerSubscription(userId, {
      endpoint,
      keys,
    });

    res.status(201).json({ 
      message: 'Push subscription registered successfully' 
    });
  } catch (error) {
    console.error('Error in registerSubscription:', error);
    res.status(500).json({ 
      error: 'Failed to register push subscription' 
    });
  }
}

/**
 * Unregister a push notification subscription
 * DELETE /api/notifications/register
 */
export async function unregisterSubscription(req: Request, res: Response) {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ 
        error: 'Endpoint is required' 
      });
    }

    await notificationService.unregisterSubscription(endpoint);

    res.json({ 
      message: 'Push subscription unregistered successfully' 
    });
  } catch (error) {
    console.error('Error in unregisterSubscription:', error);
    res.status(500).json({ 
      error: 'Failed to unregister push subscription' 
    });
  }
}

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
export async function getPreferences(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await notificationService.getPreferences(userId);

    res.json(preferences);
  } catch (error) {
    console.error('Error in getPreferences:', error);
    res.status(500).json({ 
      error: 'Failed to get notification preferences' 
    });
  }
}

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
export async function updatePreferences(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      highPriorityThreads,
      riskDeals,
      calendarReminders,
      taskReminders,
      newThreads,
    } = req.body;

    const preferences = await notificationService.updatePreferences(userId, {
      highPriorityThreads,
      riskDeals,
      calendarReminders,
      taskReminders,
      newThreads,
    });

    res.json(preferences);
  } catch (error) {
    console.error('Error in updatePreferences:', error);
    res.status(500).json({ 
      error: 'Failed to update notification preferences' 
    });
  }
}

/**
 * Get VAPID public key for client-side subscription
 * GET /api/notifications/vapid-public-key
 */
export async function getVapidPublicKey(req: Request, res: Response) {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(500).json({ 
        error: 'VAPID keys not configured' 
      });
    }

    res.json({ publicKey });
  } catch (error) {
    console.error('Error in getVapidPublicKey:', error);
    res.status(500).json({ 
      error: 'Failed to get VAPID public key' 
    });
  }
}
