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

import {console} from "forge-std/console.sol";

import "./interfaces/IRyzerRealEstateToken.sol";

/// @title RyzerEscrow
/// @notice Manages USDT payments, dividends, and disputes for RWA projects in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern with multi-signature dispute resolution
contract RyzerEscrow is
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
    using SafeERC20 for IRyzerRealEstateToken;

    /*//////////////////////////////////////////////////////////////
                         ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidAddress(address addr);
    error InvalidAmount();
    error DepositNotFound();
    error InsufficientFunds();
    error DisputeNotFound();
    error DisputeAlreadyResolved();
    error DisputeTimeoutNotMet();
    error DisputeExpired();
    error AlreadySigned();
    error InvalidTokenDecimals(string token, uint8 decimals);
    error Unauthorized();
    error InvalidParameter(string parameter);
    error InsufficientBalance(uint256 balance, uint256 required);

    /*//////////////////////////////////////////////////////////////
                         TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
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

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant USDT_TOKEN_DECIMAL = 6;
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    uint256 public constant DISPUTE_EXPIRATION = 30 days;
    uint256 public constant MIN_SIGNATURES = 2;
    uint256 public constant MAX_REASON_LENGTH = 256;

    IERC20 public usdtToken;
    IRyzerRealEstateToken public projectContract;
    uint256 public dividendPool;
    uint256 public requiredSignatures;
    uint256 public disputeCount;
    mapping(bytes32 => Deposit) public deposits;
    mapping(bytes32 => Dispute) public disputes;
    mapping(bytes32 => mapping(address => bool)) public disputeSignatures;
    mapping(bytes32 => uint256) public disputeSignatureCount;
    mapping(bytes32 => mapping(address => bool)) public releaseSignatures;
    mapping(bytes32 => uint256) public releaseSignatureCount;

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    event EscrowInitialized(
        address indexed usdtToken,
        address indexed projectContract
    );
    event Deposited(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        bytes32 assetId
    );
    event Released(bytes32 indexed orderId, address indexed to, uint256 amount);
    event DisputeRaised(
        bytes32 indexed disputeId,
        address indexed buyer,
        string reason,
        uint256 amount
    );
    event DisputeSigned(bytes32 indexed disputeId, address indexed signer);
    event DisputeResolved(
        bytes32 indexed disputeId,
        address indexed resolvedTo,
        uint256 amount
    );
    event DividendsDeposited(uint256 amount);
    event DividendsDistributed(address indexed recipient, uint256 amount);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);
    event CoreContractsSet(
        address indexed usdtToken,
        address indexed projectContract
    );

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the escrow contract
    /// @param _usdtToken USDT token address
    /// @param _projectContract Project contract address
    function initialize(
        address _usdtToken,
        address _projectContract,
        address _owner
    ) external initializer {
        if (_usdtToken == address(0) || _projectContract == address(0)) {
            revert InvalidAddress(address(0));
        }
        if (_usdtToken.code.length == 0 || _projectContract.code.length == 0) {
            revert InvalidAddress(_usdtToken);
        }

        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(
                "USDT",
                IERC20Metadata(_usdtToken).decimals()
            );
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        usdtToken = IERC20(_usdtToken);
        projectContract = IRyzerRealEstateToken(_projectContract);
        requiredSignatures = MIN_SIGNATURES;

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);

        emit EscrowInitialized(_usdtToken, _projectContract);
    }

    /// @notice Sets core contract addresses and chain ID
    /// @param _usdtToken New USDT token address
    /// @param _projectContract New project contract address
    function setCoreContracts(
        address _usdtToken,
        address _projectContract //onlyRole(ADMIN_ROLE)
    ) external {
        if (_usdtToken == address(0) || _projectContract == address(0)) {
            revert InvalidAddress(address(0));
        }
        if (_usdtToken.code.length == 0 || _projectContract.code.length == 0) {
            revert InvalidAddress(_usdtToken);
        }

        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(
                "USDT",
                IERC20Metadata(_usdtToken).decimals()
            );
        }

        usdtToken = IERC20(_usdtToken);
        projectContract = IRyzerRealEstateToken(_projectContract);
        emit CoreContractsSet(_usdtToken, _projectContract);
    }

    /// @notice Deposits funds for an order
    /// @param orderId Order ID
    /// @param buyer Buyer address
    /// @param amount Deposit amount
    /// @param assetId Asset ID
    function deposit(
        bytes32 orderId,
        address buyer,
        uint256 amount,
        uint256 paymentType,
        bytes32 assetId
    ) external nonReentrant whenNotPaused {
        address orderManager = projectContract.getProjectDetails().orderManager;

        if (msg.sender != orderManager) revert Unauthorized();
        if (buyer == address(0)) revert InvalidAddress(buyer);
        if (amount == 0) revert InvalidAmount();
        //_checkAllowanceAndBalance(buyer, amount);
        deposits[orderId] = Deposit({
            buyer: buyer,
            amount: amount,
            assetId: assetId
        });

        usdtToken.safeTransferFrom(buyer, address(this), amount / 1e12);

        if (paymentType == 1) {
            projectContract.safeTransfer(buyer, amount);
        }

        emit Deposited(orderId, buyer, amount, assetId);
    }

    function _checkAllowanceAndBalance(
        address user,
        uint256 required
    ) internal view {
        uint256 balance = usdtToken.balanceOf(user);
        uint256 allowance = usdtToken.allowance(user, address(this));
        if (balance < required || allowance < required) {
            revert InsufficientBalance(balance, required);
        }
    }

    /// @notice Signs a fund release request
    /// @param orderId Order ID
    /// @param to Recipient address
    /// @param amount Amount to release
    function signRelease(
        bytes32 orderId,
        address to,
        uint256 amount
    ) external nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
        Deposit storage _deposit = deposits[orderId];
        if (_deposit.buyer == address(0)) revert DepositNotFound();
        if (to == address(0)) revert InvalidAddress(to);
        if (amount == 0 || amount > _deposit.amount) revert InvalidAmount();
        if (releaseSignatures[orderId][msg.sender]) revert AlreadySigned();

        releaseSignatures[orderId][msg.sender] = true;
        releaseSignatureCount[orderId]++;
        uint256 signaturesRequired = requiredSignatures;

        if (releaseSignatureCount[orderId] >= signaturesRequired) {
            if (usdtToken.balanceOf(address(this)) < amount) {
                revert InsufficientFunds();
            }
            _deposit.amount -= amount;
            usdtToken.safeTransfer(to, amount);
            if (_deposit.amount == 0) {
                delete deposits[orderId];
                delete releaseSignatureCount[orderId];
                // Clear signatures to prevent reuse
                // Note: Individual signatures are not cleared to save gas, as count reset is sufficient
            }
            emit Released(orderId, to, amount);
        }
    }

    /// @notice Deposits USDT into the dividend pool
    /// @param amount Amount of USDT to deposit
    function depositDividend(
        address buyer,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        // if (msg.sender != projectContract && !hasRole(ADMIN_ROLE, msg.sender)) {
        //     revert Unauthorized();
        // }
        if (amount == 0) revert InvalidAmount();
        _checkAllowanceAndBalance(buyer, amount);

        usdtToken.safeTransferFrom(buyer, address(this), amount);
        dividendPool += amount;
        emit DividendsDeposited(amount);
    }

    /// @notice Distributes dividends to a recipient
    /// @param recipient Address receiving the dividends
    /// @param amount Amount of USDT to distribute
    function distributeDividend(
        address recipient,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        // if (msg.sender != projectContract && !hasRole(ADMIN_ROLE, msg.sender)) {
        //     revert Unauthorized();
        // }
        if (recipient == address(0)) revert InvalidAddress(recipient);
        if (amount == 0) revert InvalidAmount();
        if (
            dividendPool < amount || usdtToken.balanceOf(address(this)) < amount
        ) revert InsufficientFunds();

        dividendPool -= amount;
        usdtToken.safeTransfer(recipient, amount);
        emit DividendsDistributed(recipient, amount);
    }

    /// @notice Raises a dispute for an order
    /// @param orderId Order ID
    /// @param reason Dispute reason (must be non-empty and less than 256 bytes)
    function raiseDispute(
        bytes32 orderId,
        string calldata reason
    ) external nonReentrant whenNotPaused {
        Deposit storage orderDeposit = deposits[orderId];
        address buyer = orderDeposit.buyer;
        if (buyer == address(0)) revert DepositNotFound();
        if (
            msg.sender != buyer &&
            msg.sender !=
            IRyzerRealEstateToken(projectContract).getProjectOwner()
        ) revert Unauthorized();
        if (bytes(reason).length == 0) revert InvalidParameter("empty reason");
        if (bytes(reason).length > MAX_REASON_LENGTH) {
            revert InvalidParameter("reason too long");
        }

        bytes32 disputeId = keccak256(abi.encodePacked(disputeCount++));
        disputes[disputeId] = Dispute({
            buyer: buyer,
            reason: reason,
            amount: orderDeposit.amount,
            assetId: orderDeposit.assetId,
            orderId: orderId,
            disputeTimeout: uint48(block.timestamp + DISPUTE_TIMEOUT),
            disputeExpiration: uint48(block.timestamp + DISPUTE_EXPIRATION),
            resolved: false,
            resolvedTo: address(0)
        });

        emit DisputeRaised(disputeId, buyer, reason, orderDeposit.amount);
    }

    /// @notice Signs a dispute resolution
    /// @param disputeId Dispute ID
    /// @param resolvedTo Resolution recipient
    function signDisputeResolution(
        bytes32 disputeId,
        address resolvedTo
    ) external nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.buyer == address(0)) revert DisputeNotFound();
        if (dispute.resolved) revert DisputeAlreadyResolved();
        if (block.timestamp < dispute.disputeTimeout) {
            revert DisputeTimeoutNotMet();
        }
        if (block.timestamp > dispute.disputeExpiration) {
            revert DisputeExpired();
        }
        if (resolvedTo == address(0)) revert InvalidAddress(resolvedTo);
        if (disputeSignatures[disputeId][msg.sender]) revert AlreadySigned();

        disputeSignatures[disputeId][msg.sender] = true;
        disputeSignatureCount[disputeId]++;
        uint256 signaturesRequired = requiredSignatures;

        if (disputeSignatureCount[disputeId] >= signaturesRequired) {
            if (usdtToken.balanceOf(address(this)) < dispute.amount) {
                revert InsufficientFunds();
            }
            dispute.resolved = true;
            dispute.resolvedTo = resolvedTo;
            usdtToken.safeTransfer(resolvedTo, dispute.amount);
            delete deposits[dispute.orderId];
            delete disputeSignatureCount[disputeId];
            // Clear signatures to prevent reuse
            // Note: Individual signatures are not cleared to save gas, as count reset is sufficient
            emit DisputeResolved(disputeId, resolvedTo, dispute.amount);
        }
    }

    /// @notice Withdraws funds in emergency scenarios
    /// @param recipient Address receiving the funds
    /// @param amount Amount of USDT to withdraw
    function emergencyWithdraw(
        address recipient,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (recipient == address(0)) revert InvalidAddress(recipient);
        if (amount == 0) revert InvalidAmount();
        if (usdtToken.balanceOf(address(this)) < amount) {
            revert InsufficientFunds();
        }

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
                           EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Gets dispute status
    /// @param disputeId Dispute ID
    /// @return dispute Dispute details
    function getDisputeStatus(
        bytes32 disputeId
    ) external view returns (Dispute memory dispute) {
        return disputes[disputeId];
    }

    /// @notice Returns dividend pool balance
    /// @return Current balance of the dividend pool
    function dividendPoolBalance() external view returns (uint256) {
        return dividendPool;
    }
}
