import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import { getDatabase } from '../config/database';
import relayerService from '../services/relayer';
import { trackEvent, AnalyticsEventType } from '../services/analytics';
import { sensitiveOperationLimiter } from '../middlewares/rateLimit';
import { asyncHandler } from '../utils/express-utils';
import { Permission, UserRole } from '../services/rbac';
import { requirePermission } from '../middlewares/auth';
import { AuthUser } from '../middlewares/auth';
import { walletSecurityService } from '../services/walletSecurity';
import { ethers } from 'ethers';

// Define a type that extends Express Request with authenticated user
// Define a type that extends Express Request with authenticated user
type AuthRequest = Request & {
  user?: AuthUser;
}

// Constants
const DEFAULT_CHAIN_ID = 1; // Ethereum mainnet
const MANAGE_TOKENS = 'manage_tokens' as Permission; // Custom permission for token management
const WALLET_TYPES = ['standard', 'tee', 'tss'] as const;

// Types
interface Wallet {
  address: string;
  type: 'smart' | 'eoa';
  securityType: typeof WALLET_TYPES[number];
  chainId: number;
  owner: string;
  deployedAt: number;
  custodians: string[];
  brokers: string[];
  threshold: number;
  txHash?: string; // Made optional to handle undefined case
  tssInfo?: {
    totalShares: number;
    threshold: number;
  };
}

interface Token {
  id: string;
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  walletAddress: string;
  addedAt: number;
  isCustom: boolean;
}

// Database collection types
type CollectionType = 'wallets' | 'tokens';
type CollectionData = {
  wallets: Wallet;
  tokens: Token;
};

// Database interface
interface Database {
  get<T extends CollectionType>(collection: T, key: string): Promise<CollectionData[T] | null>;
  put<T extends CollectionType>(collection: T, data: CollectionData[T]): Promise<void>;
  delete(collection: CollectionType, key: string): Promise<void>;
}

// Type guard to check if user is defined
function isAuthenticated(req: Request): req is Request & { user: AuthUser } {
  return req.user !== undefined;
}

// Validation schemas
const createWalletSchema = z.object({
  user: z.string().min(1, 'User address is required'),
  userId: z.string().min(1, 'User ID is required'),
  threshold: z.number().int().positive('Threshold must be a positive integer'),
  custodians: z.array(z.string()).min(1, 'At least one custodian is required'),
  brokers: z.array(z.string()).min(1, 'At least one broker is required'),
  securityType: z.enum(WALLET_TYPES).default('standard'),
  tssShares: z.number().int().positive().optional(),
});

const addTokenSchema = z.object({
  tokenAddress: z.string().min(1, 'Token address is required'),
  chainId: z.number().int().positive('Chain ID must be a positive integer'),
  symbol: z.string().min(1, 'Token symbol is required'),
  name: z.string().optional(),
  decimals: z.number().int().nonnegative('Decimals must be a non-negative integer'),
});

// Create router
const walletRouter = Router();

/**
 * @swagger
 * /api/wallet/create:
 *   post:
 *     summary: Create a new wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - userId
 *               - threshold
 *               - custodians
 *               - brokers
 *             properties:
 *               user:
 *                 type: string
 *                 description: Wallet owner address
 *               userId:
 *                 type: string
 *                 description: Unique user identifier
 *               threshold:
 *                 type: integer
 *                 description: Number of required signatures
 *               custodians:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of custodian addresses
 *               brokers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of broker addresses
 *               securityType:
 *                 type: string
 *                 enum: [standard, tee, tss]
 *                 description: Security type for the wallet
 *               tssShares:
 *                 type: integer
 *                 description: Total number of shares for TSS wallets
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletAddress:
 *                   type: string
 *                 txHash:
 *                   type: string
 *                   nullable: true
 *                 securityType:
 *                   type: string
 *                   enum: [standard, tee, tss]
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 */
walletRouter.post(
  '/create',
  sensitiveOperationLimiter,
  requirePermission(Permission.CREATE_WALLET),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const { user, userId, threshold, custodians, brokers, securityType, tssShares } = createWalletSchema.parse(req.body);

      // Verify authenticated user matches request user
      if (!req.user || !req.user.walletAddress || req.user.walletAddress.toLowerCase() !== user.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: wallet address mismatch');
      }

      // Initialize wallet security service if not already initialized
      await walletSecurityService.initialize();

      let walletAddress: string;
      let txHash: string | undefined;
      let tssInfo: { totalShares: number; threshold: number } | undefined;

      // Create wallet based on security type
      if (securityType === 'tee') {
        // Create a TEE-secured wallet
        walletAddress = await walletSecurityService.createTEEWallet(userId);
        
        // No transaction hash for TEE wallets as they're created locally
        txHash = undefined;
      } else if (securityType === 'tss') {
        // For TSS wallets, we need the total number of shares
        if (!tssShares) {
          throw new ApiError(400, 'tssShares is required for TSS wallets');
        }
        
        // Create a TSS-secured wallet
        walletAddress = await walletSecurityService.createTSSWallet(userId, threshold, tssShares);
        
        // No transaction hash for TSS wallets as they're created locally
        txHash = undefined;
        
        // Store TSS info
        tssInfo = {
          totalShares: tssShares,
          threshold,
        };
      } else {
        // Create a standard smart contract wallet
        const result = await relayerService.createWallet(user, DEFAULT_CHAIN_ID);
        walletAddress = result.address;
        txHash = result.txHash;
      }

      // Store wallet in database
      const db = getDatabase();
      const wallet: Wallet = {
        address: walletAddress,
        type: 'smart' as const,
        securityType,
        chainId: DEFAULT_CHAIN_ID,
        owner: user.toLowerCase(),
        deployedAt: Date.now(),
        custodians,
        brokers,
        threshold,
        txHash,
        tssInfo,
        status: 'active' as const,
        lastActivity: Date.now(),
      };
      await db.put('wallets', wallet);

      // Track wallet creation event
      trackEvent(
        AnalyticsEventType.WALLET_CREATED,
        {
          walletAddress,
          securityType,
          custodianCount: custodians.length,
          brokerCount: brokers.length,
          threshold,
          tssShares,
        },
        user
      ).catch((error) => {
        logger.error('Error tracking wallet creation event:', error);
      });

      res.status(201).json({
        walletAddress,
        txHash,
        securityType,
        ...(tssInfo && { tssInfo }),
      });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/wallet/{address}:
 *   get:
 *     summary: Get wallet information
 *     tags: [Wallet]
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
 *         description: Wallet information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wallet:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                     type:
 *                       type: string
 *                     chainId:
 *                       type: integer
 *                     owner:
 *                       type: string
 *                     deployedAt:
 *                       type: integer
 *                     custodians:
 *                       type: array
 *                       items:
 *                         type: string
 *                     brokers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     threshold:
 *                       type: integer
 *                     txHash:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Wallet not found
 *       403:
 *         description: Unauthorized
 */
walletRouter.get(
  '/:address',
  requirePermission(Permission.VIEW_WALLET),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.params.address.toLowerCase();

      // Get wallet from database
      const db = getDatabase();
      const wallet = await db.get('wallets', address);

      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      // Verify user is the wallet owner
      if (!req.user || req.user.walletAddress.toLowerCase() !== wallet.owner.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: not wallet owner');
      }

      // Get on-chain wallet info
      const walletInfo = await relayerService.getWalletInfo(address);

      // Combine database and on-chain data
      const combinedInfo = {
        ...wallet,
        ...walletInfo,
      };

      res.status(200).json({ wallet: combinedInfo });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/wallet/{address}/balances:
 *   get:
 *     summary: Get token balances for a wallet
 *     tags: [Wallet]
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
 *     responses:
 *       200:
 *         description: Token balances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balances:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tokenAddress:
 *                         type: string
 *                       balance:
 *                         type: string
 *       404:
 *         description: Wallet not found
 *       403:
 *         description: Unauthorized
 */
walletRouter.get(
  '/:address/balances',
  requirePermission(Permission.VIEW_WALLET),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.params.address.toLowerCase();
      const chainId = req.query.chainId ? parseInt(req.query.chainId as string, 10) : undefined;

      // Get wallet from database
      const db = getDatabase();
      const wallet = await db.get('wallets', address);

      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      // Verify user is the wallet owner
      if (!req.user || req.user.walletAddress.toLowerCase() !== wallet.owner.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: not wallet owner');
      }

      // Get token balances
      const balances = await relayerService.getTokenBalances(address, chainId || wallet.chainId || DEFAULT_CHAIN_ID);

      // Track feature usage
      if (req.user && req.user.walletAddress) {
        trackEvent(
          AnalyticsEventType.FEATURE_USED,
          {
            feature: 'view_balances',
            chainId: chainId || wallet.chainId,
          },
          req.user.walletAddress
        ).catch((error) => {
          logger.error('Error tracking feature used event:', error);
        });
      }

      res.status(200).json({ balances });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/wallet/{address}/tokens:
 *   post:
 *     summary: Add a custom token to a wallet
 *     tags: [Wallet]
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
 *               - tokenAddress
 *               - chainId
 *               - symbol
 *               - decimals
 *             properties:
 *               tokenAddress:
 *                 type: string
 *                 description: Token contract address
 *               chainId:
 *                 type: integer
 *                 description: Chain ID
 *               symbol:
 *                 type: string
 *                 description: Token symbol
 *               name:
 *                 type: string
 *                 description: Token name
 *               decimals:
 *                 type: integer
 *                 description: Token decimals
 *     responses:
 *       201:
 *         description: Token added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     address:
 *                       type: string
 *                     chainId:
 *                       type: integer
 *                     symbol:
 *                       type: string
 *                     name:
 *                       type: string
 *                     decimals:
 *                       type: integer
 *                     walletAddress:
 *                       type: string
 *                     addedAt:
 *                       type: integer
 *                     isCustom:
 *                       type: boolean
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Wallet not found
 *       403:
 *         description: Unauthorized
 */
walletRouter.post(
  '/:address/tokens',
  requirePermission(MANAGE_TOKENS as unknown as Permission),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const walletAddress = req.params.address.toLowerCase();
      const { tokenAddress, chainId, symbol, name, decimals } = addTokenSchema.parse(req.body);

      // Get wallet from database
      const db = getDatabase();
      const wallet = await db.get('wallets', walletAddress);

      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      // Verify user is the wallet owner
      if (!req.user || req.user.walletAddress.toLowerCase() !== wallet.owner.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: not wallet owner');
      }

      // Create token object
      const token: Token = {
        id: `${chainId}-${tokenAddress.toLowerCase()}`,
        address: tokenAddress.toLowerCase(),
        chainId,
        symbol,
        name: name || symbol,
        decimals,
        walletAddress,
        addedAt: Date.now(),
        isCustom: true,
      };

      // Add token to database
      await db.put('tokens', token);

      // Track token added event
      if (req.user && req.user.walletAddress) {
        trackEvent(
          AnalyticsEventType.FEATURE_USED,
          {
            feature: 'add_custom_token',
            chainId,
            tokenAddress: token.address,
            symbol,
          },
          req.user.walletAddress
        ).catch((error) => {
          logger.error('Error tracking token added event:', error);
        });
      }

      res.status(201).json({
        success: true,
        token,
      });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/wallet/{address}/tokens/{tokenId}:
 *   delete:
 *     summary: Remove a custom token from a wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ID (chainId-tokenAddress)
 *     responses:
 *       200:
 *         description: Token removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Wallet or token not found
 *       403:
 *         description: Unauthorized
 */
walletRouter.delete(
  '/:address/tokens/:tokenId',
  requirePermission(MANAGE_TOKENS as unknown as Permission),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const walletAddress = req.params.address.toLowerCase();
      const tokenId = req.params.tokenId;

      // Get wallet from database
      const db = getDatabase();
      const wallet = await db.get('wallets', walletAddress);

      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      // Verify user is the wallet owner
      if (!req.user || req.user.walletAddress.toLowerCase() !== wallet.owner.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: not wallet owner');
      }

      // Get token from database
      const token = await db.get('tokens', tokenId);

      if (!token) {
        throw new ApiError(404, 'Token not found');
      }

      // Verify token belongs to wallet
      const tokenWithWalletAddress = token as unknown as { walletAddress?: string };
      if (!tokenWithWalletAddress.walletAddress || tokenWithWalletAddress.walletAddress !== walletAddress) {
        throw new ApiError(403, 'Unauthorized: token does not belong to wallet');
      }

      // Remove token from database
      await db.delete('tokens', tokenId);

      // Track token removed event
      if (req.user && req.user.walletAddress) {
        trackEvent(
          AnalyticsEventType.FEATURE_USED,
          {
            feature: 'remove_custom_token',
            chainId: token.chainId,
            tokenAddress: token.address,
            symbol: token.symbol,
          },
          req.user.walletAddress
        ).catch((error) => {
          logger.error('Error tracking token removed event:', error);
        });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  })
);

// Add new routes for TEE and TSS operations

/**
 * @swagger
 * /api/wallet/{address}/sign:
 *   post:
 *     summary: Sign a message or transaction using wallet security features
 *     tags: [Wallet]
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
 *               - type
 *               - data
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [message, transaction]
 *                 description: Type of data to sign
 *               data:
 *                 type: object
 *                 description: Message or transaction data
 *               shareIndexes:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Share indexes for TSS wallets
 *     responses:
 *       200:
 *         description: Signing successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 */
walletRouter.post(
  '/:address/sign',
  sensitiveOperationLimiter,
  requirePermission(Permission.SIGN_TRANSACTION),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const { type, data, shareIndexes } = req.body;
      
      // Validate input
      if (!type || !['message', 'transaction'].includes(type)) {
        throw new ApiError(400, 'Invalid type. Must be "message" or "transaction"');
      }
      
      if (!data) {
        throw new ApiError(400, 'Data is required');
      }
      
      // Get user ID from authenticated user
      if (!req.user || !req.user.id) {
        throw new ApiError(403, 'Unauthorized: user not authenticated');
      }
      const userId = req.user.id;
      
      // Get wallet from database
      const db = getDatabase();
      const wallet = await db.get('wallets', address);
      
      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }
      
      // Verify wallet ownership
      if (wallet.owner.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: not wallet owner');
      }
      
      // Initialize wallet security service
      await walletSecurityService.initialize();
      
      let signature: string;
      
      if (type === 'message') {
        // Sign message
        signature = await walletSecurityService.signMessage(
          userId,
          address,
          data.message,
          shareIndexes
        );
      } else {
        // Sign transaction
        const txRequest: ethers.TransactionRequest = {
          to: data.to,
          value: data.value ? ethers.parseEther(data.value) : undefined,
          data: data.data,
          gasLimit: data.gasLimit,
          nonce: data.nonce,
        };
        
        signature = await walletSecurityService.signTransaction(
          userId,
          address,
          txRequest,
          shareIndexes
        );
      }
      
      // Track signing event
      trackEvent(
        type === 'message' ? AnalyticsEventType.MESSAGE_SIGNED : AnalyticsEventType.TRANSACTION_SIGNED,
        {
          walletAddress: address,
          securityType: wallet.securityType,
        },
        req.user.walletAddress
      ).catch((error) => {
        logger.error('Error tracking signing event:', error);
      });
      
      res.status(200).json({ signature });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/wallet/{address}/security-info:
 *   get:
 *     summary: Get wallet security information
 *     tags: [Wallet]
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
 *         description: Wallet security information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 securityType:
 *                   type: string
 *                   enum: [standard, tee, tss]
 *                 tssInfo:
 *                   type: object
 *                   properties:
 *                     threshold:
 *                       type: integer
 *                     totalShares:
 *                       type: integer
 *       404:
 *         description: Wallet not found
 *       403:
 *         description: Unauthorized
 */
walletRouter.get(
  '/:address/security-info',
  requirePermission(Permission.VIEW_WALLET),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      
      // Get user ID from authenticated user
      if (!req.user || !req.user.id) {
        throw new ApiError(403, 'Unauthorized: user not authenticated');
      }
      const userId = req.user.id;
      
      // Get wallet from database
      const db = getDatabase();
      const wallet = await db.get('wallets', address);
      
      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }
      
      // Verify wallet ownership
      if (wallet.owner.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
        throw new ApiError(403, 'Unauthorized: not wallet owner');
      }
      
      // Initialize wallet security service
      await walletSecurityService.initialize();
      
      // Get security info based on wallet type
      let securityInfo: any = {
        securityType: wallet.securityType || 'standard',
      };
      
      if (wallet.securityType === 'tss' && wallet.tssInfo) {
        securityInfo.tssInfo = wallet.tssInfo;
      }
      
      res.status(200).json(securityInfo);
    } catch (error) {
      next(error);
    }
  })
);

export { walletRouter };