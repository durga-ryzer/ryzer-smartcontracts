// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/// @title RyzerWalletInterfaces - Interface and Struct Definitions for Ryzer Wallet Ecosystem
/// @notice Provides standardized interfaces and data structures for cross-chain interactions, compliance checks, and smart wallet operations.

/// @notice ERC3643 Interface with compliance check
interface IERC3643 is IERC20 {
    function isCompliant(address account) external view returns (bool);
}

/// @notice Cross-chain bridge adapter interface
interface ICrossChainAdapter {
    function transferToChain(
        address token,
        uint256 amount,
        address recipient,
        uint256 targetChainId,
        bytes calldata params,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external returns (bytes32 txHash);

    function estimateFees(
        address token,
        uint256 amount,
        uint256 targetChainId,
        bytes calldata params,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external view returns (uint256);

    function isChainSupported(uint256 chainId) external view returns (bool);
}

/// @notice Interface for retrieving aggregated oracle price data
interface IOracleAggregator {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @notice EntryPoint interface for account abstraction (e.g., ERC-4337)
interface IEntryPoint {
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;
    function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
    function depositTo(address account) external payable;
}

/// @notice Paymaster interface for covering gas costs of user operations
interface IPaymaster {
    function validatePaymasterUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)
        external
        returns (bytes memory context, uint256 validationData);
}

/// @notice Interface for verifying off-chain delegation logic
interface IDelegatorCore {
    function verifyDelegation(address delegator, address delegate, bytes calldata delegationData)
        external
        view
        returns (bool);
}

/// @notice Struct defining a UserOperation for account abstraction
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

/// @notice Multi-sig configuration data
struct MultiSignature {
    bytes32 merkleRoot;
    uint256 threshold;
}

/// @notice Adapter metadata including priority for fallback routing
struct AdapterInfo {
    address adapter;
    uint32 priority;
}

/// @notice Performance metrics tracked for cross-chain adapters
struct AdapterPerformance {
    uint128 successCount;
    uint128 failureCount;
    uint128 totalLatency;
    uint128 transferCount;
}

/// @notice Metadata describing token characteristics and restrictions
/// @param complianceLevel - Compliance level (0 = none, 1 = KYC, 2 = KYB, etc.)
/// @param tokenStandard - Interface identifier (e.g., ERC20, ERC721)
/// @param isLocked - Whether token transfers are locked
/// @param isEmergencyStopped - Whether token is globally paused
/// @param approvalExpiry - Timestamp when any approval expires
struct TokenMetadata {
    uint64 complianceLevel;
    bytes4 tokenStandard;
    bool isLocked;
    bool isEmergencyStopped;
    uint256 approvalExpiry;
}
