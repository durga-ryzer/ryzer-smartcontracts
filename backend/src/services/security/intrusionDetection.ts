import { logger } from '../../utils/logger';
import { militaryGradeEncryption } from './militaryGradeEncryption';

/**
 * Security event types for intrusion detection
 */
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  SUCCESSFUL_AUTH = 'successful_auth',
  FAILED_AUTH = 'failed_auth',
  KEY_GENERATION = 'key_generation',
  KEY_EXPORT = 'key_export',
  TRANSACTION_SIGNED = 'transaction_signed',
  MESSAGE_SIGNED = 'message_signed',
  SETTINGS_CHANGE = 'settings_change',
  RECOVERY_ATTEMPT = 'recovery_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  LOCKDOWN_INITIATED = 'lockdown_initiated',
  LOCKDOWN_RELEASED = 'lockdown_released'
}

/**
 * Security event data structure
 */
export interface SecurityEvent {
  eventId: string;
  userId: string;
  eventType: SecurityEventType;
  eventData: any;
  ipAddress: string;
  timestamp: number;
}

/**
 * Result of intrusion analysis
 */
export interface IntrusionAnalysisResult {
  allowed: boolean;
  reason: string;
  riskScore: number;
  actionTaken: 'allowed' | 'additional_verification' | 'account_locked' | 'blocked';
}

/**
 * Intrusion Detection and Prevention Service
 * 
 * Provides military-grade security through advanced intrusion detection
 * and prevention mechanisms for wallet operations.
 */
export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;
  
  // Maps to store security events and anomaly scores
  private securityEvents: Map<string, SecurityEvent[]> = new Map();
  private userAnomalyScores: Map<string, number> = new Map();
  private ipBlacklist: Set<string> = new Set();
  private userLockouts: Map<string, number> = new Map();
  
  // Constants
  private readonly ANOMALY_THRESHOLD = 0.7; // 0.0 to 1.0
  private readonly EVENT_RETENTION_DAYS = 90;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  
  private constructor() {
    // Start periodic cleanup of old events
    setInterval(() => this.cleanupOldEvents(), 24 * 60 * 60 * 1000); // Daily
  }
  
  /**
   * Get the singleton instance of IntrusionDetectionService
   */
  public static getInstance(): IntrusionDetectionService {
    if (!IntrusionDetectionService.instance) {
      IntrusionDetectionService.instance = new IntrusionDetectionService();
    }
    return IntrusionDetectionService.instance;
  }
  
  /**
   * Reset anomaly score for a user
   * @param userId User identifier
   */
  public resetAnomalyScore(userId: string): void {
    this.userAnomalyScores.set(userId, 0);
    logger.info(`Reset anomaly score for user: ${userId}`);
    
    // Also clear any lockouts for this user
    if (this.userLockouts.has(userId)) {
      this.userLockouts.delete(userId);
      logger.info(`Cleared lockout for user: ${userId}`);
    }
  }

  /**
   * Check if an operation is allowed based on security policies
   * @param userId User identifier
   * @param operationType Type of operation being performed
   * @param operationData Additional data about the operation
   * @returns Analysis result indicating if operation is allowed
   */
  public isOperationAllowed(
    userId: string,
    operationType: string,
    operationData: any
  ): IntrusionAnalysisResult {
    try {
      // Get current anomaly score for user
      const anomalyScore = this.userAnomalyScores.get(userId) || 0;
      
      // Check if user is locked out
      const lockoutTime = this.userLockouts.get(userId);
      if (lockoutTime && Date.now() < lockoutTime) {
        const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / (60 * 1000));
        logger.warn(`Operation blocked for locked out user: ${userId}`);
        return {
          allowed: false,
          reason: `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`,
          riskScore: 1.0,
          actionTaken: 'blocked'
        };
      }
      
      // Check anomaly score against threshold
      if (anomalyScore >= this.ANOMALY_THRESHOLD) {
        logger.warn(`Operation blocked due to high risk score (${anomalyScore}) for user: ${userId}`);
        return {
          allowed: false,
          reason: 'Security risk score exceeds threshold',
          riskScore: anomalyScore,
          actionTaken: 'additional_verification'
        };
      }
      
      // Check operation-specific rules
      if (operationType === 'key_export' || operationType === 'high_value_transaction') {
        // These operations require additional scrutiny
        if (anomalyScore >= this.ANOMALY_THRESHOLD * 0.7) {
          logger.warn(`Sensitive operation ${operationType} requires additional verification for user: ${userId}`);
          return {
            allowed: false,
            reason: 'Sensitive operation requires additional verification',
            riskScore: anomalyScore,
            actionTaken: 'additional_verification'
          };
        }
      }
      
      // Operation is allowed
      return {
        allowed: true,
        reason: 'Operation allowed',
        riskScore: anomalyScore,
        actionTaken: 'allowed'
      };
    } catch (error) {
      logger.error('Error checking operation permission:', error);
      // Default to blocking on error
      return {
        allowed: false,
        reason: 'Security check failed',
        riskScore: 1.0,
        actionTaken: 'blocked'
      };
    }
  }
  
  /**
   * Record a security event and analyze for potential intrusions
   * @param userId User identifier
   * @param eventType Type of security event
   * @param eventData Event data
   * @returns Analysis result
   */
  public recordEvent(
    userId: string,
    eventType: SecurityEventType,
    eventData: any
  ): IntrusionAnalysisResult {
    try {
      // Create security event
      const event: SecurityEvent = {
        userId,
        eventType,
        eventData,
        ipAddress: eventData?.ipAddress || '0.0.0.0',
        timestamp: Date.now(),
        eventId: militaryGradeEncryption.generateNonce(16)
      };
      
      // Store event
      const userEvents = this.securityEvents.get(userId) || [];
      userEvents.push(event);
      this.securityEvents.set(userId, userEvents);
      
      // Analyze event for anomalies
      const anomalyScore = this.analyzeEvent(event, userEvents);
      
      // Update user anomaly score (weighted average)
      const currentScore = this.userAnomalyScores.get(userId) || 0;
      const newScore = (currentScore * 0.7) + (anomalyScore * 0.3);
      this.userAnomalyScores.set(userId, newScore);
      
      // Determine action based on anomaly score
      let actionTaken: 'allowed' | 'additional_verification' | 'account_locked' | 'blocked' = 'allowed';
      let reason = 'Event recorded';
      
      if (newScore >= this.ANOMALY_THRESHOLD) {
        // Lock the account if score is too high
        this.userLockouts.set(userId, Date.now() + this.LOCKOUT_DURATION);
        actionTaken = 'account_locked';
        reason = 'Account locked due to suspicious activity';
        logger.warn(`Account locked for user ${userId} due to high risk score: ${newScore}`);
      } else if (newScore >= this.ANOMALY_THRESHOLD * 0.7) {
        actionTaken = 'additional_verification';
        reason = 'Additional verification required due to elevated risk';
        logger.info(`Additional verification required for user ${userId}, risk score: ${newScore}`);
      }
      
      return {
        allowed: actionTaken === 'allowed',
        reason,
        riskScore: newScore,
        actionTaken
      };
    } catch (error) {
      logger.error('Error recording security event:', error);
      return {
        allowed: false,
        reason: 'Error processing security event',
        riskScore: 1.0,
        actionTaken: 'blocked'
      };
    }
  }
  
  /**
   * Analyze a security event for anomalies
   * @param event Current event to analyze
   * @param userEvents Previous events for the user
   * @returns Anomaly score between 0.0 and 1.0
   */
  private analyzeEvent(event: SecurityEvent, userEvents: SecurityEvent[]): number {
    // Base risk score
    let riskScore = 0.1;
    
    // Analyze based on event type
    switch (event.eventType) {
      case SecurityEventType.FAILED_AUTH:
        // Count recent failed auth attempts
        const recentFailedAttempts = userEvents
          .filter(e => e.eventType === SecurityEventType.FAILED_AUTH)
          .filter(e => e.timestamp > Date.now() - 30 * 60 * 1000) // Last 30 minutes
          .length;
        
        // Increase risk score based on number of failed attempts
        riskScore += Math.min(recentFailedAttempts * 0.1, 0.5);
        break;
        
      case SecurityEventType.KEY_EXPORT:
        // Key exports are sensitive operations
        riskScore += 0.3;
        
        // Check if this is an unusual time for this user
        const userActiveHours = this.getUserActiveHours(userEvents);
        const currentHour = new Date().getHours();
        if (!userActiveHours.includes(currentHour)) {
          riskScore += 0.2;
        }
        break;
        
      case SecurityEventType.TRANSACTION_SIGNED:
        // Check transaction amount if available
        const amount = parseFloat(event.eventData?.amount || '0');
        if (amount > 0) {
          // Get user's average transaction amount
          const avgAmount = this.getUserAverageTransactionAmount(userEvents);
          if (amount > avgAmount * 5) {
            // Transaction amount is significantly higher than average
            riskScore += 0.3;
          }
        }
        break;
    }
    
    return Math.min(riskScore, 1.0);
  }
  
  /**
   * Get the hours during which a user is typically active
   * @param userEvents User's event history
   * @returns Array of hours (0-23) when the user is typically active
   */
  private getUserActiveHours(userEvents: SecurityEvent[]): number[] {
    // Get events from the last 30 days
    const recentEvents = userEvents.filter(e => e.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Count events by hour
    const hourCounts = new Array(24).fill(0);
    recentEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    // Consider hours with at least 5% of total activity as "active hours"
    const totalEvents = recentEvents.length;
    const threshold = Math.max(1, totalEvents * 0.05);
    
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count >= threshold)
      .map(({ hour }) => hour);
  }
  
  /**
   * Calculate the user's average transaction amount
   * @param userEvents User's event history
   * @returns Average transaction amount
   */
  private getUserAverageTransactionAmount(userEvents: SecurityEvent[]): number {
    const transactions = userEvents
      .filter(e => e.eventType === SecurityEventType.TRANSACTION_SIGNED)
      .filter(e => e.eventData?.amount)
      .map(e => parseFloat(e.eventData.amount));
    
    if (transactions.length === 0) {
      return 0;
    }
    
    const sum = transactions.reduce((total, amount) => total + amount, 0);
    return sum / transactions.length;
  }
  
  /**
   * Clean up old security events to manage memory usage
   */
  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (this.EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    // Iterate through all users and their events
    for (const [userId, events] of this.securityEvents.entries()) {
      // Filter out old events
      const filteredEvents = events.filter(e => e.timestamp >= cutoffTime);
      
      if (filteredEvents.length === 0) {
        // Remove empty event arrays
        this.securityEvents.delete(userId);
      } else if (filteredEvents.length !== events.length) {
        // Update with filtered events
        this.securityEvents.set(userId, filteredEvents);
        logger.debug(`Cleaned up ${events.length - filteredEvents.length} old events for user ${userId}`);
      }
    }
  }
      
      // Check if user is locked out
      const lockoutTime = this.userLockouts.get(userId);
      if (lockoutTime && Date.now() < lockoutTime) {
        const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / (60 * 1000));
        logger.warn(`Operation blocked for locked out user: ${userId}`);
        return {
          allowed: false,
          reason: `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`,
          riskScore: 1.0,
          actionTaken: 'blocked'
        };
      }
      
      // Check anomaly score against threshold
      if (anomalyScore >= this.ANOMALY_THRESHOLD) {
        logger.warn(`Operation blocked due to high risk score (${anomalyScore}) for user: ${userId}`);
        return {
          allowed: false,
          reason: 'Security risk score exceeds threshold',
          riskScore: anomalyScore,
          actionTaken: 'additional_verification'
        };
      }
      
      // Check operation-specific rules
      if (operationType === 'key_export' || operationType === 'high_value_transaction') {
        // These operations require additional scrutiny
        if (anomalyScore >= this.ANOMALY_THRESHOLD * 0.7) {
          logger.warn(`Sensitive operation ${operationType} requires additional verification for user: ${userId}`);
          return {
            allowed: false,
            reason: 'Sensitive operation requires additional verification',
            riskScore: anomalyScore,
            actionTaken: 'additional_verification'
          };
        }
      }
      
      // Operation is allowed
      return {
        allowed: true,
        reason: 'Operation allowed',
        riskScore: anomalyScore,
        actionTaken: 'allowed'
      };
    } catch (error) {
      logger.error('Error checking operation permission:', error);
      // Default to blocking on error
      return {
        allowed: false,
        reason: 'Security check failed',
        riskScore: 1.0,
        actionTaken: 'blocked'
      };
    }
  }
  
  /**
   * Record a security event and analyze for potential intrusions
   * @param userId User identifier
   * @param eventType Type of security event
   * @param eventData Event data
   * @param ipAddress IP address associated with the event
   * @returns Analysis result
   */
  public recordEvent(
    userId: string,
    eventType: SecurityEventType,
    eventData: any,
    ipAddress: string
  ): IntrusionAnalysisResult {
    try {
      // Check if IP is blacklisted
      if (this.ipBlacklist.has(ipAddress)) {
        logger.warn(`Blocked request from blacklisted IP: ${ipAddress}`);
        return {
          allowed: false,
          reason: 'IP address is blacklisted',
          riskScore: 1.0,
          actionTaken: 'blocked'
        };
      }
      
      // Check if user is locked out
      const lockoutTime = this.userLockouts.get(userId);
      if (lockoutTime && Date.now() < lockoutTime) {
        const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / (60 * 1000));
        logger.warn(`Blocked request from locked out user: ${userId}`);
        return {
          allowed: false,
          reason: `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`,
          riskScore: 1.0,
          actionTaken: 'blocked'
        };
      }
      
      // Create security event
      const event: SecurityEvent = {
        userId,
        eventType,
        eventData,
        ipAddress,
        timestamp: Date.now(),
        eventId: militaryGradeEncryption.generateNonce(16)
      };
      
      // Store event
      const userEvents = this.securityEvents.get(userId) || [];
      userEvents.push(event);
      this.securityEvents.set(userId, userEvents);
      
      // Analyze event for anomalies
      const anomalyScore = this.analyzeEvent(event, userEvents);
      
      // Update user anomaly score (weighted average)
      const currentScore = this.userAnomalyScores.get(userId) || 0;
      const newScore = (currentScore * 0.7) + (anomalyScore * 0.3);
      this.userAnomalyScores.set(userId, newScore);
      
      // Determine action based on anomaly score
      let actionTaken = 'allowed';
      let allowed = true;
      let reason = 'Operation allowed';
      
      if (newScore >= this.ANOMALY_THRESHOLD) {
        if (newScore >= 0.9) {
          // High risk - lock account
          this.userLockouts.set(userId, Date.now() + this.LOCKOUT_DURATION);
          actionTaken = 'account_locked';
          allowed = false;
          reason = 'Suspicious activity detected. Account temporarily locked.';
          
          // If multiple high-risk events from same IP, blacklist it
          const highRiskEventsFromIP = userEvents.filter(e => 
            e.ipAddress === ipAddress && 
            Date.now() - e.timestamp < 24 * 60 * 60 * 1000
          ).length;
          
          if (highRiskEventsFromIP >= 3) {
            this.ipBlacklist.add(ipAddress);
            logger.warn(`IP address ${ipAddress} blacklisted due to multiple high-risk events`);
          }
        } else {
          // Medium risk - require additional verification
          actionTaken = 'additional_verification';
          allowed = true;
          reason = 'Additional verification required due to unusual activity';
        }
      }
      
      // Log the security event
      if (newScore > 0.5) {
        logger.warn(`Security event: ${eventType} for user ${userId}, risk score: ${newScore.toFixed(2)}`);
      } else {
        logger.info(`Security event: ${eventType} for user ${userId}, risk score: ${newScore.toFixed(2)}`);
      }
      
      return {
        allowed,
        reason,
        riskScore: newScore,
        actionTaken: actionTaken as 'allowed' | 'additional_verification' | 'account_locked' | 'blocked'
      };
    } catch (error) {
      logger.error(`Failed to record security event:`, error);
      // Default to secure behavior on error
      return {
        allowed: false,
        reason: 'Security system error',
        riskScore: 1.0,
        actionTaken: 'blocked'
      };
    }
  }
  
  /**
   * Check if an operation is allowed based on security rules
   * @param userId User identifier
   * @param operationType Type of operation
   * @param operationData Operation data
   * @param ipAddress IP address
   * @returns Whether the operation is allowed
   */
  public isOperationAllowed(
    userId: string,
    operationType: 'transaction' | 'key_export' | 'settings_change' | 'recovery',
    operationData: any,
    ipAddress: string
  ): IntrusionAnalysisResult {
    // Map operation type to security event type
    let eventType: SecurityEventType;
    switch (operationType) {
      case 'transaction':
        eventType = SecurityEventType.TRANSACTION_ATTEMPT;
        break;
      case 'key_export':
        eventType = SecurityEventType.KEY_EXPORT_ATTEMPT;
        break;
      case 'settings_change':
        eventType = SecurityEventType.SETTINGS_CHANGE;
        break;
      case 'recovery':
        eventType = SecurityEventType.RECOVERY_ATTEMPT;
        break;
      default:
        eventType = SecurityEventType.OTHER;
    }
    
    // Record and analyze the event
    return this.recordEvent(userId, eventType, operationData, ipAddress);
  }
  
  /**
   * Record a failed authentication attempt
   * @param userId User identifier
   * @param authMethod Authentication method that failed
   * @param ipAddress IP address
   */
  public recordFailedAuth(userId: string, authMethod: string, ipAddress: string): void {
    this.recordEvent(
      userId,
      SecurityEventType.FAILED_AUTH,
      { authMethod },
      ipAddress
    );
  }
  
  /**
   * Record a successful authentication
   * @param userId User identifier
   * @param authMethod Authentication method used
   * @param ipAddress IP address
   */
  public recordSuccessfulAuth(userId: string, authMethod: string, ipAddress: string): void {
    this.recordEvent(
      userId,
      SecurityEventType.SUCCESSFUL_AUTH,
      { authMethod },
      ipAddress
    );
  }
  
  /**
   * Analyze a security event for anomalies
   * @param event Security event to analyze
   * @param userEvents Previous events for the user
   * @returns Anomaly score (0.0 to 1.0)
   */
  private analyzeEvent(event: SecurityEvent, userEvents: SecurityEvent[]): number {
    // Get recent events (last 30 days)
    const recentEvents = userEvents.filter(e => 
      Date.now() - e.timestamp < 30 * 24 * 60 * 60 * 1000
    );
    
    let anomalyScore = 0;
    
    // Check for unusual IP address
    const userIPs = new Set(recentEvents.map(e => e.ipAddress));
    if (!userIPs.has(event.ipAddress) && userIPs.size > 0) {
      // New IP address
      anomalyScore += 0.3;
    }
    
    // Check for unusual time pattern
    const eventHour = new Date(event.timestamp).getHours();
    const userActivityHours = recentEvents.map(e => new Date(e.timestamp).getHours());
    const isUnusualHour = !userActivityHours.includes(eventHour);
    if (isUnusualHour && userActivityHours.length > 5) {
      anomalyScore += 0.2;
    }
    
    // Check for high-frequency events
    const last10MinEvents = recentEvents.filter(e => 
      Date.now() - e.timestamp < 10 * 60 * 1000
    );
    if (last10MinEvents.length > 10) {
      anomalyScore += 0.3;
    }
    
    // Check for failed authentication patterns
    if (event.eventType === SecurityEventType.FAILED_AUTH) {
      const recentFailedAuths = recentEvents.filter(e => 
        e.eventType === SecurityEventType.FAILED_AUTH &&
        Date.now() - e.timestamp < 30 * 60 * 1000
      );
      
      if (recentFailedAuths.length >= 3) {
        anomalyScore += 0.4;
      }
    }
    
    // Check for unusual transaction patterns
    if (event.eventType === SecurityEventType.TRANSACTION_ATTEMPT) {
      const userTransactions = recentEvents.filter(e => 
        e.eventType === SecurityEventType.TRANSACTION_ATTEMPT ||
        e.eventType === SecurityEventType.TRANSACTION_EXECUTED
      );
      
      // Check for unusual transaction amount
      const transactionAmounts = userTransactions.map(e => parseFloat(e.eventData?.value || '0'));
      const avgAmount = transactionAmounts.reduce((sum, val) => sum + val, 0) / 
                      (transactionAmounts.length || 1);
      
      const currentAmount = parseFloat(event.eventData?.value || '0');
      if (currentAmount > avgAmount * 3 && userTransactions.length > 3) {
        anomalyScore += 0.3;
      }
      
      // Check for unusual recipient
      const knownRecipients = new Set(userTransactions.map(e => e.eventData?.to));
      if (!knownRecipients.has(event.eventData?.to) && knownRecipients.size > 3) {
        anomalyScore += 0.2;
      }
    }
    
    // Cap anomaly score at 1.0
    return Math.min(anomalyScore, 1.0);
  }
  
  /**
   * Clean up old security events
   */
  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (this.EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    // Clean up old events for each user
    for (const [userId, events] of this.securityEvents.entries()) {
      const filteredEvents = events.filter(e => e.timestamp >= cutoffTime);
      if (filteredEvents.length !== events.length) {
        this.securityEvents.set(userId, filteredEvents);
        logger.info(`Cleaned up ${events.length - filteredEvents.length} old security events for user ${userId}`);
      }
    }
  }
  
  /**
   * Reset anomaly score for a user (after verified legitimate activity)
   * @param userId User identifier
   */
  public resetAnomalyScore(userId: string): void {
    this.userAnomalyScores.set(userId, 0);
    logger.info(`Reset anomaly score for user ${userId}`);
  }
  
  /**
   * Unlock a user account
   * @param userId User identifier
   * @param adminOverride Whether this is an admin override
   */
  public unlockUserAccount(userId: string, adminOverride: boolean = false): void {
    if (this.userLockouts.has(userId)) {
      this.userLockouts.delete(userId);
      
      if (adminOverride) {
        // If admin override, also reset anomaly score
        this.resetAnomalyScore(userId);
      }
      
      logger.info(`Unlocked account for user ${userId}${adminOverride ? ' (admin override)' : ''}`);
    }
  }
  
  /**
   * Get security events for a user
   * @param userId User identifier
   * @param limit Maximum number of events to return
   * @returns Array of security events
   */
  public getUserEvents(userId: string, limit: number = 100): SecurityEvent[] {
    const events = this.securityEvents.get(userId) || [];
    
    // Sort by timestamp (newest first) and limit
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * Get current risk score for a user
   * @param userId User identifier
   * @returns Risk score (0.0 to 1.0)
   */
  public getUserRiskScore(userId: string): number {
    return this.userAnomalyScores.get(userId) || 0;
  }
}

// Types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  SUCCESSFUL_AUTH = 'successful_auth',
  FAILED_AUTH = 'failed_auth',
  TRANSACTION_ATTEMPT = 'transaction_attempt',
  TRANSACTION_EXECUTED = 'transaction_executed',
  KEY_EXPORT_ATTEMPT = 'key_export_attempt',
  SETTINGS_CHANGE = 'settings_change',
  PASSWORD_CHANGE = 'password_change',
  RECOVERY_ATTEMPT = 'recovery_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  OTHER = 'other'
}

export interface SecurityEvent {
  eventId: string;
  userId: string;
  eventType: SecurityEventType;
  eventData: any;
  ipAddress: string;
  timestamp: number;
}

export interface IntrusionAnalysisResult {
  allowed: boolean;
  reason: string;
  riskScore: number;
  actionTaken: 'allowed' | 'additional_verification' | 'account_locked' | 'blocked';
}

// Export singleton instance
export const intrusionDetection = IntrusionDetectionService.getInstance();
