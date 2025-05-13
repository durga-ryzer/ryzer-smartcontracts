import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import relayerService from '../services/relayer';
import { trackEvent, AnalyticsEventType } from '../services/analytics';
import { createTransactionNotification } from '../services/notification';
import { sensitiveOperationLimiter } from '../middlewares/rateLimit';

// Create router
const relayerRouter = Router();

/**
 * @swagger
 * /api/relayer/status:
 *   get:
 *     summary: Get relayer service status
 *     tags: [Relayer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relayer service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 networks:
 *                   type: object
 */
relayerRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = relayerService.getRelayerStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/relayer/gas-price/{chainId}:
 *   get:
 *     summary: Get current gas price for a network
 *     tags: [Relayer]
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chain ID
 *     responses:
 *       200:
 *         description: Gas price in wei
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gasPrice:
 *                   type: string
 *                 chainId:
 *                   type: integer
 */
relayerRouter.get('/gas-price/:chainId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chainId = parseInt(req.params.chainId);
    
    if (isNaN(chainId)) {
      throw new ApiError(400, 'Invalid chain ID');
    }
    
    const gasPrice = await relayerService.getGasPrice(chainId);
    
    res.status(200).json({
      gasPrice,
      chainId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/relayer/estimate-gas:
 *   post:
 *     summary: Estimate gas for a transaction
 *     tags: [Relayer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chainId
 *               - from
 *               - to
 *               - data
 *             properties:
 *               chainId:
 *                 type: integer
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *               data:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estimated gas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gasEstimate:
 *                   type: string
 *                 chainId:
 *                   type: integer
 */
relayerRouter.post('/estimate-gas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chainId, from, to, data, value } = req.body;
    
    // Validate request
    if (!chainId || !from || !to || !data) {
      throw new ApiError(400, 'Missing required parameters');
    }
    
    // Estimate gas
    const gasEstimate = await relayerService.estimateGas(chainId, from, to, data, value);
    
    res.status(200).json({
      gasEstimate,
      chainId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/relayer/send-gasless-tx:
 *   post:
 *     summary: Send a gasless transaction
 *     tags: [Relayer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chainId
 *               - userAddress
 *               - to
 *               - data
 *             properties:
 *               chainId:
 *                 type: integer
 *               userAddress:
 *                 type: string
 *               to:
 *                 type: string
 *               data:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction hash
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 txHash:
 *                   type: string
 *                 chainId:
 *                   type: integer
 */
relayerRouter.post('/send-gasless-tx', sensitiveOperationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chainId, userAddress, to, data, value } = req.body;
    
    // Validate request
    if (!chainId || !userAddress || !to || !data) {
      throw new ApiError(400, 'Missing required parameters');
    }
    
    // Verify that the authenticated user is the same as the userAddress
    if (!req.user || req.user.walletAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Send gasless transaction
    const txHash = await relayerService.sendGaslessTransaction(chainId, userAddress, to, data, value);
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.TRANSACTION_SENT,
      {
        to,
        value,
        gasless: true,
        txHash,
      },
      userAddress,
      undefined,
      chainId
    ).catch(error => {
      logger.error('Error tracking transaction event:', error);
    });
    
    // Create notification
    await createTransactionNotification(
      userAddress,
      txHash,
      'sent',
      chainId,
      {
        to,
        value: value || '0',
        message: 'Gasless transaction sent'
      }
    );
    
    res.status(200).json({
      txHash,
      chainId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/relayer/send-meta-tx:
 *   post:
 *     summary: Send a meta-transaction
 *     tags: [Relayer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chainId
 *               - userAddress
 *               - signature
 *               - to
 *               - data
 *               - nonce
 *             properties:
 *               chainId:
 *                 type: integer
 *               userAddress:
 *                 type: string
 *               signature:
 *                 type: string
 *               to:
 *                 type: string
 *               data:
 *                 type: string
 *               nonce:
 *                 type: integer
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction hash
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 txHash:
 *                   type: string
 *                 chainId:
 *                   type: integer
 */
relayerRouter.post('/send-meta-tx', sensitiveOperationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chainId, userAddress, signature, to, data, nonce, value } = req.body;
    
    // Validate request
    if (!chainId || !userAddress || !signature || !to || !data || nonce === undefined) {
      throw new ApiError(400, 'Missing required parameters');
    }
    
    // Verify that the authenticated user is the same as the userAddress
    if (!req.user || req.user.walletAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new ApiError(403, 'Unauthorized: wallet address mismatch');
    }
    
    // Send meta-transaction
    const txHash = await relayerService.sendMetaTransaction(chainId, userAddress, to, data, value, signature);
    
    // Track analytics event
    trackEvent(
      AnalyticsEventType.TRANSACTION_SENT,
      {
        to,
        value,
        meta: true,
        txHash,
      },
      userAddress,
      undefined,
      chainId
    ).catch(error => {
      logger.error('Error tracking transaction event:', error);
    });
    
    // Create notification
    await createTransactionNotification(
      userAddress,
      txHash,
      'sent',
      chainId,
      {
        to,
        value: value || '0',
        message: 'Meta-transaction sent'
      }
    );
    
    res.status(200).json({
      txHash,
      chainId,
    });
  } catch (error) {
    next(error);
  }
});

export default relayerRouter;
