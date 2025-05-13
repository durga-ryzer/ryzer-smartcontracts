/**
 * Security types for the Ryzer Wallet
 */

export enum SecurityLevel {
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  MILITARY = 'military'
}

export interface MilitaryGradeWalletConfig {
  securityLevel: SecurityLevel;
  mfaRequired: boolean;
  backupFrequency: number; // in milliseconds
  lastBackup: number; // timestamp
  anomalyDetectionEnabled: boolean;
  autoLockThreshold: number; // 0-1 risk score threshold for auto-locking
  geofencingEnabled: boolean;
  allowedCountries: string[];
  biometricRequired: boolean;
  hardwareKeyRequired: boolean;
}

export interface AccessPolicy {
  allowedIPs: string[];
  allowedTimeWindows: { start: number; end: number }[]; // in milliseconds from start of day
  allowedGeolocations: string[];
  maxTransactionAmount: string; // in ETH
  requireMFA: boolean;
  allowedDevices: string[];
  cooldownPeriod: number; // in milliseconds
  lastAccessed: number; // timestamp
}

export interface SecurityAudit {
  timestamp: number;
  action: string;
  userId: string;
  ipAddress: string;
  deviceId: string;
  success: boolean;
  riskScore: number; // 0-1
  details: Record<string, any>;
}

export enum SecurityEventType {
  SUCCESSFUL_AUTH = 'successful_auth',
  FAILED_AUTH = 'failed_auth',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  LOCKDOWN_INITIATED = 'lockdown_initiated',
  LOCKDOWN_RELEASED = 'lockdown_released',
  KEY_GENERATION = 'key_generation',
  KEY_EXPORT = 'key_export',
  TRANSACTION_SIGNED = 'transaction_signed',
  MESSAGE_SIGNED = 'message_signed'
}
