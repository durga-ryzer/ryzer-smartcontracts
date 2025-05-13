import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import { 
  getNotifications, 
  getUnreadNotificationCount,
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  createSystemNotification,
  getNotificationServiceStatus
} from '../services/notification';
import { trackEvent, AnalyticsEventType } from '../services/analytics';

// Create router
const notificationRouter = Router();

/**
 * @swagger
 * /api/notification/status:
 *   get:
 *     summary: Get notification service status
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 connectedWallets:
 *                   type: integer
 *                 totalConnections:
 *                   type: integer
 */
notificationRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getNotificationServiceStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notification/list/{address}:
 *   get:
 *     summary: Get notifications for a wallet
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only return unread notifications
 *     responses:
 *       200:
 *         description: Notifications list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 */
notificationRouter.get('/list/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    // Verify that the authenticated user is the same as the requested address
    if (req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Get notifications
    const notifications = await getNotifications(address, limit, offset, unreadOnly);
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.FEATURE_USED,
      {
        feature: 'view_notifications',
        unreadOnly,
      },
      address
    ).catch(error => {
      logger.error('Error tracking feature used event:', error);
    });
    
    res.status(200).json({
      notifications,
      total: notifications.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notification/count/{address}:
 *   get:
 *     summary: Get unread notification count for a wallet
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
notificationRouter.get('/count/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    
    // Verify that the authenticated user is the same as the requested address
    if (req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Get unread notification count
    const count = await getUnreadNotificationCount(address);
    
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notification/read/{notificationId}:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: string
 */
notificationRouter.post('/read/:notificationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = req.params.notificationId;
    
    // Mark notification as read
    await markNotificationAsRead(notificationId);
    
    res.status(200).json({
      success: true,
      id: notificationId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notification/read-all/{address}:
 *   post:
 *     summary: Mark all notifications as read for a wallet
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
notificationRouter.post('/read-all/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    
    // Verify that the authenticated user is the same as the requested address
    if (req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Mark all notifications as read
    await markAllNotificationsAsRead(address);
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.FEATURE_USED,
      {
        feature: 'mark_all_notifications_read',
      },
      address
    ).catch(error => {
      logger.error('Error tracking feature used event:', error);
    });
    
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notification/test/{address}:
 *   post:
 *     summary: Create a test notification for a wallet
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test notification created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
notificationRouter.post('/test/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    const { title, message } = req.body;
    
    // Verify that the authenticated user is the same as the requested address
    if (req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Validate request
    if (!title || !message) {
      throw new ApiError(400, 'Title and message are required');
    }
    
    // Create test notification
    await createSystemNotification(
      address,
      title,
      message,
      {
        test: true,
        timestamp: Date.now(),
      }
    );
    
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

export { notificationRouter };
