// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

/**
 * @title IRyzerMilitaryGradeSecurity
 * @notice Interface for military-grade security features in Ryzer Wallet
 * @dev Defines the interface for TEE verification, TSS support, MFA, and intrusion detection
 */
interface IRyzerMilitaryGradeSecurity {
    // Security level enum
    enum SecurityLevel {
        STANDARD,
        HIGH,
        MILITARY
    }

    // Military-grade wallet configuration struct
    struct MilitaryGradeConfig {
        SecurityLevel securityLevel;
        bool mfaRequired;
        uint256 backupFrequency;
        uint256 lastBackup;
        bool anomalyDetectionEnabled;
        uint256 autoLockThreshold; // Represented as basis points (e.g., 7000 = 0.7)
        bool geofencingEnabled;
        bytes32 allowedCountriesHash;
        bool biometricRequired;
        bool hardwareKeyRequired;
    }

    // Access policy struct
    struct AccessPolicy {
        bytes32 allowedIPsHash;
        uint256 allowedTimeWindowStart;
        uint256 allowedTimeWindowEnd;
        bytes32 allowedGeolocationsHash;
        uint256 maxTransactionAmount;
        bool requireMFA;
        bytes32 allowedDevicesHash;
        uint256 cooldownPeriod;
        uint256 lastAccessed;
    }

    // Security audit record struct
    struct SecurityAudit {
        uint256 timestamp;
        string action;
        uint64 userId;
        bytes32 ipAddressHash;
        bytes32 deviceIdHash;
        bool success;
        uint256 riskScore; // Represented as basis points (e.g., 100 = 0.01)
        bytes details;
    }

    // TEE attestation data
    struct TEEAttestation {
        bytes32 attestationHash;
        uint256 timestamp;
        bytes signature;
        bool verified;
    }

    // TSS configuration
    struct TSSConfig {
        uint256 threshold;
        uint256 totalShares;
        bytes32 sharesHash;
    }

    // Intrusion detection state
    struct IntrusionDetection {
        uint256 anomalyScore; // Represented as basis points (e.g., 7000 = 0.7)
        uint256 lastDetectionTime;
        bool locked;
        uint256 lockExpiry;
    }

    // Events
    // event MilitaryGradeWalletCreated(address indexed wallet, SecurityLevel level);
    // event SecurityConfigUpdated(address indexed wallet, SecurityLevel level);
    // event AccessPolicyUpdated(address indexed wallet);
    // event SecurityAuditRecorded(address indexed wallet, string action, bool success);
    // event TEEAttestationVerified(address indexed wallet, bool verified);
    // event AnomalyDetected(address indexed wallet, uint256 score);
    // event WalletLocked(address indexed wallet, uint256 expiry);
    // event WalletUnlocked(address indexed wallet);
    // event EmergencyLockdownActivated(address indexed wallet);
    // event EmergencyLockdownDeactivated(address indexed wallet);

    /**
     * @notice Create a new military-grade wallet
     * @param userId User identifier
     * @param securityLevel Security level (STANDARD, HIGH, MILITARY)
     * @param ipAddressHash Hash of the IP address
     * @param deviceIdHash Hash of the device ID
     * @param geoLocationHash Hash of the geolocation
     * @return The address of the created wallet
     */
    // function createMilitaryGradeWallet(
    //     uint64 userId,
    //     SecurityLevel securityLevel,
    //     bytes32 ipAddressHash,
    //     bytes32 deviceIdHash,
    //     bytes32 geoLocationHash
    // ) external returns (address);

    /**
     * @notice Verify a security operation with military-grade checks
     * @param wallet The wallet address
     * @param operationType The type of operation being performed
     * @param ipAddressHash Hash of the IP address
     * @param deviceIdHash Hash of the device ID
     * @param geoLocationHash Hash of the geolocation
     * @param mfaVerified Whether MFA has been verified
     * @param biometricVerified Whether biometric verification has been completed
     * @param hardwareKeyVerified Whether hardware key verification has been completed
     * @return Whether the operation is allowed
     */
    // function verifySecurityOperation(
    //     address wallet,
    //     string calldata operationType,
    //     bytes32 ipAddressHash,
    //     bytes32 deviceIdHash,
    //     bytes32 geoLocationHash,
    //     bool mfaVerified,
    //     bool biometricVerified,
    //     bool hardwareKeyVerified
    // ) external view returns (bool);

    /**
     * @notice Record a security audit event
     * @param wallet The wallet address
     * @param action The action being performed
     * @param userId The user ID
     * @param ipAddressHash Hash of the IP address
     * @param deviceIdHash Hash of the device ID
     * @param success Whether the action was successful
     * @param riskScore The risk score (in basis points)
     * @param details Additional details about the action
     */
    // function recordSecurityAudit(
    //     address wallet,
    //     string calldata action,
    //     uint64 userId,
    //     bytes32 ipAddressHash,
    //     bytes32 deviceIdHash,
    //     bool success,
    //     uint256 riskScore,
    //     bytes calldata details
    // ) external;

    /**
     * @notice Update the anomaly score for intrusion detection
     * @param wallet The wallet address
     * @param anomalyScore The new anomaly score (in basis points)
     * @param lock Whether to lock the wallet
     * @param lockDuration The duration of the lock (in seconds)
     */
    // function updateAnomalyScore(
    //     address wallet,
    //     uint256 anomalyScore,
    //     bool lock,
    //     uint256 lockDuration
    // ) external;

    /**
     * @notice Unlock a wallet that was locked due to anomaly detection
     * @param wallet The wallet address
     */
    // function unlockWallet(address wallet) external;

    /**
     * @notice Set emergency lockdown status for a wallet
     * @param wallet The wallet address
     * @param enabled Whether to enable or disable emergency lockdown
     */
    // function setEmergencyLockdown(address wallet, bool enabled) external;

    /**
     * @notice Update the military-grade security configuration for a wallet
     * @param wallet The wallet address
     * @param config The new security configuration
     */
    // function updateSecurityConfig(
    //     address wallet,
    //     MilitaryGradeConfig calldata config
    // ) external;

    /**
     * @notice Update the access policy for a wallet
     * @param wallet The wallet address
     * @param policy The new access policy
     */
    // function updateAccessPolicy(
    //     address wallet,
    //     AccessPolicy calldata policy
    // ) external;

    /**
     * @notice Register TEE attestation for a wallet
     * @param wallet The wallet address
     * @param attestationHash Hash of the attestation data
     * @param signature Signature of the attestation
     * @param verified Whether the attestation has been verified
     */
    // function registerTEEAttestation(
    //     address wallet,
    //     bytes32 attestationHash,
    //     bytes calldata signature,
    //     bool verified
    // ) external;

    /**
     * @notice Configure TSS for a wallet
     * @param wallet The wallet address
     * @param threshold The threshold number of shares needed
     * @param totalShares The total number of shares
     * @param sharesHash Hash of the shares data
     */
    // function configureTSS(
    //     address wallet,
    //     uint256 threshold,
    //     uint256 totalShares,
    //     bytes32 sharesHash
    // ) external;
}
