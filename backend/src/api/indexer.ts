import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import { 
  getTransactionHistory, 
  getTransactionDetails,
  getIndexerStatus
} from '../services/indexer';
import { trackEvent } from '../services/analytics';
import { AnalyticsEventType } from '../types';

// Create router
const indexerRouter = Router();

/**
 * @swagger
 * /api/indexer/status:
 *   get:
 *     summary: Get indexer service status
 *     tags: [Indexer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indexer service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 networks:
 *                   type: object
 *                 lastProcessedBlocks:
 *                   type: object
 *       500:
 *         description: Server error
 */
indexerRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getIndexerStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/indexer/transactions/{address}:
 *   get:
 *     summary: Get transaction history for a wallet
 *     tags: [Indexer]
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
 *         name: chainId
 *         schema:
 *           type: integer
 *         description: Chain ID to filter by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Transaction history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
indexerRouter.get('/transactions/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    // Verify that the authenticated user is the same as the requested address
    if (!req.user || req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Get transaction history
    const transactions = await getTransactionHistory(address, chainId, limit, offset);
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.FEATURE_USED,
      {
        feature: 'transaction_history',
        chainId,
        count: transactions.length,
      },
      req.user.walletAddress
    );
    
    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/indexer/transaction/{txHash}:
 *   get:
 *     summary: Get transaction details
 *     tags: [Indexer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: txHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction hash
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
indexerRouter.get('/transaction/:txHash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const txHash = req.params.txHash;
    
    // Get transaction details
    const transaction = await getTransactionDetails(txHash);
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    // Verify that the authenticated user is the owner of this transaction
    if (!req.user || (req.user.walletAddress.toLowerCase() !== transaction.from.toLowerCase() && 
        req.user.walletAddress.toLowerCase() !== transaction.to.toLowerCase())) {
      throw new ApiError(403, 'Unauthorized: not your transaction');
    }
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.FEATURE_USED,
      {
        feature: 'transaction_details',
        chainId: transaction.chainId,
      },
      req.user.walletAddress
    );
    
    res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/indexer/sync/{address}:
 *   post:
 *     summary: Manually trigger indexing for a wallet
 *     tags: [Indexer]
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
 *         name: chainId
 *         schema:
 *           type: integer
 *         description: Chain ID to sync
 *     responses:
 *       200:
 *         description: Sync initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
indexerRouter.post('/sync/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address;
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
    
    // Verify that the authenticated user is the same as the requested address
    if (!req.user || req.user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // TODO: Implement manual sync
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.FEATURE_USED,
      {
        feature: 'manual_sync',
        chainId,
      },
      req.user.walletAddress
    );
    
    res.status(200).json({
      success: true,
      message: 'Sync initiated',
    });
  } catch (error) {
    next(error);
  }
});

export { indexerRouter };
