import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import { 
  trackEvent, 
  getWalletStats, 
  getAnalyticsServiceStatus,
  AnalyticsEventType
} from '../services/analytics';
import { adminLimiter } from '../middlewares/rateLimit';

// Create router
const analyticsRouter = Router();

/**
 * @swagger
 * /api/analytics/status:
 *   get:
 *     summary: Get analytics service status
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 activeSessions:
 *                   type: integer
 *                 eventsToday:
 *                   type: integer
 */
analyticsRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getAnalyticsServiceStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/track:
 *   post:
 *     summary: Track an analytics event
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - walletAddress
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [WALLET_LOADED, TRANSACTION_SENT, FEATURE_USED, ERROR, SESSION_START, SESSION_END]
 *               walletAddress:
 *                 type: string
 *               data:
 *                 type: object
 *               sessionId:
 *                 type: string
 *               chainId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Event tracked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 eventId:
 *                   type: string
 */
analyticsRouter.post('/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, walletAddress, data, sessionId, chainId } = req.body;
    
    // Validate request
    if (!type || !walletAddress) {
      throw new ApiError(400, 'Type and wallet address are required');
    }
    
    // Verify that the authenticated user is the same as the requested address
    if (!req.user || req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Validate event type
    if (!Object.values(AnalyticsEventType).includes(type)) {
      throw new ApiError(400, 'Invalid event type');
    }
    
    // Track event
    const eventId = await trackEvent(
      type,
      data,
      walletAddress,
      sessionId,
      chainId,
      {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }
    );
    
    res.status(200).json({
      success: true,
      eventId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/stats/{address}:
 *   get:
 *     summary: Get wallet usage statistics
 *     tags: [Analytics]
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for stats (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for stats (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Wallet usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 */
analyticsRouter.get('/stats/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // Verify that the authenticated user is the same as the requested address
    if (!req.user || req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Get wallet stats
    const stats = await getWalletStats(address, startDate, endDate);
    
    res.status(200).json({
      stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/admin/stats:
 *   get:
 *     summary: Get global analytics statistics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for stats (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for stats (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Global analytics statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 */
analyticsRouter.get('/admin/stats', adminLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      throw new ApiError(403, 'Unauthorized: admin access required');
    }
    
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // This is a placeholder for admin-level analytics
    // In a real implementation, you would query aggregate statistics across all users
    const stats = {
      activeWallets: 0,
      totalTransactions: 0,
      newUsers: 0,
      activeUsers: 0,
      totalVolume: 0,
      period: {
        start: startDate || 'all-time',
        end: endDate || 'now',
      },
      networks: {},
      timestamp: Date.now(),
    };
    
    res.status(200).json({
      stats,
    });
  } catch (error) {
    next(error);
  }
});

export { analyticsRouter };
