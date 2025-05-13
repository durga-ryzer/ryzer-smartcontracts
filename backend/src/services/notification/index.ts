import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { Server } from 'socket.io';

// Socket.io server instance
let io: Server | null = null;

// Connected clients by wallet address
const connectedClients: Record<string, string[]> = {};

// Notification types
export enum NotificationType {
  TRANSACTION_SENT = 'transaction_sent',
  TRANSACTION_CONFIRMED = 'transaction_confirmed',
  TRANSACTION_FAILED = 'transaction_failed',
  TOKEN_RECEIVED = 'token_received',
  LOW_BALANCE = 'low_balance',
  SECURITY_ALERT = 'security_alert',
  PRICE_ALERT = 'price_alert',
  SYSTEM_NOTIFICATION = 'system_notification',
}

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  data?: any;
  read: boolean;
  walletAddress: string;
  chainId?: number;
}

/**
 * Initialize the notification service
 * @param socketServer Socket.io server instance
 */
export const initializeNotificationService = (socketServer: Server): void => {
  try {
    logger.info('Initializing notification service...');
    
    io = socketServer;
    
    // Set up socket.io connection handler
    io.on('connection', (socket) => {
      logger.debug(`Client connected: ${socket.id}`);
      
      // Handle client authentication
      socket.on('authenticate', (data: { walletAddress: string }) => {
        if (!data.walletAddress) {
          socket.emit('error', { message: 'Wallet address is required' });
          return;
        }
        
        const walletAddress = data.walletAddress.toLowerCase();
        
        // Store client connection
        if (!connectedClients[walletAddress]) {
          connectedClients[walletAddress] = [];
        }
        
        connectedClients[walletAddress].push(socket.id);
        
        logger.debug(`Client ${socket.id} authenticated for wallet ${walletAddress}`);
        
        // Send unread notifications
        sendUnreadNotifications(walletAddress, socket.id);
      });
      
      // Handle client disconnection
      socket.on('disconnect', () => {
        logger.debug(`Client disconnected: ${socket.id}`);
        
        // Remove client from connected clients
        for (const [walletAddress, socketIds] of Object.entries(connectedClients)) {
          const index = socketIds.indexOf(socket.id);
          if (index !== -1) {
            socketIds.splice(index, 1);
            
            // Clean up empty arrays
            if (socketIds.length === 0) {
              delete connectedClients[walletAddress];
            }
            
            break;
          }
        }
      });
      
      // Handle mark notification as read
      socket.on('markAsRead', async (data: { notificationId: string }) => {
        if (!data.notificationId) {
          socket.emit('error', { message: 'Notification ID is required' });
          return;
        }
        
        try {
          await markNotificationAsRead(data.notificationId);
          socket.emit('notificationMarkedAsRead', { id: data.notificationId });
        } catch (error) {
          logger.error('Error marking notification as read:', error);
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });
      
      // Handle mark all notifications as read
      socket.on('markAllAsRead', async (data: { walletAddress: string }) => {
        if (!data.walletAddress) {
          socket.emit('error', { message: 'Wallet address is required' });
          return;
        }
        
        try {
          await markAllNotificationsAsRead(data.walletAddress);
          socket.emit('allNotificationsMarkedAsRead');
        } catch (error) {
          logger.error('Error marking all notifications as read:', error);
          socket.emit('error', { message: 'Failed to mark all notifications as read' });
        }
      });
    });
    
    logger.info('Notification service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize notification service:', error);
    throw error;
  }
};

/**
 * Send unread notifications to a client
 * @param walletAddress Wallet address
 * @param socketId Socket ID
 */
const sendUnreadNotifications = async (walletAddress: string, socketId: string): Promise<void> => {
  try {
    const db = getDatabase();
    const notifications = await db.getAllFromIndex('notifications', 'by-wallet-read', [walletAddress, false]);
    
    if (notifications.length > 0) {
      io?.to(socketId).emit('unreadNotifications', { notifications });
    }
  } catch (error) {
    logger.error(`Error sending unread notifications for ${walletAddress}:`, error);
  }
};

/**
 * Create a notification
 * @param notification Notification object
 * @returns Created notification
 */
export const createNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> => {
  try {
    const db = getDatabase();
    
    // Create notification object
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    
    // Store notification in database
    await db.add('notifications', newNotification);
    
    // Send notification to connected clients
    const walletAddress = notification.walletAddress.toLowerCase();
    const socketIds = connectedClients[walletAddress] || [];
    
    if (socketIds.length > 0) {
      io?.to(socketIds).emit('notification', { notification: newNotification });
    }
    
    logger.debug(`Notification created for ${walletAddress}: ${newNotification.id}`);
    
    return newNotification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create a transaction notification
 * @param walletAddress Wallet address
 * @param txHash Transaction hash
 * @param status Transaction status
 * @param chainId Chain ID
 * @param data Additional data
 */
export const createTransactionNotification = async (
  walletAddress: string,
  txHash: string,
  status: 'sent' | 'confirmed' | 'failed',
  chainId: number,
  data?: any
): Promise<void> => {
  try {
    let type: NotificationType;
    let title: string;
    let message: string;
    
    switch (status) {
      case 'sent':
        type = NotificationType.TRANSACTION_SENT;
        title = 'Transaction Sent';
        message = `Your transaction has been submitted to the network. Transaction hash: ${txHash}`;
        break;
      case 'confirmed':
        type = NotificationType.TRANSACTION_CONFIRMED;
        title = 'Transaction Confirmed';
        message = `Your transaction has been confirmed. Transaction hash: ${txHash}`;
        break;
      case 'failed':
        type = NotificationType.TRANSACTION_FAILED;
        title = 'Transaction Failed';
        message = `Your transaction has failed. Transaction hash: ${txHash}`;
        break;
      default:
        throw new Error(`Invalid transaction status: ${status}`);
    }
    
    await createNotification({
      type,
      title,
      message,
      walletAddress,
      chainId,
      data: {
        ...data,
        txHash,
      },
    });
  } catch (error) {
    logger.error('Error creating transaction notification:', error);
  }
};

/**
 * Create a token received notification
 * @param walletAddress Wallet address
 * @param tokenSymbol Token symbol
 * @param amount Token amount
 * @param sender Sender address
 * @param chainId Chain ID
 * @param txHash Transaction hash
 */
export const createTokenReceivedNotification = async (
  walletAddress: string,
  tokenSymbol: string,
  amount: string,
  sender: string,
  chainId: number,
  txHash: string
): Promise<void> => {
  try {
    await createNotification({
      type: NotificationType.TOKEN_RECEIVED,
      title: 'Token Received',
      message: `You received ${amount} ${tokenSymbol} from ${sender.substring(0, 6)}...${sender.substring(sender.length - 4)}`,
      walletAddress,
      chainId,
      data: {
        tokenSymbol,
        amount,
        sender,
        txHash,
      },
    });
  } catch (error) {
    logger.error('Error creating token received notification:', error);
  }
};

/**
 * Create a low balance notification
 * @param walletAddress Wallet address
 * @param tokenSymbol Token symbol
 * @param balance Current balance
 * @param threshold Threshold balance
 * @param chainId Chain ID
 */
export const createLowBalanceNotification = async (
  walletAddress: string,
  tokenSymbol: string,
  balance: string,
  threshold: string,
  chainId: number
): Promise<void> => {
  try {
    await createNotification({
      type: NotificationType.LOW_BALANCE,
      title: 'Low Balance Alert',
      message: `Your ${tokenSymbol} balance is low. Current balance: ${balance} ${tokenSymbol}`,
      walletAddress,
      chainId,
      data: {
        tokenSymbol,
        balance,
        threshold,
      },
    });
  } catch (error) {
    logger.error('Error creating low balance notification:', error);
  }
};

/**
 * Create a security alert notification
 * @param walletAddress Wallet address
 * @param alertType Alert type
 * @param message Alert message
 * @param data Additional data
 */
export const createSecurityAlertNotification = async (
  walletAddress: string,
  alertType: string,
  message: string,
  data?: any
): Promise<void> => {
  try {
    await createNotification({
      type: NotificationType.SECURITY_ALERT,
      title: 'Security Alert',
      message,
      walletAddress,
      data: {
        alertType,
        ...data,
      },
    });
  } catch (error) {
    logger.error('Error creating security alert notification:', error);
  }
};

/**
 * Create a price alert notification
 * @param walletAddress Wallet address
 * @param tokenSymbol Token symbol
 * @param price Current price
 * @param threshold Threshold price
 * @param direction 'above' or 'below'
 */
export const createPriceAlertNotification = async (
  walletAddress: string,
  tokenSymbol: string,
  price: string,
  threshold: string,
  direction: 'above' | 'below'
): Promise<void> => {
  try {
    const title = `${tokenSymbol} Price Alert`;
    const message = `${tokenSymbol} price is now ${direction} ${threshold}. Current price: ${price}`;
    
    await createNotification({
      type: NotificationType.PRICE_ALERT,
      title,
      message,
      walletAddress,
      data: {
        tokenSymbol,
        price,
        threshold,
        direction,
      },
    });
  } catch (error) {
    logger.error('Error creating price alert notification:', error);
  }
};

/**
 * Create a system notification
 * @param walletAddress Wallet address
 * @param title Notification title
 * @param message Notification message
 * @param data Additional data
 */
export const createSystemNotification = async (
  walletAddress: string,
  title: string,
  message: string,
  data?: any
): Promise<void> => {
  try {
    await createNotification({
      type: NotificationType.SYSTEM_NOTIFICATION,
      title,
      message,
      walletAddress,
      data,
    });
  } catch (error) {
    logger.error('Error creating system notification:', error);
  }
};

/**
 * Mark a notification as read
 * @param notificationId Notification ID
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Get notification from database
    const notification = await db.get('notifications', notificationId);
    
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }
    
    // Update notification
    notification.read = true;
    
    // Save to database
    await db.put('notifications', notification);
    
    logger.debug(`Notification ${notificationId} marked as read`);
  } catch (error) {
    logger.error(`Error marking notification ${notificationId} as read:`, error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a wallet
 * @param walletAddress Wallet address
 */
export const markAllNotificationsAsRead = async (walletAddress: string): Promise<void> => {
  try {
    const db = getDatabase();
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Get unread notifications for the wallet
    const notifications = await db.getAllFromIndex('notifications', 'by-wallet-read', [normalizedAddress, false]);
    
    // Mark each notification as read
    for (const notification of notifications) {
      notification.read = true;
      await db.put('notifications', notification);
    }
    
    logger.debug(`All notifications marked as read for ${normalizedAddress}`);
  } catch (error) {
    logger.error(`Error marking all notifications as read for ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Get notifications for a wallet
 * @param walletAddress Wallet address
 * @param limit Maximum number of notifications to return
 * @param offset Offset for pagination
 * @param unreadOnly Only return unread notifications
 * @returns Array of notifications
 */
export const getNotifications = async (
  walletAddress: string,
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  try {
    const db = getDatabase();
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Get notifications from database
    let notifications: Notification[];
    
    if (unreadOnly) {
      notifications = await db.getAllFromIndex('notifications', 'by-wallet-read', [normalizedAddress, false]);
    } else {
      notifications = await db.getAllFromIndex('notifications', 'by-wallet', normalizedAddress);
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return notifications.slice(offset, offset + limit);
  } catch (error) {
    logger.error(`Error getting notifications for ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Get unread notification count for a wallet
 * @param walletAddress Wallet address
 * @returns Unread notification count
 */
export const getUnreadNotificationCount = async (walletAddress: string): Promise<number> => {
  try {
    const db = getDatabase();
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Get unread notifications for the wallet
    const notifications = await db.getAllFromIndex('notifications', 'by-wallet-read', [normalizedAddress, false]);
    
    return notifications.length;
  } catch (error) {
    logger.error(`Error getting unread notification count for ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Get the notification service status
 * @returns Notification service status
 */
export const getNotificationServiceStatus = (): Record<string, any> => {
  const connectedWallets = Object.keys(connectedClients).length;
  const totalConnections = Object.values(connectedClients).reduce((sum, socketIds) => sum + socketIds.length, 0);
  
  return {
    status: 'active',
    connectedWallets,
    totalConnections,
  };
};
