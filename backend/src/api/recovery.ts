import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import * as recoveryService from '../services/recovery';
import { validateRequest } from '../middlewares/errorHandler';
import { authenticateUser } from '../middlewares/auth';
import { rateLimit } from '../middlewares/rateLimit';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting for recovery endpoints
const recoveryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for recovery endpoints
  message: 'Too many recovery requests, please try again later'
});

// Get recovery configuration
router.get(
  '/config/:walletAddress',
  authenticateUser,
  [param('walletAddress').isString().isLength({ min: 42, max: 42 })],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const config = await recoveryService.getRecoveryConfig(walletAddress);
      if (!config) {
        return res.status(404).json({ 
          error: 'Recovery configuration not found',
          details: `No recovery configuration exists for wallet ${walletAddress}`
        });
      }
      res.json(config);
    } catch (error) {
      logger.error('Error fetching recovery config:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: 'Failed to fetch recovery configuration'
      });
    }
  }
);

// Set up recovery configuration
router.post(
  '/config',
  authenticateUser,
  recoveryRateLimit,
  [
    body('walletAddress').isString().isLength({ min: 42, max: 42 }),
    body('guardians').isArray().notEmpty(),
    body('guardians.*.address').isString().isLength({ min: 42, max: 42 }),
    body('threshold').isInt({ min: 1 }),
    body('delay').isInt({ min: 0 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, guardians, threshold, delay } = req.body;
      
      if (threshold > guardians.length) {
        return res.status(400).json({ 
          error: 'Invalid threshold',
          details: `Threshold (${threshold}) cannot be greater than number of guardians (${guardians.length})`
        });
      }

      const success = await recoveryService.setupRecovery(
        walletAddress,
        guardians,
        threshold,
        delay
      );
      
      if (!success) {
        return res.status(400).json({ 
          error: 'Setup failed',
          details: 'Failed to set up recovery configuration'
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Error setting up recovery:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: 'Failed to set up recovery configuration'
      });
    }
  }
);

// Update recovery configuration
router.put(
  '/config/:walletAddress',
  authenticateUser,
  [
    param('walletAddress').isString(),
    body('updates').isObject(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const { updates } = req.body;
    const success = await recoveryService.updateRecoveryConfig(walletAddress, updates);
    if (!success) {
      return res.status(400).json({ error: 'Failed to update recovery configuration' });
    }
    res.json({ success: true });
  }
);

// Add guardian
router.post(
  '/guardian',
  authenticateUser,
  recoveryRateLimit,
  [
    body('walletAddress').isString().isLength({ min: 42, max: 42 }),
    body('guardian.address').isString().isLength({ min: 42, max: 42 }),
    body('guardian.type').isIn(['eoa', 'contract', 'multisig']),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, guardian } = req.body;
      const success = await recoveryService.addGuardian(walletAddress, guardian);
      if (!success) {
        return res.status(400).json({ 
          error: 'Failed to add guardian',
          details: 'Guardian may already exist or configuration not found'
        });
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('Error adding guardian:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: 'Failed to add guardian'
      });
    }
  }
);

// Remove guardian
router.delete(
  '/guardian/:walletAddress/:guardianAddress',
  authenticateUser,
  [
    param('walletAddress').isString(),
    param('guardianAddress').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress, guardianAddress } = req.params;
    const success = await recoveryService.removeGuardian(walletAddress, guardianAddress);
    if (!success) {
      return res.status(400).json({ error: 'Failed to remove guardian' });
    }
    res.json({ success: true });
  }
);

// Initiate recovery
router.post(
  '/initiate',
  authenticateUser,
  recoveryRateLimit,
  [
    body('walletAddress').isString().isLength({ min: 42, max: 42 }),
    body('newOwner').isString().isLength({ min: 42, max: 42 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, newOwner } = req.body;
      const requestId = await recoveryService.initiateRecovery(walletAddress, newOwner);
      res.json({ requestId });
    } catch (error) {
      logger.error('Error initiating recovery:', error);
      res.status(400).json({ 
        error: 'Failed to initiate recovery',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
);

// Approve recovery
router.post(
  '/approve',
  authenticateUser,
  [
    body('requestId').isString(),
    body('guardianAddress').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { requestId, guardianAddress } = req.body;
    const success = await recoveryService.approveRecovery(requestId, guardianAddress);
    if (!success) {
      return res.status(400).json({ error: 'Failed to approve recovery' });
    }
    res.json({ success: true });
  }
);

// Cancel recovery
router.post(
  '/cancel',
  authenticateUser,
  [
    body('requestId').isString(),
    body('walletAddress').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { requestId, walletAddress } = req.body;
    const success = await recoveryService.cancelRecovery(requestId, walletAddress);
    if (!success) {
      return res.status(400).json({ error: 'Failed to cancel recovery' });
    }
    res.json({ success: true });
  }
);

// Get recovery request
router.get(
  '/request/:requestId',
  authenticateUser,
  [param('requestId').isString()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const request = await recoveryService.getRecoveryRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Recovery request not found' });
    }
    res.json(request);
  }
);

// Get recovery requests for wallet
router.get(
  '/requests/:walletAddress',
  authenticateUser,
  [param('walletAddress').isString()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const requests = await recoveryService.getRecoveryRequestsForWallet(walletAddress);
    res.json(requests);
  }
);

// Create recovery backup
router.post(
  '/backup',
  authenticateUser,
  [
    body('walletAddress').isString(),
    body('data').isString(),
    body('password').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress, data, password } = req.body;
    try {
      const backupId = await recoveryService.createRecoveryBackup(walletAddress, data, password);
      res.json({ backupId });
    } catch (error) {
      res.status(400).json({ error: 'Failed to create recovery backup' });
    }
  }
);

// Get recovery backup
router.post(
  '/backup/:backupId',
  authenticateUser,
  [
    param('backupId').isString(),
    body('password').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { backupId } = req.params;
    const { password } = req.body;
    const data = await recoveryService.getRecoveryBackup(backupId, password);
    if (!data) {
      return res.status(404).json({ error: 'Recovery backup not found or invalid password' });
    }
    res.json({ data });
  }
);

// Get recovery backups for wallet
router.get(
  '/backups/:walletAddress',
  authenticateUser,
  [param('walletAddress').isString()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const backups = await recoveryService.getRecoveryBackupsForWallet(walletAddress);
    res.json(backups);
  }
);

// Delete recovery backup
router.delete(
  '/backup/:backupId/:walletAddress',
  authenticateUser,
  [
    param('backupId').isString(),
    param('walletAddress').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { backupId, walletAddress } = req.params;
    const success = await recoveryService.deleteRecoveryBackup(backupId, walletAddress);
    if (!success) {
      return res.status(400).json({ error: 'Failed to delete recovery backup' });
    }
    res.json({ success: true });
  }
);

// Get recovery service status
router.get(
  '/status',
  authenticateUser,
  async (req: Request, res: Response) => {
    const status = recoveryService.getRecoveryServiceStatus();
    res.json(status);
  }
);

export default router;