import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import { verifySignature } from '../utils/crypto';
import { generateToken } from '../middlewares/auth';
import { getDatabase } from '../config/database';
import { trackEvent, AnalyticsEventType } from '../services/analytics';
import { standardLimiter } from '../middlewares/rateLimit';

// Create router
const authRouter = Router();

/**
 * @swagger
 * /api/auth/nonce/{address}:
 *   get:
 *     summary: Get a nonce for wallet authentication
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *     responses:
 *       200:
 *         description: Nonce for signing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nonce:
 *                   type: string
 *                 message:
 *                   type: string
 */
authRouter.get('/nonce/:address', standardLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address.toLowerCase();
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new ApiError(400, 'Invalid wallet address');
    }
    
    const db = getDatabase();
    
    // Check if user exists
    let user = await db.get('users', address);
    
    // Generate a new nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const timestamp = Date.now();
    const message = `Sign this message to authenticate with Ryzer Wallet. Nonce: ${nonce}. Timestamp: ${timestamp}`;
    
    if (user) {
      // Update existing user with new nonce
      user.nonce = nonce;
      user.nonceTimestamp = timestamp;
      await db.put('users', user);
    } else {
      // Create new user
      user = {
        address,
        nonce,
        nonceTimestamp: timestamp,
        createdAt: timestamp,
        lastLogin: null,
      };
      await db.add('users', user);
    }
    
    res.status(200).json({
      nonce,
      message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate with wallet signature
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - signature
 *             properties:
 *               address:
 *                 type: string
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 */
authRouter.post('/login', standardLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address, signature } = req.body;
    
    if (!address || !signature) {
      throw new ApiError(400, 'Address and signature are required');
    }
    
    const normalizedAddress = address.toLowerCase();
    const db = getDatabase();
    
    // Get user from database
    const user = await db.get('users', normalizedAddress);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Verify the signature
    const message = `Sign this message to authenticate with Ryzer Wallet. Nonce: ${user.nonce}. Timestamp: ${user.nonceTimestamp}`;
    const isValid = await verifySignature(normalizedAddress, signature, message);
    
    if (!isValid) {
      throw new ApiError(401, 'Invalid signature');
    }
    
    // Generate a new nonce for next login
    const newNonce = Math.floor(Math.random() * 1000000).toString();
    user.nonce = newNonce;
    user.lastLogin = Date.now();
    
    // Update user in database
    await db.put('users', user);
    
    // Generate JWT token
    const token = generateToken({
      walletAddress: normalizedAddress,
      isAdmin: false, // Set admin status based on your requirements
    });
    
    // Track login event
    trackEvent(
      AnalyticsEventType.SESSION_START,
      {
        loginMethod: 'wallet_signature',
      },
      normalizedAddress
    ).catch(error => {
      logger.error('Error tracking login event:', error);
    });
    
    // Return token and user data
    res.status(200).json({
      token,
      user: {
        address: normalizedAddress,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify authentication token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 */
authRouter.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This route uses the authenticate middleware, so if we get here, the token is valid
    res.status(200).json({
      valid: true,
      user: {
        address: req.user?.walletAddress,
        isAdmin: req.user?.isAdmin || false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out (invalidate token on client side)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Track logout event
    if (req.user) {
      trackEvent(
        AnalyticsEventType.SESSION_END,
        {
          logoutMethod: 'explicit',
        },
        req.user.walletAddress
      ).catch(error => {
        logger.error('Error tracking logout event:', error);
      });
    }
    
    // Note: JWT tokens cannot be invalidated on the server side without a token blacklist
    // The client should remove the token from storage
    res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from client storage.',
    });
  } catch (error) {
    next(error);
  }
});

export { authRouter };
