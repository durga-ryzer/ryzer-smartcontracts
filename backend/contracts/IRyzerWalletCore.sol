// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./RyzerWalletInterfaces.sol";

/// @title IRyzerWalletCore
/// @notice Interface for the RyzerWalletCore contract, defining all external functions and events.
interface IRyzerWalletCore {
    // Structs
    struct InitParams {
        address initialUser;
        uint64 userId;
        uint64 threshold;
        address[] custodians;
        address[] brokers;
        address entryPoint;
        address paymaster;
        address payable timelock;
    }

    // Events
    event WalletCreated(address indexed walletAddress);
    event DelegatedSignerSet(address indexed user, address indexed signer);
    event MultiSignersSet(address indexed user, bytes32 merkleRoot, uint256 threshold);
    event UserBlacklisted(address indexed user, bool isBlacklisted);
    event BatchOperationsExecuted(uint256 count);
    event EmergencyStop(bool stopped);
    event RoleRevoked(bytes32 indexed role, address indexed account);
    event OperationRateLimited(address indexed user);
    event DelegatedOperation(address indexed delegator, address indexed operator, string operation);

    // Functions
    function initialize(InitParams memory params) external;

    function setEmergencyStop(bool stopped) external;

    function setDelegatedSigner(address signer) external;

    function setMultiSigners(address[] calldata signers, uint256 _threshold, bytes32 merkleRoot) external;

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256);

    function hasRole(bytes32 role, address account) external view returns (bool);

    function revokeRole(bytes32 role, address account) external;

    function toEthSignedMessageHash(bytes32 hash) external pure returns (bytes32);

    // View functions
    function userAddressToId(address user) external view returns (uint64);

    function delegatedSigners(address user) external view returns (address);

    function multiSigners(address user) external view returns (bytes32 merkleRoot, uint256 threshold);

    function emergencyStopped() external view returns (bool);

    function entryPoint() external view returns (address);

    function paymaster() external view returns (address);

    function timelock() external view returns (address payable);

    function threshold() external view returns (uint64);

    function lastOperationBlock(address user) external view returns (uint256);

    function nonces(address user) external view returns (uint64);
}
