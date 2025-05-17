// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

library BitmapSet {
    struct Set {
        mapping(uint256 => uint256) bitmap;
        mapping(address => uint256) indices;
        address[] tokens;
    }

    function add(Set storage set, address token) internal returns (bool) {
        if (set.indices[token] != 0) return false;
        uint256 index = set.tokens.length + 1;
        set.indices[token] = index;
        set.tokens.push(token);
        set.bitmap[index / 256] |= (1 << (index % 256));
        return true;
    }

    function contains(Set storage set, address token) internal view returns (bool) {
        uint256 index = set.indices[token];
        if (index == 0) return false;
        return (set.bitmap[index / 256] & (1 << (index % 256))) != 0;
    }

    function remove(Set storage set, address token) internal returns (bool) {
        uint256 index = set.indices[token];
        if (index == 0) return false;
        set.bitmap[index / 256] &= ~(1 << (index % 256));
        delete set.indices[token];
        for (uint256 i = 0; i < set.tokens.length; i++) {
            if (set.tokens[i] == token) {
                set.tokens[i] = set.tokens[set.tokens.length - 1];
                set.tokens.pop();
                break;
            }
        }
        return true;
    }

    function getTokens(Set storage set) internal view returns (address[] memory) {
        return set.tokens;
    }
}

library PackedTransactionLog {
    struct Log {
        bytes32 txHash;
        address sender;
        address recipient;
        address token;
        uint128 packedAmountTimestamp;
        uint64 packedMeta;
        uint128 fee;
    }

    struct LogParams {
        bytes32 txHash;
        address sender;
        address recipient;
        address token;
        uint128 amount;
        uint128 timestamp;
        bool success;
        uint32 sourceChainId;
        uint32 targetChainId;
        uint128 fee;
    }

    function packAmountTimestamp(uint128 amount, uint128 timestamp) internal pure returns (uint128) {
        return (amount << 64) | timestamp;
    }

    function packMeta(bool success, uint32 sourceChainId, uint32 targetChainId) internal pure returns (uint64) {
        return (uint64(targetChainId) << 32) | (uint64(sourceChainId) << 1) | (success ? 1 : 0);
    }

    function addLog(Log[] storage logs, LogParams memory params) internal {
        logs.push(
            Log({
                txHash: params.txHash,
                sender: params.sender,
                recipient: params.recipient,
                token: params.token,
                packedAmountTimestamp: packAmountTimestamp(params.amount, params.timestamp),
                packedMeta: packMeta(params.success, params.sourceChainId, params.targetChainId),
                fee: params.fee
            })
        );
    }

    function getLogs(Log[] storage logs, uint256 start, uint256 limit) internal view returns (Log[] memory) {
        uint256 len = logs.length;
        uint256 end = start + limit > len ? len : start + limit;
        Log[] memory result = new Log[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = logs[i];
        }
        return result;
    }
}

library WalletRecovery {
    struct RecoveryData {
        address[] recoveryKeys;
        address[] socialKeys;
        uint64 recoveryThreshold;
        uint64 socialThreshold;
        mapping(address => bool) hasApproved;
        mapping(address => bool) hasSocialApproved;
        uint64 approvals;
        uint64 socialApprovals;
        uint64 recoveryTimestamp;
        bool isInitiated;
    }

    function initiate(
        RecoveryData storage recovery,
        address[] calldata recoveryKeys,
        uint64 recoveryThreshold,
        address[] calldata socialKeys,
        uint64 socialThreshold
    ) internal {
        require(recoveryKeys.length > 0 && recoveryThreshold <= recoveryKeys.length, "Invalid recovery settings");
        require(socialThreshold <= socialKeys.length, "Invalid social threshold");
        recovery.recoveryKeys = recoveryKeys;
        recovery.socialKeys = socialKeys;
        recovery.recoveryThreshold = recoveryThreshold;
        recovery.socialThreshold = socialThreshold;
        recovery.isInitiated = true;
        recovery.recoveryTimestamp = uint64(block.timestamp);
    }

    function approve(RecoveryData storage recovery, address recoveryApprover) internal returns (bool) {
        require(recovery.isInitiated, "Not initiated");
        require(block.timestamp <= recovery.recoveryTimestamp + 7 days, "Expired");
        require(!recovery.hasApproved[recoveryApprover], "Already approved");
        for (uint256 i = 0; i < recovery.recoveryKeys.length; i++) {
            if (recovery.recoveryKeys[i] == recoveryApprover) {
                recovery.hasApproved[recoveryApprover] = true;
                recovery.approvals++;
                return true;
            }
        }
        revert("Unauthorized");
    }

    function approveSocial(RecoveryData storage recovery, address socialApprover) internal returns (bool) {
        require(recovery.isInitiated, "Not initiated");
        require(block.timestamp <= recovery.recoveryTimestamp + 7 days, "Expired");
        require(!recovery.hasSocialApproved[socialApprover], "Already approved");
        for (uint256 i = 0; i < recovery.socialKeys.length; i++) {
            if (recovery.socialKeys[i] == socialApprover) {
                recovery.hasSocialApproved[socialApprover] = true;
                recovery.socialApprovals++;
                return true;
            }
        }
        revert("Unauthorized");
    }

    function execute(RecoveryData storage recovery) internal returns (bool) {
        require(recovery.isInitiated, "Not initiated");
        require(recovery.approvals >= recovery.recoveryThreshold, "Insufficient approvals");
        require(recovery.socialApprovals >= recovery.socialThreshold, "Insufficient social approvals");
        require(block.timestamp <= recovery.recoveryTimestamp + 7 days, "Expired");
        recovery.isInitiated = false;
        return true;
    }
}
