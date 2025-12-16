import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

/**
 * Notification Routes
 * 
 * All routes require authentication.
 */

// Get VAPID public key (public endpoint for initial subscription setup)
router.get('/vapid-public-key', notificationController.getVapidPublicKey);

// Register push subscription
router.post('/register', authenticateToken, notificationController.registerSubscription);

// Unregister push subscription
router.delete('/register', authenticateToken, notificationController.unregisterSubscription);

// Get notification preferences
router.get('/preferences', authenticateToken, notificationController.getPreferences);

// Update notification preferences
router.put('/preferences', authenticateToken, notificationController.updatePreferences);

export default router;
