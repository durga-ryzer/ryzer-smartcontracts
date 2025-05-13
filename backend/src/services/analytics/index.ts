import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define and export the AnalyticsEventType enum
export enum AnalyticsEventType {
  WALLET_CREATED = 'wallet_created',
  TRANSACTION_SENT = 'transaction_sent',
  TRANSACTION_RECEIVED = 'transaction_received',
  TOKEN_ADDED = 'token_added',
  TOKEN_REMOVED = 'token_removed',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SWAP_EXECUTED = 'swap_executed',
  DAPP_INTERACTION = 'dapp_interaction',
  FEATURE_USED = 'feature_used',
  ERROR_OCCURRED = 'error_occurred',
  PERFORMANCE_METRIC = 'performance_metric',
  USER_PREFERENCE = 'user_preference',
  WALLET_LOADED = 'wallet_loaded',
  TOKEN_TRANSFER = 'token_transfer'
}

// Database schema types
interface RyzerWalletDB extends DBSchema {
  analytics_events: {
    key: string;
    value: AnalyticsEvent;
    indexes: {
      'by-timestamp': string;
      'by-wallet': string;
      'by-type': string;
    };
  };
  analytics_sessions: {
    key: string;
    value: AnalyticsSession;
    indexes: {
      'by-wallet': string;
    };
  };
  analytics_aggregated: {
    key: string;
    value: AnalyticsAggregated;
    indexes: {
      'by-period': string;
    };
  };
}

// Interface definitions
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  walletAddress?: string;
  chainId?: number;
  data?: any;
  sessionId?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    screenSize?: string;
    language?: string;
    ip?: string;
  };
}

export interface AnalyticsSession {
  id: string;
  walletAddress: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    screenSize?: string;
    language?: string;
    ip?: string;
  };
  events: string[];
}

export interface AnalyticsAggregated {
  id: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  date: string;
  timestamp: number;
  metrics: Record<string, number>;
  networks: Record<string, any>;
  events: Record<string, number>;
  uniqueUsers: number;
  newUsers: number;
  activeUsers: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  eventTypeCounts: Record<string, number>;
  chainActivity: Record<number, number>;
}

// Define a simple polyfill for KeyRange for Node.js environment
const KeyRange = {
  bound: (lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean) => ({ lower, upper, lowerOpen, upperOpen }),
  lowerBound: (lower: any, open?: boolean) => ({ lower, open }),
  upperBound: (upper: any, open?: boolean) => ({ upper, open }),
  only: (value: any) => ({ value })
};

// User session interface with events array for backward compatibility
interface UserSession extends AnalyticsSession {
  events: string[]; // Array of event IDs
}

// Active user sessions
const activeSessions: Record<string, UserSession> = {};

// Constants for time intervals
const ONE_HOUR_MS = 3600000;
const ONE_DAY_MS = 86400000;
const ONE_WEEK_MS = 604800000;
const ONE_MONTH_MS = 2592000000;

/**
 * Initialize the analytics service
 */
export const initializeAnalyticsService = async (): Promise<void> => {
  try {
    logger.info('Initializing analytics service...');
    
    const db = getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Initialize analytics aggregation job
    setInterval(aggregateAnalyticsData, ONE_HOUR_MS); // Run every hour
    
    logger.info('Analytics service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize analytics service:', error);
    throw error;
  }
};

/**
 * Track an analytics event
 * @param type Event type
 * @param data Event data
 * @param walletAddress Wallet address
 * @param sessionId Session ID
 * @param chainId Chain ID
 * @param deviceInfo Device information
 * @returns Event ID
 */
export const trackEvent = async (
  type: AnalyticsEventType,
  data: Record<string, any>, // More specific type
  walletAddress?: string,
  sessionId?: string,
  chainId?: number,
  deviceInfo?: Record<string, any>
): Promise<string> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Create event object
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      walletAddress,
      timestamp: Date.now(),
      data,
      sessionId,
      chainId,
      deviceInfo,
    };
    
    // Store event in database
    const tx = db.transaction('analytics_events', 'readwrite');
    const store = tx.objectStore('analytics_events');
    await store.add(event);
    await tx.done;
    
    // Update session if available
    if (sessionId && activeSessions[sessionId]) {
      activeSessions[sessionId].events.push(event.id);
    }
    
    logger.debug(`Analytics event tracked: ${type}`);
    
    return event.id;
  } catch (error) {
    logger.error('Error tracking analytics event:', error);
    throw error;
  }
};

/**
 * Start a user session
 * @param walletAddress Wallet address
 * @param deviceInfo Device information
 * @returns Session ID
 */
export const startSession = async (
  walletAddress: string,
  deviceInfo?: any
): Promise<string> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Create session object
    const session: UserSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      walletAddress,
      startTime: Date.now(),
      deviceInfo,
      events: [],
    };
    
    // Store session in database
    const tx = db.transaction('analytics_sessions', 'readwrite');
    const store = tx.objectStore('analytics_sessions');
    await store.add(session);
    await tx.done;
    
    // Add to active sessions
    activeSessions[session.id] = session;
    
    logger.debug(`User session started: ${session.id}`);
    
    return session.id;
  } catch (error) {
    logger.error('Error starting user session:', error);
    throw error;
  }
};

/**
 * End a user session
 * @param sessionId Session ID
 */
export const endSession = async (sessionId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Get session from active sessions
    const session = activeSessions[sessionId];
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Update session
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    // Save to database
    const tx = db.transaction('analytics_sessions', 'readwrite');
    const store = tx.objectStore('analytics_sessions');
    await store.put(session);
    await tx.done;
    
    // Remove from active sessions
    delete activeSessions[sessionId];
    
    logger.debug(`User session ended: ${sessionId}`);
  } catch (error) {
    logger.error(`Error ending user session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Aggregate analytics data
 */
const aggregateAnalyticsData = async (): Promise<void> => {
  try {
    const dbPromise = getDatabase();
    const db = await dbPromise;
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const now = Date.now();
    const hourAgo = now - ONE_HOUR_MS;
    const dayAgo = now - ONE_DAY_MS;
    const weekAgo = now - ONE_WEEK_MS;
    const monthAgo = now - ONE_MONTH_MS;
    
    // Get events from the last hour
    const tx = db.transaction('analytics_events', 'readonly');
    const eventStore = tx.objectStore('analytics_events');
    const recentEvents = (await eventStore.index('by-timestamp').getAll(KeyRange.lowerBound(hourAgo))) as AnalyticsEvent[];
    
    // Aggregate by event type
    const eventTypeCounts: Record<string, number> = {};
    const chainActivity: Record<number, number> = {};
    const walletActivity: Record<string, number> = {};
    
    for (const event of recentEvents) {
      // Count by event type
      eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
      
      // Count by chain ID
      if (event.chainId) {
        chainActivity[event.chainId] = (chainActivity[event.chainId] || 0) + 1;
      }
      
      // Count by wallet address
      if (event.walletAddress) {
        walletActivity[event.walletAddress] = (walletActivity[event.walletAddress] || 0) + 1;
      }
    }
    
    // Calculate active users
    const hourlyActiveUsers = Object.keys(walletActivity).length;
    
    // Get events from the last day
    const dailyTx = db.transaction('analytics_events', 'readonly');
    const dailyStore = dailyTx.objectStore('analytics_events');
    const dailyEvents = await dailyStore.index('by-timestamp').getAll(KeyRange.lowerBound(dayAgo));
    const dailyWallets = new Set<string>();
    
    for (const event of dailyEvents) {
      if (event.walletAddress) {
        dailyWallets.add(event.walletAddress);
      }
    }
    
    const dailyActiveUsers = dailyWallets.size;
    
    // Get events from the last week
    const weeklyTx = db.transaction('analytics_events', 'readonly');
    const weeklyStore = weeklyTx.objectStore('analytics_events');
    const weeklyEvents = await weeklyStore.index('by-timestamp').getAll(KeyRange.lowerBound(weekAgo));
    const weeklyWallets = new Set<string>();
    
    for (const event of weeklyEvents) {
      if (event.walletAddress) {
        weeklyWallets.add(event.walletAddress);
      }
    }
    
    const weeklyActiveUsers = weeklyWallets.size;
    
    // Get events from the last month
    const monthlyTx = db.transaction('analytics_events', 'readonly');
    const monthlyStore = monthlyTx.objectStore('analytics_events');
    const monthlyEvents = await monthlyStore.index('by-timestamp').getAll(KeyRange.lowerBound(monthAgo));
    const monthlyWallets = new Set<string>();
    
    for (const event of monthlyEvents) {
      if (event.walletAddress) {
        monthlyWallets.add(event.walletAddress);
      }
    }
    
    const monthlyActiveUsers = monthlyWallets.size;
    
    // Store aggregated data
    const aggregatedData: AnalyticsAggregated = {
      id: `${Date.now()}`,
      period: 'daily',
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      metrics: {},
      networks: {},
      events: eventTypeCounts,
      uniqueUsers: Object.keys(walletActivity).length,
      newUsers: 0,
      activeUsers: {
        hourly: hourlyActiveUsers,
        daily: dailyActiveUsers,
        weekly: weeklyActiveUsers,
        monthly: monthlyActiveUsers,
      },
      eventTypeCounts,
      chainActivity,
    };
    
    const writeTx = db.transaction('analytics_aggregated', 'readwrite');
    const aggregatedStore = writeTx.objectStore('analytics_aggregated');
    await aggregatedStore.add(aggregatedData);
    await writeTx.done;
    
    logger.debug('Analytics data aggregated successfully');
  } catch (error) {
    logger.error('Error aggregating analytics data:', error);
  }
};

/**
 * Get analytics dashboard data
 * @returns Dashboard data
 */
export const getDashboardData = async (): Promise<Record<string, any>> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const tx = db.transaction('analytics_aggregated', 'readonly');
    const aggregatedStore = tx.objectStore('analytics_aggregated');
    const aggregatedData = await aggregatedStore.index('by-period').getAll(KeyRange.lowerBound('daily'));
    
    if (aggregatedData.length === 0) {
      return {
        activeUsers: {
          hourly: 0,
          daily: 0,
          weekly: 0,
          monthly: 0,
        },
        eventTypeCounts: {},
        chainActivity: {},
      };
    }
    
    const latestData = aggregatedData[0];
    
    // Get transaction volume data
    const now = Date.now();
    const dayAgo = now - ONE_DAY_MS;
    
    const eventsTx = db.transaction('analytics_events', 'readonly');
    const eventsStore = eventsTx.objectStore('analytics_events');
    const recentTransactions = await eventsStore.index('by-type').getAll(KeyRange.lowerBound(dayAgo));
    
    let totalVolume = 0;
    const volumeByChain: Record<number, number> = {};
    
    for (const event of recentTransactions) {
      if (event.data && event.data.value) {
        const value = parseFloat(event.data.value);
        if (!isNaN(value)) {
          totalVolume += value;
          
          if (event.chainId) {
            volumeByChain[event.chainId] = (volumeByChain[event.chainId] || 0) + value;
          }
        }
      }
    }
    
    return {
      activeUsers: latestData.activeUsers || {
        hourly: 0,
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      eventTypeCounts: latestData.eventTypeCounts || {},
      chainActivity: latestData.chainActivity || {},
      transactionVolume: {
        total: totalVolume,
        byChain: volumeByChain,
      },
    };
  } catch (error) {
    logger.error('Error getting analytics dashboard data:', error);
    throw error;
  }
};

/**
 * Get user activity data
 * @param walletAddress Wallet address
 * @returns User activity data
 */
export const getUserActivityData = async (walletAddress: string): Promise<any> => {
  try {
    const dbPromise = getDatabase();
    const db = await dbPromise;
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Get events for the wallet
    const eventsTx = db.transaction('analytics_events', 'readonly');
    const eventsStore = eventsTx.objectStore('analytics_events');
    const events = (await eventsStore.index('by-wallet').getAll(normalizedAddress)) as AnalyticsEvent[];
    
    // Get sessions for the wallet
    const sessionsTx = db.transaction('analytics_sessions', 'readonly');
    const sessionsStore = sessionsTx.objectStore('analytics_sessions');
    const sessions = (await sessionsStore.index('by-wallet').getAll(normalizedAddress)) as AnalyticsSession[];
    
    // Calculate total session duration
    let totalDuration = 0;
    for (const session of sessions) {
      if (session.duration) {
        totalDuration += session.duration;
      }
    }
    
    // Count events by type
    const eventTypeCounts: Record<string, number> = {};
    for (const event of events) {
      eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
    }
    
    // Count events by chain
    const chainActivity: Record<number, number> = {};
    for (const event of events) {
      if (event.chainId) {
        chainActivity[event.chainId] = (chainActivity[event.chainId] || 0) + 1;
      }
    }
    
    // Get recent transactions
    const transactions = events.filter((event: AnalyticsEvent) => event.type === AnalyticsEventType.TRANSACTION_SENT);
    
    // Calculate transaction volume
    let totalVolume = 0;
    for (const tx of transactions) {
      if (tx.data.value) {
        const value = parseFloat(tx.data.value);
        if (!isNaN(value)) {
          totalVolume += value;
        }
      }
    }
    
    return {
      walletAddress: normalizedAddress,
      totalEvents: events.length,
      totalSessions: sessions.length,
      totalSessionDuration: totalDuration,
      eventTypeCounts,
      chainActivity,
      transactionCount: transactions.length,
      transactionVolume: totalVolume,
      firstActivity: events.length > 0 ? Math.min(...events.map((e: AnalyticsEvent) => e.timestamp)) : null,
      lastActivity: events.length > 0 ? Math.max(...events.map((e: AnalyticsEvent) => e.timestamp)) : null,
    };
  } catch (error) {
    logger.error(`Error getting user activity data for ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Get the analytics service status
 * @returns Analytics service status
 */
export const getAnalyticsServiceStatus = (): Record<string, any> => {
  return {
    status: 'active',
    activeSessions: Object.keys(activeSessions).length,
  };
};

/**
 * Get wallet usage statistics
 * @param walletAddress Wallet address
 * @param startDate Optional start date (YYYY-MM-DD)
 * @param endDate Optional end date (YYYY-MM-DD)
 * @returns Wallet statistics
 */
export const getWalletStats = async (
  walletAddress: string,
  startDate?: string,
  endDate?: string
): Promise<Record<string, any>> => {
  try {
    const dbPromise = getDatabase();
    const db = await dbPromise;
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Parse date range
    let startTimestamp = 0;
    let endTimestamp = Date.now();
    
    if (startDate) {
      startTimestamp = new Date(startDate).getTime();
    }
    
    if (endDate) {
      endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
    }
    
    // Get events for this wallet within the date range
    const eventsTx = db.transaction('analytics_events', 'readonly');
    const eventsStore = eventsTx.objectStore('analytics_events');
    const events = (await eventsStore.index('by-wallet').getAll(normalizedAddress)) as AnalyticsEvent[];
    
    // Filter events by date range
    const filteredEvents = events.filter(event => {
      return event.timestamp >= startTimestamp && event.timestamp <= endTimestamp;
    });
    
    // Count events by type
    const eventCounts: Record<string, number> = {};
    const chainActivity: Record<string, number> = {};
    let totalTransactions = 0;
    let totalGasSpent = 0;
    let totalSwaps = 0;
    let totalDappInteractions = 0;
    
    for (const event of filteredEvents) {
      // Count by event type
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
      
      // Count by chain
      if (event.chainId) {
        chainActivity[event.chainId] = (chainActivity[event.chainId] || 0) + 1;
      }
      
      // Count specific metrics
      if (event.type === AnalyticsEventType.TRANSACTION_SENT) {
        totalTransactions++;
        
        // Add gas costs if available
        if (event.data && event.data.gasUsed && event.data.gasPrice) {
          const gasUsed = BigInt(event.data.gasUsed);
          const gasPrice = BigInt(event.data.gasPrice);
          const gasCost = gasUsed * gasPrice;
          totalGasSpent += Number(gasCost) / 1e18; // Convert to ETH equivalent
        }
      } else if (event.type === AnalyticsEventType.SWAP_EXECUTED) {
        totalSwaps++;
      } else if (event.type === AnalyticsEventType.DAPP_INTERACTION) {
        totalDappInteractions++;
      }
    }
    
    // Get sessions for this wallet
    const sessions = await db.getAllFromIndex('analytics_sessions', 'by-wallet', normalizedAddress);
    
    // Filter sessions by date range
    const filteredSessions = sessions.filter(session => {
      return session.startTime >= startTimestamp && session.startTime <= endTimestamp;
    });
    
    // Calculate session metrics
    const totalSessions = filteredSessions.length;
    let totalSessionDuration = 0;
    
    for (const session of filteredSessions) {
      if (session.duration) {
        totalSessionDuration += session.duration;
      }
    }
    
    // Calculate average session duration in minutes
    const avgSessionDuration = totalSessions > 0 ? totalSessionDuration / totalSessions / 60000 : 0;
    
    // Return stats
    return {
      period: {
        start: startDate || 'all-time',
        end: endDate || 'now',
      },
      activity: {
        totalEvents: filteredEvents.length,
        eventBreakdown: eventCounts,
        totalTransactions,
        totalGasSpent: totalGasSpent.toFixed(6),
        totalSwaps,
        totalDappInteractions,
      },
      sessions: {
        count: totalSessions,
        averageDurationMinutes: avgSessionDuration.toFixed(2),
      },
      networks: chainActivity,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Error getting wallet stats for ${walletAddress}:`, error);
    throw error;
  }
};
