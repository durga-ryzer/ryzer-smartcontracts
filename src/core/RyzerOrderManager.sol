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
import "./interfaces/IRyzerProject.sol";

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
    error InvalidChainId(uint16 chainId);
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
        uint16 chainId;
        uint48 timestamp;
        uint48 orderExpiration;
        uint48 releaseTimelock;
        OrderStatus status;
        Currency currency;
        bool released;
        bool hasFullPayment;
    }

    struct PlaceOrderParams{
        address _user;
        address _projectAddress;
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
    event Initialized(
        address usdtToken,
        address escrow,
        address project,
        uint16 chainId
    );
    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        bytes32 assetId,
        uint16 chainId
    );
    event DocumentsSigned(
        bytes32 indexed orderId,
        address indexed buyer,
        uint16 chainId
    );
    event OrderFinalized(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint16 chainId
    );
    event OrderCancelled(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint16 chainId
    );
    event FundsReleaseSigned(
        bytes32 indexed orderId,
        address indexed signer,
        uint16 chainId
    );
    event FundsReleased(
        bytes32 indexed orderId,
        address indexed to,
        uint256 amount,
        uint16 chainId
    );
    event StuckOrderResolved(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint16 chainId
    );
    event EmergencyWithdrawal(
        address indexed recipient,
        uint256 amount,
        uint16 chainId
    );
    event ProjectContractsSet(
        address indexed usdtToken,
        address indexed escrow,
        address indexed project,
        uint16 chainId
    );

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the order manager
    /// @param _usdtToken USDT token address
    /// @param _escrow Escrow contract address
    /// @param _project Project contract address
    /// @param _chainId Network chain ID
    function initialize(
        address _usdtToken,
        address _escrow,
        address _project,
        uint16 _chainId
    ) external initializer {
        if (
            _usdtToken == address(0) ||
            _escrow == address(0) ||
            _project == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
        if (_project.code.length == 0) revert InvalidProject();
        if (_chainId == 0 || _chainId != uint16(block.chainid)) {
            revert InvalidChainId(_chainId);
        }
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
        requiredSignatures = MIN_SIGNATURES;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        emit Initialized(_usdtToken, _escrow, _project, _chainId);
    }

    /// @notice Sets project-related contracts
    /// @param _usdtToken New USDT token address
    /// @param _escrow New escrow contract address
    /// @param _project New project contract address
    function setProjectContracts(
        address _usdtToken,
        address _escrow,
        address _project
    ) external onlyRole(ADMIN_ROLE) {
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
        emit ProjectContractsSet(
            _usdtToken,
            _escrow,
            _project,
            uint16(block.chainid)
        );
    }


    /// @notice Places a new order
    function placeOrder(
        PlaceOrderParams calldata params
    ) external nonReentrant whenNotPaused {
        require(
            params._paymentType == PaymentType.FULL || params._paymentType == PaymentType.EOI,
            InvalidParameter("invalid payment type")
        );

        require(
            params._currency == Currency.USDT ||
                params._currency == Currency.XDC ||
                params._currency == Currency.XRP ||
                params._currency == Currency.RYZER,
            InvalidParameter("invalid currency")
        );

        uint16 chainId = uint16(block.chainid);
        _validateOrderInput(
            params._amount,
            params._projectAddress,
            params._currencyPrice,
            params._assetId,
            params._fees
        );

        uint256 assetPrice = IRyzerProject(project).tokenPrice(); // assumed in 18 decimals
        uint256 totalOrderValueWithoutFees = params._amount * assetPrice; // still 18 decimals

        // total price user has to pay in currency tokens (e.g., USDT)
        uint256 totalOrderValueInCurrency = (totalOrderValueWithoutFees) /
            params._currencyPrice; // assuming currency price and asset price in 18 decimals // n

        uint256 bookingEoiPayment = 0;
        uint256 totalOrderValue = totalOrderValueInCurrency + params._fees;

        uint256 payment = totalOrderValue;

        if (params._paymentType == PaymentType.EOI) {
            uint256 eoiPct = IRyzerProject(project).eoiPct(); // e.g., 20 means 20%
            bookingEoiPayment = (totalOrderValueInCurrency * eoiPct) / 100;
            bookingEoiPayment = bookingEoiPayment + params._fees;
            payment = bookingEoiPayment;
        }

        // Balance & Allowance checks
        _checkAllowanceAndBalance(params._user,payment);

        bytes32 orderId = keccak256(
            abi.encode(
                params._user,
                params._projectAddress,
                block.chainid,
                params._assetId,
                orderNonce
            )
        );
        orderNonce++;

        orders[orderId] = Order({
            buyer: params._user,
            amount: params._amount,
            bookingEoiPayment: bookingEoiPayment,
            totalOrderValue: totalOrderValue,
            fees: params._fees,
            assetId: params._assetId,
            chainId: chainId,
            timestamp: uint48(block.timestamp),
            orderExpiration: uint48(block.timestamp + ORDER_EXPIRATION),
            releaseTimelock: 0,
            status: OrderStatus.Pending,
            currency: params._currency,
            released: false,
            hasFullPayment: params._paymentType == PaymentType.FULL
        });

        usdtToken.safeTransferFrom(params._user, escrow, payment);

        try IRyzerEscrow(escrow).deposit(orderId, params._user, payment, params._assetId) {
            emit OrderPlaced(orderId, params._user, params._amount, params._assetId, chainId);
        } catch Error(string memory reason) {
            revert OrderDepositFailed(reason);
        } catch {
            revert OrderDepositFailed("error occurred during escrow deposit");
        }
    }

    /// @notice Places a new order
    /// @param amount Token amount to purchase
    /// @param projectAddress Project address
    /// @param chainId_ Chain ID
    /// @param assetId Asset ID
    /// @param fees Order fees
    // function placeOrder(uint256 amount, address projectAddress, uint16 chainId_, bytes32 assetId, uint256 fees)
    //     external
    //     nonReentrant
    //     whenNotPaused
    // {
    //     _validateOrderInput(amount, projectAddress, chainId_, assetId, fees);

    //     uint256 tokenPrice = IRyzerProject(project).tokenPrice();
    //     uint256 totalPrice = (amount * tokenPrice) / 10 ** 18;
    //     uint256 initialPayment = (totalPrice * IRyzerProject(project).eoiPct()) / 100;
    //     uint256 totalRequired = initialPayment + fees;
    //     if (
    //         usdtToken.balanceOf(msg.sender) < totalRequired
    //             || usdtToken.allowance(msg.sender, address(this)) < totalRequired
    //     ) {
    //         revert InsufficientBalance(usdtToken.balanceOf(msg.sender), totalRequired);
    //     }

    //     bytes32 orderId = keccak256(abi.encode(msg.sender, projectAddress, chainId_, assetId, orderNonce++));
    //     orders[orderId] = Order({
    //         buyer: msg.sender,
    //         amount: amount,
    //         initialPayment: initialPayment,
    //         fees: fees,
    //         assetId: assetId,
    //         chainId: chainId_,
    //         timestamp: uint48(block.timestamp),
    //         orderExpiration: uint48(block.timestamp + ORDER_EXPIRATION),
    //         releaseTimelock: 0,
    //         status: OrderStatus.Pending,
    //         released: false
    //     });

    //     usdtToken.safeTransferFrom(msg.sender, escrow, totalRequired);
    //     IRyzerEscrow(escrow).deposit(orderId, msg.sender, totalRequired, assetId);
    //     emit OrderPlaced(orderId, msg.sender, amount, assetId, chainId_);
    // }

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
        emit DocumentsSigned(orderId, msg.sender, order.chainId);
    }

    /// @notice Finalizes an order
    /// @param orderId Order ID
    function finalizeOrder(
        address _user,
        bytes32 orderId
    ) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];

        if (order.buyer == address(0)) revert OrderNotFound(orderId);
        if (order.buyer != _user && !hasRole(ADMIN_ROLE, _user))
            revert Unauthorized();
        if (order.status != OrderStatus.DocumentsSigned)
            revert DocumentsNotSigned();
        if (block.timestamp > order.orderExpiration)
            revert OrderExpired(order.orderExpiration);
        if (order.status == OrderStatus.Finalized)
            revert OrderAlreadyFinalized();

        // Skip payment step if already paid in full
        if (!order.hasFullPayment) {
            uint256 remainingPayment = order.totalOrderValue -
                order.bookingEoiPayment;
            if (remainingPayment > 0) {
                uint256 balance = usdtToken.balanceOf(_user);
                uint256 allowance = usdtToken.allowance(_user, address(this));
                if (
                    balance < remainingPayment || allowance < remainingPayment
                ) {
                    revert InsufficientBalance(balance, remainingPayment);
                }

                usdtToken.safeTransferFrom(_user, escrow, remainingPayment);
                IRyzerEscrow(escrow).deposit(
                    orderId,
                    _user,
                    remainingPayment,
                    order.assetId
                );
            }
        }

        uint256 dividend = (order.totalOrderValue *
            IRyzerProject(project).dividendPct()) / 100;
        IRyzerEscrow(escrow).depositDividend(dividend);

        IRyzerProject(project).mint(order.buyer, order.amount);

        order.status = OrderStatus.Finalized;
        order.releaseTimelock = uint48(block.timestamp + RELEASE_TIMELOCK);

        emit OrderFinalized(orderId, order.buyer, order.amount, order.chainId);
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
        emit OrderCancelled(orderId, order.buyer, cancelAmount, order.chainId);
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

        address projectOwner = IRyzerProject(project).getProjectOwner();
        if (projectOwner == address(0)) revert InvalidAddress(projectOwner);

        fundReleaseSignatures[orderId][msg.sender] = true;
        fundReleaseSignatureCount[orderId]++;

        emit FundsReleaseSigned(orderId, msg.sender, order.chainId);

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
                emit FundsReleased(
                    orderId,
                    projectOwner,
                    netAmount,
                    order.chainId
                );
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
        emit StuckOrderResolved(
            orderId,
            order.buyer,
            cancelAmount,
            order.chainId
        );
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
        emit EmergencyWithdrawal(recipient, amount, uint16(block.chainid));
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

    function _checkAllowanceAndBalance(address user, uint256 required) internal view {
            uint256 balance = usdtToken.balanceOf(user);
            uint256 allowance = usdtToken.allowance(user, address(this));
            if (balance < required || allowance < required) {
                revert InsufficientBalance(balance, required);
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
        uint256 tokenPrice,
        bytes32 assetId,
        uint256 fees
    ) private view {
        if (projectAddress != project || projectAddress.code.length == 0) {
            revert InvalidProject();
        }
        //if (chainId_ != uint16(block.chainid)) revert InvalidChainId(chainId_);
        if (assetId == bytes32(0)) revert InvalidParameter("assetId");
        if (!IRyzerProject(project).getIsActive()) {
            revert InvalidParameter("inactive project");
        }
        if (tokenPrice <= 0) {
            revert InvalidParameter("invalid token price");
        }
        (uint256 minInvestment, uint256 maxInvestment) = IRyzerProject(project)
            .getInvestmentLimits();
        if (amount < minInvestment) {
            revert InvalidAmount("below minimum investment");
        }
        if (amount > maxInvestment || amount > MAX_ORDER_SIZE) {
            revert InvalidAmount("exceeds maximum investment");
        }
        //uint256 tokenPrice = IRyzerProject(project).tokenPrice();
        uint256 totalPrice = (amount * tokenPrice) / 1e18;
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
