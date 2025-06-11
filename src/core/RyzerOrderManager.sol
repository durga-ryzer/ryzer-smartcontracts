// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IRyzerEscrow.sol";
import "./interfaces/IRyzerRealEstateToken.sol";

/// @title RyzerOrderManager
/// @notice Manages token purchase orders for real-world asset (RWA) projects in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern with multi-signature fund release
contract RyzerOrderManager is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    /*//////////////////////////////////////////////////////////////
                         LIBRARIES
    //////////////////////////////////////////////////////////////*/
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                         ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidAddress(address addr);
    error InvalidProject();
    error InsufficientBalance(uint256 balance, uint256 required);
    error InvalidAmount(string reason);
    error OrderNotFound(bytes32 orderId);
    error DocumentsNotSigned();
    error OrderExpired(uint48 expiration);
    error OrderAlreadyFinalized();
    error OrderNotPending();
    error CancellationDelayNotMet(uint48 delayEnd);
    error AlreadySigned(address signer);
    error OrderNotStuck();
    error InvalidParameter(string parameter);
    error TimelockNotMet(uint48 timelockEnd);
    error InvalidTokenDecimals(uint8 decimals);
    error Unauthorized();
    error OrderAlreadyReleased();
    error OrderDepositFailed(string reason);

    /*//////////////////////////////////////////////////////////////
                         TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    // Enums
    enum OrderStatus {
        Pending,
        DocumentsSigned,
        Finalized,
        Cancelled
    }

    // Structs
    struct Order {
        address buyer;
        uint256 amount;
        uint256 bookingEoiPayment;
        uint256 totalOrderValue;
        uint256 fees;
        bytes32 assetId;
        uint48 timestamp;
        uint48 orderExpiration;
        uint48 releaseTimelock;
        OrderStatus status;
        Currency currency;
        bool released;
        bool hasFullPayment;
    }

    struct PlaceOrderParams {
        address _projectAddress;
        address _escrowAddress;
        bytes32 _assetId;
        uint256 _amount;
        uint256 _currencyPrice; // Price of 1 currency token in 18 decimals
        uint256 _fees;
        PaymentType _paymentType;
        Currency _currency;
    }

    enum PaymentType {
        EOI,
        FULL
    }

    enum Currency {
        USDT,
        XDC,
        XRP,
        RYZER
    }

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // Role identifiers
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Constants
    uint256 public constant USDT_TOKEN_DECIMAL = 6;
    uint256 public constant ORDER_EXPIRATION = 7 days;
    uint256 public constant CANCELLATION_DELAY = 1 days;
    uint256 public constant MIN_SIGNATURES = 2;
    uint256 public constant MAX_ORDER_SIZE = 1_000_000 * 10 ** 18;
    uint256 public constant RELEASE_TIMELOCK = 7 days;

    // State variables
    IERC20 public usdtToken;
    address public escrow;
    address public project;
    uint256 public requiredSignatures;
    uint64 public orderNonce;
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => mapping(address => bool)) public fundReleaseSignatures;
    mapping(bytes32 => uint256) public fundReleaseSignatureCount;

    /*//////////////////////////////////////////////////////////////
                         EVENTS
    //////////////////////////////////////////////////////////////*/
    event Initialized(address usdtToken, address escrow, address project);
    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        bytes32 assetId
    );
    event DocumentsSigned(bytes32 indexed orderId, address indexed buyer);
    event OrderFinalized(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount
    );
    event OrderCancelled(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount
    );
    event FundsReleaseSigned(bytes32 indexed orderId, address indexed signer);
    event FundsReleased(
        bytes32 indexed orderId,
        address indexed to,
        uint256 amount
    );
    event StuckOrderResolved(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount
    );
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);
    event ProjectContractsSet(
        address indexed usdtToken,
        address indexed escrow,
        address indexed project
    );

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the order manager
    /// @param _usdtToken USDT token address
    /// @param _escrow Escrow contract address
    /// @param _project Project contract address
    function initialize(
        address _usdtToken,
        address _escrow,
        address _project,
        address _owner
    ) external initializer {
        if (
            _usdtToken == address(0) ||
            _escrow == address(0) ||
            _project == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
        if (_project.code.length == 0) revert InvalidProject();
        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(IERC20Metadata(_usdtToken).decimals());
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        usdtToken = IERC20(_usdtToken);
        escrow = _escrow;
        project = _project;
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);

        emit Initialized(_usdtToken, _escrow, _project);
    }

    /// @notice Sets project-related contracts
    /// @param _usdtToken New USDT token address
    /// @param _escrow New escrow contract address
    /// @param _project New project contract address
    function setProjectContracts(
        address _usdtToken,
        address _escrow,
        address _project //onlyRole(DEFAULT_ADMIN_ROLE)
    ) external {
        if (
            _usdtToken == address(0) ||
            _escrow == address(0) ||
            _project == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
        if (_project.code.length == 0) revert InvalidProject();
        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(IERC20Metadata(_usdtToken).decimals());
        }

        usdtToken = IERC20(_usdtToken);
        escrow = _escrow;
        project = _project;
        emit ProjectContractsSet(_usdtToken, _escrow, _project);
    }

    /// @notice Places a new order
    function placeOrder(
        PlaceOrderParams calldata params
    ) external nonReentrant whenNotPaused returns (bytes32) {
        require(
            params._paymentType == PaymentType.FULL ||
                params._paymentType == PaymentType.EOI,
            InvalidParameter("invalid payment type")
        );

        require(
            params._currency == Currency.USDT ||
                params._currency == Currency.XDC ||
                params._currency == Currency.XRP ||
                params._currency == Currency.RYZER,
            InvalidParameter("invalid currency")
        );

        _validateOrderInput(
            params._amount,
            params._projectAddress,
            params._currencyPrice,
            params._assetId,
            params._fees
        );

        uint256 assetPrice = IRyzerRealEstateToken(params._projectAddress)
            .tokenPrice(); // USD
        uint256 totalOrderValueWithoutFees = params._amount * assetPrice; // 1e24

        // total price user has to pay in currency tokens (e.g., USDT)
        uint256 totalOrderValueInCurrency = (totalOrderValueWithoutFees) /
            (params._currencyPrice);

        uint256 bookingEoiPayment = 0;
        uint256 totalOrderValue = totalOrderValueInCurrency +
            (params._fees * 1e12); // to adjust if fee in usdt

        uint256 payment = totalOrderValue;

        if (params._paymentType == PaymentType.EOI) {
            uint256 eoiPct = IRyzerRealEstateToken(params._projectAddress)
                .eoiPct();
            bookingEoiPayment = (totalOrderValueInCurrency * eoiPct) / 100;
            bookingEoiPayment = bookingEoiPayment + (params._fees * 1e12);
            payment = bookingEoiPayment;
        }

        // Balance & Allowance checks
        //_checkAllowanceAndBalance(params._user, payment);

        bytes32 orderId = keccak256(
            abi.encode(
                msg.sender,
                params._projectAddress,
                params._assetId,
                orderNonce
            )
        );
        orderNonce++;

        orders[orderId] = Order({
            buyer: msg.sender,
            amount: params._amount,
            bookingEoiPayment: bookingEoiPayment,
            totalOrderValue: totalOrderValue,
            fees: params._fees,
            assetId: params._assetId,
            timestamp: uint48(block.timestamp),
            orderExpiration: uint48(block.timestamp + ORDER_EXPIRATION),
            releaseTimelock: 0,
            status: OrderStatus.Pending,
            currency: params._currency,
            released: false,
            hasFullPayment: params._paymentType == PaymentType.FULL
        });

        try
            IRyzerEscrow(params._escrowAddress).deposit(
                orderId,
                msg.sender,
                payment,
                uint256(params._paymentType),
                params._assetId
            )
        {
            emit OrderPlaced(
                orderId,
                msg.sender,
                params._amount,
                params._assetId
            );
        } catch Error(string memory reason) {
            revert OrderDepositFailed(reason);
        } catch {
            revert OrderDepositFailed("error occurred during escrow deposit");
        }
        return orderId;
    }

    /// @notice Marks order documents as signed
    /// @param orderId Order ID
    function signDocuments(
        bytes32 orderId
    ) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        if (order.buyer != msg.sender) revert Unauthorized();
        if (order.status != OrderStatus.Pending) revert OrderNotPending();
        if (block.timestamp > order.orderExpiration) {
            revert OrderExpired(order.orderExpiration);
        }

        order.status = OrderStatus.DocumentsSigned;
        emit DocumentsSigned(orderId, msg.sender);
    }

    /// @notice Finalizes an order
    /// @param orderId Order ID
    function finalizeOrder(
        address projectAddress,
        address escrowAddress,
        bytes32 orderId
    ) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];

        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        if (order.buyer != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        // if (order.status != OrderStatus.DocumentsSigned) {
        //     revert DocumentsNotSigned();
        // }
        if (block.timestamp > order.orderExpiration) {
            revert OrderExpired(order.orderExpiration);
        }
        if (order.status == OrderStatus.Finalized) {
            revert OrderAlreadyFinalized();
        }

        // Skip payment step if already paid in full
        if (!order.hasFullPayment) {
            uint256 remainingPayment = order.totalOrderValue -
                order.bookingEoiPayment;

            if (remainingPayment > 0) {
                IRyzerEscrow(escrowAddress).deposit(
                    orderId,
                    msg.sender,
                    remainingPayment,
                    uint256(PaymentType.FULL),
                    order.assetId
                );
            }
        }

        // uint256 dividend = (order.totalOrderValue *
        //     IRyzerProject(projectAddress).dividendPct()) / 100;
        // IRyzerEscrow(escrowAddress).depositDividend(order.buyer, dividend);

        //IRyzerProject(project).mint(order.buyer, order.amount);

        order.status = OrderStatus.Finalized;
        order.releaseTimelock = uint48(block.timestamp + RELEASE_TIMELOCK);

        emit OrderFinalized(orderId, order.buyer, order.amount);
    }

    /// @notice Cancels an order
    /// @param orderId Order ID
    function cancelOrder(bytes32 orderId) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        if (order.buyer != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        if (
            order.status != OrderStatus.Pending &&
            order.status != OrderStatus.DocumentsSigned
        ) {
            revert OrderNotPending();
        }
        if (
            block.timestamp < order.timestamp + CANCELLATION_DELAY &&
            !hasRole(ADMIN_ROLE, msg.sender)
        ) {
            revert CancellationDelayNotMet(
                uint48(order.timestamp + CANCELLATION_DELAY)
            );
        }

        order.status = OrderStatus.Cancelled;
        uint256 cancelAmount = order.totalOrderValue;

        if (!order.hasFullPayment) {
            cancelAmount = order.bookingEoiPayment;
        }

        IRyzerEscrow(escrow).signRelease(orderId, order.buyer, cancelAmount);
        emit OrderCancelled(orderId, order.buyer, cancelAmount);
    }

    /// @notice Signs a fund release request
    /// @param orderId Order ID
    function signFundRelease(
        bytes32 orderId
    ) external nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
        Order storage order = orders[orderId];
        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        if (order.status != OrderStatus.Finalized) revert OrderNotPending();
        if (order.released) revert OrderAlreadyReleased();
        if (block.timestamp < order.releaseTimelock) {
            revert TimelockNotMet(order.releaseTimelock);
        }
        if (fundReleaseSignatures[orderId][msg.sender]) {
            revert AlreadySigned(msg.sender);
        }

        address projectOwner = IRyzerRealEstateToken(project).getProjectOwner();
        if (projectOwner == address(0)) revert InvalidAddress(projectOwner);

        fundReleaseSignatures[orderId][msg.sender] = true;
        fundReleaseSignatureCount[orderId]++;

        emit FundsReleaseSigned(orderId, msg.sender);

        if (fundReleaseSignatureCount[orderId] >= requiredSignatures) {
            // uint256 tokenPrice = IRyzerProject(project).tokenPrice();
            // uint256 totalPrice = (order.amount * tokenPrice) / 10 ** 18;

            uint256 netAmount = order.totalOrderValue; // check
            if (!order.hasFullPayment) {
                netAmount = order.bookingEoiPayment;
            }
            if (netAmount > 0) {
                IRyzerEscrow(escrow).signRelease(
                    orderId,
                    projectOwner,
                    netAmount
                );
                emit FundsReleased(orderId, projectOwner, netAmount);
            }
            order.released = true;
        }
    }

    /// @notice Resolves a stuck order
    /// @param orderId Order ID
    function resolveStuckOrder(
        bytes32 orderId
    ) external nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
        Order storage order = orders[orderId];
        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        if (
            order.status != OrderStatus.Pending &&
            order.status != OrderStatus.DocumentsSigned
        ) {
            revert OrderNotPending();
        }
        if (block.timestamp <= order.orderExpiration) revert OrderNotStuck();

        order.status = OrderStatus.Cancelled;

        uint256 cancelAmount = order.totalOrderValue;

        if (!order.hasFullPayment) {
            cancelAmount = order.bookingEoiPayment;
        }
        IRyzerEscrow(escrow).signRelease(orderId, order.buyer, cancelAmount);
        emit StuckOrderResolved(orderId, order.buyer, cancelAmount);
    }

    /// @notice Withdraws stuck USDT funds in emergency scenarios
    /// @param recipient Address to receive the funds
    /// @param amount Amount of USDT to withdraw
    function emergencyWithdraw(
        address recipient,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (recipient == address(0)) revert InvalidAddress(recipient);
        if (amount == 0) revert InvalidAmount("zero amount");
        uint256 balance = usdtToken.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance(balance, amount);

        usdtToken.safeTransfer(recipient, amount);
        emit EmergencyWithdrawal(recipient, amount);
    }

    /// @notice Pauses the contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorizes contract upgrades
    /// @param newImplementation New implementation address
    function _authorizeUpgrade(
        address newImplementation
    ) internal view override onlyRole(ADMIN_ROLE) {
        if (
            newImplementation == address(0) ||
            newImplementation.code.length == 0
        ) {
            revert InvalidAddress(newImplementation);
        }
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Validates order input parameters
    /// @param amount Token amount
    /// @param projectAddress Project address
    /// @param assetId Asset ID
    /// @param fees Order fees
    function _validateOrderInput(
        uint256 amount,
        address projectAddress,
        uint256 currencyPrice,
        bytes32 assetId,
        uint256 fees
    ) private view {
        // if (projectAddress != project || projectAddress.code.length == 0) {
        //     revert InvalidProject();
        // }
        if (assetId == bytes32(0)) revert InvalidParameter("assetId");
        if (!IRyzerRealEstateToken(projectAddress).getIsActive()) {
            revert InvalidParameter("inactive project");
        }
        if (currencyPrice <= 0) {
            revert InvalidParameter("invalid currency price");
        }
        (uint256 minInvestment, uint256 maxInvestment) = IRyzerRealEstateToken(
            projectAddress
        ).getInvestmentLimits();
        if (amount < minInvestment) {
            revert InvalidAmount("below minimum investment");
        }
        if (amount > maxInvestment || amount > MAX_ORDER_SIZE) {
            revert InvalidAmount("exceeds maximum investment");
        }
        uint256 tokenPrice = IRyzerRealEstateToken(projectAddress).tokenPrice();
        uint256 totalPrice = (amount * tokenPrice);
        if (fees > totalPrice / 2) revert InvalidAmount("excessive fees");
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Retrieves order details
    /// @param orderId Order ID
    /// @return Order details
    function getOrderDetails(
        bytes32 orderId
    ) external view returns (Order memory) {
        Order storage order = orders[orderId];
        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        return order;
    }
}
