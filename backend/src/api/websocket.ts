import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { verifySignature } from '../utils/crypto';
import { getDatabase } from '../config/database';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notification';
import { startSession, endSession, trackEvent, AnalyticsEventType } from '../services/analytics';

// Connected clients by wallet address
const connectedClients: Record<string, Set<string>> = {};

/**
 * Set up WebSocket handlers
 * @param io Socket.io server instance
 */
export const setupWebSocketHandlers = (io: Server): void => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const { walletAddress, signature, message } = socket.handshake.auth;
      
      if (!walletAddress || !signature || !message) {
        return next(new Error('Authentication failed: Missing credentials'));
      }
      
      // Verify signature
      const isValid = await verifySignature(walletAddress, signature, message);
      
      if (!isValid) {
        return next(new Error('Authentication failed: Invalid signature'));
      }
      
      // Store wallet address in socket data
      socket.data.walletAddress = walletAddress.toLowerCase();
      
      // Track analytics event
      trackEvent(
        AnalyticsEventType.WALLET_LOADED,
        {
          connectionType: 'websocket',
        },
        socket.data.walletAddress,
        undefined,
        undefined,
        {
          userAgent: socket.handshake.headers['user-agent'],
        }
      ).catch(error => {
        logger.error('Error tracking wallet loaded event:', error);
      });
      
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  // Connection handler
  io.on('connection', (socket: Socket) => {
    const walletAddress = socket.data.walletAddress;
    
    logger.info(`WebSocket client connected: ${socket.id} (${walletAddress})`);
    
    // Add to connected clients
    if (!connectedClients[walletAddress]) {
      connectedClients[walletAddress] = new Set();
    }
    connectedClients[walletAddress].add(socket.id);
    
    // Start analytics session
    let sessionId: string;
    startSession(walletAddress, {
      userAgent: socket.handshake.headers['user-agent'],
    }).then(id => {
      sessionId = id;
      socket.data.sessionId = id;
    }).catch(error => {
      logger.error('Error starting analytics session:', error);
    });
    
    // Send initial data
    sendInitialData(socket);
    
    // Event handlers
    
    // Subscribe to transaction updates
    socket.on('subscribeToTransactions', async (data: { chainId?: number }) => {
      try {
        socket.join(`transactions:${walletAddress}`);
        
        if (data.chainId) {
          socket.join(`transactions:${walletAddress}:${data.chainId}`);
        }
        
        logger.debug(`Client ${socket.id} subscribed to transactions for ${walletAddress}`);
      } catch (error) {
        logger.error('Error subscribing to transactions:', error);
        socket.emit('error', { message: 'Failed to subscribe to transactions' });
      }
    });
    
    // Subscribe to token balance updates
    socket.on('subscribeToTokenBalances', async (data: { tokens: Array<{ address: string, chainId: number }> }) => {
      try {
        socket.join(`balances:${walletAddress}`);
        
        // Subscribe to specific tokens
        if (data.tokens && Array.isArray(data.tokens)) {
          for (const token of data.tokens) {
            socket.join(`balances:${walletAddress}:${token.chainId}:${token.address}`);
          }
        }
        
        logger.debug(`Client ${socket.id} subscribed to token balances for ${walletAddress}`);
      } catch (error) {
        logger.error('Error subscribing to token balances:', error);
        socket.emit('error', { message: 'Failed to subscribe to token balances' });
      }
    });
    
    // Get notifications
    socket.on('getNotifications', async (data: { limit?: number, offset?: number, unreadOnly?: boolean }) => {
      try {
        const notifications = await getNotifications(
          walletAddress,
          data.limit,
          data.offset,
          data.unreadOnly
        );
        
        socket.emit('notifications', { notifications });
      } catch (error) {
        logger.error('Error getting notifications:', error);
        socket.emit('error', { message: 'Failed to get notifications' });
      }
    });
    
    // Mark notification as read
    socket.on('markNotificationAsRead', async (data: { notificationId: string }) => {
      try {
        await markNotificationAsRead(data.notificationId);
        socket.emit('notificationMarkedAsRead', { id: data.notificationId });
      } catch (error) {
        logger.error('Error marking notification as read:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });
    
    // Mark all notifications as read
    socket.on('markAllNotificationsAsRead', async () => {
      try {
        await markAllNotificationsAsRead(walletAddress);
        socket.emit('allNotificationsMarkedAsRead');
      } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
    });
    
    // Submit transaction
    socket.on('submitTransaction', async (data: {
      chainId: number,
      to: string,
      value: string,
      data: string,
      gasless?: boolean
    }) => {
      try {
        // Validate data
        if (!data.chainId || !data.to) {
          socket.emit('error', { message: 'Invalid transaction data' });
          return;
        }
        
        // Track analytics event
        trackEvent(
          AnalyticsEventType.TRANSACTION_SENT,
          {
            chainId: data.chainId,
            to: data.to,
            value: data.value,
            gasless: !!data.gasless,
          },
          walletAddress,
          sessionId
        ).catch(error => {
          logger.error('Error tracking transaction sent event:', error);
        });
        
        // Forward to transaction handler (implementation depends on your architecture)
        // This is just a placeholder for the actual implementation
        socket.emit('transactionSubmitted', {
          status: 'pending',
          message: 'Transaction submitted',
          timestamp: Date.now(),
        });
      } catch (error) {
        logger.error('Error submitting transaction:', error);
        socket.emit('error', { message: 'Failed to submit transaction' });
      }
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id} (${walletAddress})`);
      
      // Remove from connected clients
      if (connectedClients[walletAddress]) {
        connectedClients[walletAddress].delete(socket.id);
        
        if (connectedClients[walletAddress].size === 0) {
          delete connectedClients[walletAddress];
        }
      }
      
      // End analytics session
      if (sessionId) {
        endSession(sessionId).catch(error => {
          logger.error('Error ending analytics session:', error);
        });
      }
    });
  });
};

/**
 * Send initial data to a connected client
 * @param socket Socket instance
 */
const sendInitialData = async (socket: Socket): Promise<void> => {
  try {
    const walletAddress = socket.data.walletAddress;
    const db = getDatabase();
    
    // Get unread notifications
    const notifications = await getNotifications(walletAddress, 10, 0, true);
    
    // Get wallet data
    const wallet = await db.get('wallets', walletAddress);
    
    // Send data to client
    socket.emit('initialData', {
      wallet,
      notifications,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Error sending initial data:', error);
    socket.emit('error', { message: 'Failed to load initial data' });
  }
};

/**
 * Broadcast a message to all clients connected to a wallet
 * @param walletAddress Wallet address
 * @param event Event name
 * @param data Event data
 */
export const broadcastToWallet = (walletAddress: string, event: string, data: any): void => {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    const socketIds = connectedClients[normalizedAddress];
    
    if (socketIds && socketIds.size > 0) {
      // Get socket.io server instance
      const io = global.io as Server;
      
      // Broadcast to all connected clients for this wallet
      socketIds.forEach(socketId => {
        io.to(socketId).emit(event, data);
      });
      
      logger.debug(`Broadcast ${event} to ${socketIds.size} clients for wallet ${normalizedAddress}`);
    }
  } catch (error) {
    logger.error(`Error broadcasting to wallet ${walletAddress}:`, error);
  }
};
