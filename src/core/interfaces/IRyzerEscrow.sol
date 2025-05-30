// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

interface IRyzerEscrow {
    // Structs
    struct Deposit {
        address buyer;
        uint256 amount;
        bytes32 assetId;
    }

    struct Dispute {
        address buyer;
        string reason;
        uint256 amount;
        bytes32 assetId;
        bytes32 orderId;
        uint48 disputeTimeout;
        uint48 disputeExpiration;
        bool resolved;
        address resolvedTo;
    }

    // Events
    event EscrowInitialized(
        address indexed usdtToken,
        address indexed projectContract,
        uint16 chainId
    );
    event Deposited(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        bytes32 assetId,
        uint16 chainId
    );
    event Released(
        bytes32 indexed orderId,
        address indexed to,
        uint256 amount,
        uint16 chainId
    );
    event DisputeRaised(
        bytes32 indexed disputeId,
        address indexed buyer,
        string reason,
        uint256 amount,
        uint16 chainId
    );
    event DisputeSigned(
        bytes32 indexed disputeId,
        address indexed signer,
        uint16 chainId
    );
    event DisputeResolved(
        bytes32 indexed disputeId,
        address indexed resolvedTo,
        uint256 amount,
        uint16 chainId
    );
    event DividendsDeposited(uint256 amount, uint16 chainId);
    event DividendsDistributed(
        address indexed recipient,
        uint256 amount,
        uint16 chainId
    );
    event EmergencyWithdrawal(
        address indexed recipient,
        uint256 amount,
        uint16 chainId
    );
    event CoreContractsSet(
        address indexed usdtToken,
        address indexed projectContract,
        uint16 chainId
    );

    // Functions
    function initialize(
        address _usdtToken,
        address _projectContract,
        uint16 _chainId
    ) external;

    function setCoreContracts(
        address _usdtToken,
        address _projectContract,
        uint16 _chainId
    ) external;

    function deposit(
        bytes32 orderId,
        address buyer,
        uint256 amount,
        uint256 paymentType,
        bytes32 assetId
    ) external;

    function signRelease(bytes32 orderId, address to, uint256 amount) external;

    function depositDividend(address buyer, uint256 amount) external;

    function distributeDividend(address recipient, uint256 amount) external;

    function raiseDispute(bytes32 orderId, string calldata reason) external;

    function signDisputeResolution(
        bytes32 disputeId,
        address resolvedTo
    ) external;

    function emergencyWithdraw(address recipient, uint256 amount) external;

    function pause() external;

    function unpause() external;

    function getDisputeStatus(
        bytes32 disputeId
    ) external view returns (Dispute memory);

    function dividendPoolBalance() external view returns (uint256);
}
