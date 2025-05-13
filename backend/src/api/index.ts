import { Router } from 'express';
import { relayerRouter } from './relayer';
import { indexerRouter } from './indexer';
import { notificationRouter } from './notification';
import { analyticsRouter } from './analytics';
import { authRouter } from './auth';
import { walletRouter } from './wallet';
import recoveryRouter from './recovery';
import { standardLimiter } from '../middlewares/rateLimit';
import { authenticate } from '../middlewares/auth';

// Create main API router
const apiRouter = Router();

// Apply rate limiting to all API routes
apiRouter.use(standardLimiter);

// Health check endpoint (public)
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Authentication routes (public)
apiRouter.use('/auth', authRouter);

// Protected routes (require authentication)
apiRouter.use('/relayer', authenticate, relayerRouter);
apiRouter.use('/indexer', authenticate, indexerRouter);
apiRouter.use('/notification', authenticate, notificationRouter);
apiRouter.use('/analytics', authenticate, analyticsRouter);
apiRouter.use('/wallet', authenticate, walletRouter);
apiRouter.use('/recovery', authenticate, recoveryRouter);

export { apiRouter };
