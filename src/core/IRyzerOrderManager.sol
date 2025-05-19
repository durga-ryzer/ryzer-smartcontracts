// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

interface IRyzerOrderManager {
    enum OrderStatus {
        Pending,
        DocumentsSigned,
        Finalized,
        Cancelled
    }

    struct Order {
        address buyer;
        uint256 amount;
        uint256 initialPayment;
        uint256 fees;
        bytes32 assetId;
        uint16 chainId;
        uint48 timestamp;
        uint48 orderExpiration;
        uint48 releaseTimelock;
        OrderStatus status;
        bool released;
    }

    // Events
    event Initialized(address usdtToken, address escrow, address project, uint16 chainId);
    event OrderPlaced(bytes32 indexed orderId, address indexed buyer, uint256 amount, bytes32 assetId, uint16 chainId);
    event DocumentsSigned(bytes32 indexed orderId, address indexed buyer, uint16 chainId);
    event OrderFinalized(bytes32 indexed orderId, address indexed buyer, uint256 amount, uint16 chainId);
    event OrderCancelled(bytes32 indexed orderId, address indexed buyer, uint256 amount, uint16 chainId);
    event FundsReleaseSigned(bytes32 indexed orderId, address indexed signer, uint16 chainId);
    event FundsReleased(bytes32 indexed orderId, address indexed to, uint256 amount, uint16 chainId);
    event StuckOrderResolved(bytes32 indexed orderId, address indexed buyer, uint256 amount, uint16 chainId);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, uint16 chainId);
    event ProjectContractsSet(
        address indexed usdtToken, address indexed escrow, address indexed project, uint16 chainId
    );

    // External/exposed functions
    function initialize(address _usdtToken, address _escrow, address _project, uint16 _chainId) external;

    function setProjectContracts(address _usdtToken, address _escrow, address _project) external;

    function placeOrder(uint256 amount, address projectAddress, uint16 chainId_, bytes32 assetId, uint256 fees)
        external;

    function signDocuments(bytes32 orderId) external;

    function finalizeOrder(bytes32 orderId) external;

    function cancelOrder(bytes32 orderId) external;

    function signFundRelease(bytes32 orderId) external;

    function resolveStuckOrder(bytes32 orderId) external;

    function emergencyWithdraw(address recipient, uint256 amount) external;

    function getOrderDetails(bytes32 orderId) external view returns (Order memory);

    function pause() external;

    function unpause() external;
}
