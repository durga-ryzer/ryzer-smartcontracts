// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./RyzerWalletCore.sol";
import "./RyzerWalletLibraries.sol";

contract Recovery is RyzerWalletCore {
    using WalletRecovery for WalletRecovery.RecoveryData;

    WalletRecovery.RecoveryData private recoveryData;

    event RecoveryInitiated(address[] recoveryKeys, uint64 threshold, address[] socialKeys, uint64 socialThreshold);
    event RecoveryApproved(address indexed approver);
    event SocialRecoveryApproved(address indexed approver);
    event RecoverySettingsUpdated(address[] recoveryKeys, uint64 recoveryThreshold, address[] socialKeys, uint64 socialThreshold);

    error InsufficientApprovals();
    error RecoveryNotInitiated();
    error RecoveryExpired();

    modifier notEmergencyStopped() override {
        if (emergencyStopped) revert EmergencyStopped();
        _;
    }

    function setEmergencyStop(bool stopped) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant override {
        emergencyStopped = stopped;
        if (stopped) _pause();
        else _unpause();
        emit EmergencyStop(stopped);
    }

    function initializeRecovery(
        address[] calldata recoveryKeys,
        uint64 recoveryThreshold,
        address[] calldata socialKeys,
        uint64 socialThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) notEmergencyStopped initializer {
        require(recoveryKeys.length > 0 && recoveryThreshold <= recoveryKeys.length, "Invalid recovery settings");
        require(socialThreshold <= socialKeys.length, "Invalid social threshold");
        require(recoveryKeys.length <= 50 && socialKeys.length <= 50, "Too many keys");

        for (uint i = 0; i < recoveryKeys.length; i++) {
            require(recoveryKeys[i] != address(0), "Invalid recovery key");
            _grantRoleWithExpiration(keccak256("RECOVERY_ROLE"), recoveryKeys[i], type(uint64).max);
        }

        recoveryData.initiate(recoveryKeys, recoveryThreshold, socialKeys, socialThreshold);
        emit RecoveryInitiated(recoveryKeys, recoveryThreshold, socialKeys, socialThreshold);
    }

    function updateRecoverySettings(
        address[] calldata newRecoveryKeys,
        uint64 newRecoveryThreshold,
        address[] calldata newSocialKeys,
        uint64 newSocialThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) notEmergencyStopped {
        require(newRecoveryKeys.length > 0 && newRecoveryThreshold <= newRecoveryKeys.length, "Invalid recovery settings");
        require(newSocialThreshold <= newSocialKeys.length, "Invalid social threshold");
        require(newRecoveryKeys.length <= 50 && newSocialKeys.length <= 50, "Too many keys");

        // Revoke existing recovery roles
        for (uint i = 0; i < recoveryData.recoveryKeys.length; i++) {
            revokeRole(keccak256("RECOVERY_ROLE"), recoveryData.recoveryKeys[i]);
        }

        // Grant new recovery roles
        for (uint i = 0; i < newRecoveryKeys.length; i++) {
            require(newRecoveryKeys[i] != address(0), "Invalid recovery key");
            _grantRoleWithExpiration(keccak256("RECOVERY_ROLE"), newRecoveryKeys[i], type(uint64).max);
        }

        // Reset approvals and update recovery data
        for (uint i = 0; i < recoveryData.recoveryKeys.length; i++) {
            recoveryData.hasApproved[recoveryData.recoveryKeys[i]] = false;
        }
        for (uint i = 0; i < recoveryData.socialKeys.length; i++) {
            recoveryData.hasSocialApproved[recoveryData.socialKeys[i]] = false;
        }
        recoveryData.approvals = 0;
        recoveryData.socialApprovals = 0;
        recoveryData.isInitiated = false;

        recoveryData.initiate(newRecoveryKeys, newRecoveryThreshold, newSocialKeys, newSocialThreshold);
        emit RecoverySettingsUpdated(newRecoveryKeys, newRecoveryThreshold, newSocialKeys, newSocialThreshold);
    }

    function recoveryApproval(address recoveryApprover) external notBlacklisted(msg.sender) rateLimited(msg.sender) notEmergencyStopped nonReentrant {
        require(recoveryData.approve(recoveryApprover), "Approval failed");
        emit RecoveryApproved(recoveryApprover);
    }

    function socialRecoveryApproval(address socialApprover) external notBlacklisted(msg.sender) rateLimited(msg.sender) notEmergencyStopped nonReentrant {
        require(recoveryData.approveSocial(socialApprover), "Social approval failed");
        emit SocialRecoveryApproved(socialApprover);
    }

    function delegatedRecoveryApproval(
        address recoveryApprover,
        address delegator,
        bytes calldata delegationData
    ) external whenNotPaused nonReentrant notBlacklisted(delegator) rateLimited(delegator) notEmergencyStopped verifyDelegation(delegator, delegationData) {
        require(recoveryData.approve(recoveryApprover), "Approval failed");
        emit RecoveryApproved(recoveryApprover);
        emit DelegatedOperation(delegator, msg.sender, "DelegatedRecoveryApproval");
    }

    function delegatedSocialRecoveryApproval(
        address socialApprover,
        address delegator,
        bytes calldata delegationData
    ) external whenNotPaused nonReentrant notBlacklisted(delegator) rateLimited(delegator) notEmergencyStopped verifyDelegation(delegator, delegationData) {
        require(recoveryData.approveSocial(socialApprover), "Social approval failed");
        emit SocialRecoveryApproved(socialApprover);
        emit DelegatedOperation(delegator, msg.sender, "DelegatedSocialRecoveryApproval");
    }

    function executeRecovery() external onlyRole(CUSTODIAN_ROLE) nonReentrant notEmergencyStopped {
        require(recoveryData.isInitiated, "Not initiated");
        require(recoveryData.approvals >= recoveryData.recoveryThreshold, "Insufficient approvals");
        require(recoveryData.socialApprovals >= recoveryData.socialThreshold, "Insufficient social approvals");
        require(block.timestamp <= recoveryData.recoveryTimestamp + 7 days, "Expired");

        recoveryData.isInitiated = false;
    }

    function getRecoveryStatus() external view returns (
        bool isInitiated,
        uint64 timestamp,
        uint64 recoveryThreshold,
        uint64 socialThreshold,
        uint64 approvalsCount,
        uint64 socialApprovalsCount
    ) {
        WalletRecovery.RecoveryData storage rd = recoveryData;
        return (
            rd.isInitiated,
            rd.recoveryTimestamp,
            rd.recoveryThreshold,
            rd.socialThreshold,
            rd.approvals,
            rd.socialApprovals
        );
    }


}