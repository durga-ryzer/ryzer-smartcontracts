// Define types for analytics events
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

// Define database store types
export type DatabaseStore = 
  | 'users' 
  | 'transactions' 
  | 'wallets' 
  | 'tokens' 
  | 'settings' 
  | 'events' 
  | 'sessions' 
  | 'analytics_aggregated'
  | 'analytics_events'
  | 'analytics_sessions'
  | 'pendingTransactions'
  | 'batches'
  | 'simulationRequests'
  | 'simulationResults'
  | 'crossChainTransactions'
  | 'recoveryConfigs'
  | 'recoveryRequests'
  | 'recoveryBackups'
  | 'notifications';

// Define analytics event data type
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  walletAddress?: string;
  chainId?: number;
  data?: any;
  sessionId?: string;
  deviceInfo?: any;
}

// Define analytics session data type
export interface AnalyticsSession {
  id: string;
  walletAddress: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  deviceInfo?: any;
  lastActivity?: number;
}

// Define analytics aggregated data type
export interface AnalyticsAggregated {
  id: string;
  period: string;
  date: string;
  timestamp: number;
  metrics: Record<string, number>;
  networks: Record<string, number>;
  events: Record<string, number>;
  uniqueUsers: number;
  newUsers: number;
  activeUsers?: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  eventTypeCounts?: Record<string, number>;
  chainActivity?: Record<number, number>;
}

// Define wallet info type
export interface WalletInfo {
  address: string;
  type: 'eoa' | 'smart';
  chainId: number;
  deployedAt?: number;
  guardian?: string;
  recoveryEmail?: string;
  owner?: string;
  custodians?: string[];
  brokers?: string[];
  threshold?: number;
  txHash?: string;
  createdAt?: number;
}

// Define token type
export interface Token {
  id: string;
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  balance?: string;
  lastUpdated?: number;
  walletAddress?: string;
}

// Define user type
export interface User {
  address: string;
  email?: string;
  username?: string;
  createdAt: number;
  lastLogin?: number;
  nonce: string;
  nonceTimestamp?: number;
}

// Define transaction type
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  data?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: number;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  category?: string;
  asset?: string;
  tokenId?: string;
}

// Define notification type
export interface Notification {
  id: string;
  type: 'transaction' | 'security' | 'system' | 'update' | 'recovery' | 'crosschain';
  title: string;
  message: string;
  recipient: string;
  read: boolean;
  timestamp: number;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
  action?: string;
  actionUrl?: string;
}

// Define authenticated user type for request objects
import { UserRole } from '../services/rbac';

export interface AuthUser {
  walletAddress: string;
  isAdmin?: boolean;
  roles: UserRole[];
  sessionId?: string;
  ipAddress?: string;
  lastLogin?: number;
  chainId?: number;
}
