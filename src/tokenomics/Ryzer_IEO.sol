// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title RyzerIEO
/// @notice Manages an IEO sale with Merkle-based whitelisting and timelock-protected actions.
/// @dev Non-upgradeable ERC20 token sale contract with role-based access control.
///      Uses OpenZeppelin's AccessControl for ADMIN_ROLE and DEFAULT_ADMIN_ROLE.
///      All sensitive functions are restricted to authorized roles to prevent unauthorized access.
contract RyzerIEO is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    using MerkleProof for bytes32[];

    // --- Constants ---
    uint256 private constant PUBLIC_ALLOCATION = 200_000_000e18; // 200M tokens
    uint256 private constant TOKEN_PRICE = 0.0001 ether; // 0.0001 ETH per token
    uint256 private constant MIN_CONTRIBUTION = 0.01 ether; // 0.01 ETH minimum
    uint256 private constant MAX_CONTRIBUTION = 5 ether; // 5 ETH per transaction
    uint256 private constant MAX_USER_CONTRIBUTION = 10 ether; // 10 ETH per user
    uint256 private constant SALE_CAP = 20_000 ether; // 20,000 ETH total cap
    uint48 private constant ONE_HOUR = 1 hours;
    uint48 private constant THIRTY_DAYS = 30 days;
    bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // --- Structs ---
    /// @notice Stores contributor details.
    /// @dev Packed to optimize storage: uint128 for contribution.
    struct Contributor {
        uint128 contribution; // ETH contributed in wei
    }

    /// @notice Stores timelock action details.
    /// @dev Packed: uint48 and bool before ActionType.
    struct TimelockAction {
        uint48 scheduledTime; // Execution time
        bool executed; // Execution status
        ActionType actionType; // Action type
    }

    /// @notice Sale state details.
    struct SaleState {
        bool initialized; // Sale initialization status
        bool active; // Sale active status
    }

    // --- Enums ---
    /// @notice Types of timelock actions.
    enum ActionType {
        WithdrawFunds,
        RecoverUnsoldTokens
    }

    // --- State Variables ---
    IERC20 public immutable token; // Sale token
    address public treasuryWallet; // Treasury wallet
    uint48 public immutable deploymentTimestamp; // Deployment time
    uint48 public saleStartTime; // Sale start time
    uint48 public saleEndTime; // Sale end time
    uint48 public timelockDelay = 3 days; // Timelock delay with non-zero default
    uint128 private _totalRaised; // Total ETH raised
    uint128 private _totalTokensSold; // Total tokens sold
    uint32 private _contributorCount; // Number of contributors
    SaleState public saleState = SaleState({initialized: false, active: false}); // Sale state with non-zero default
    bool public emergencyStopped; // Emergency stop state
    bytes32 public merkleRoot; // Merkle root for whitelisting
    mapping(address contributor => Contributor) private _contributors; // Contributor data
    mapping(bytes32 actionId => TimelockAction) public timelockActions; // Timelock actions
    uint32 private _timelockNonce = 1; // Timelock nonce with non-zero default
    uint32 public pendingTimelockActions; // Pending timelock actions

    // --- Events ---
    event TimelockDelayUpdated(uint48 indexed oldDelay, uint48 indexed newDelay);
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event MerkleRootUpdated(bytes32 indexed newRoot);
    event ContributorAdded(address indexed contributor, uint32 newCount);
    event SaleInitialized(uint48 indexed startTime, uint48 indexed endTime);
    event SaleEnded(uint128 indexed totalRaised, uint128 indexed totalSold);
    event ActionScheduled(bytes32 indexed actionId, ActionType indexed actionType, uint48 scheduledTime);
    event ActionExecuted(bytes32 indexed actionId, ActionType indexed actionType);
    event ActionCanceled(bytes32 indexed actionId, ActionType indexed actionType);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event UnsoldTokensRecovered(address indexed recipient, uint256 amount);
    event SalePaused(bool indexed paused);
    event EmergencyStop(bool indexed stopped);
    event TreasuryWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event SalePeriodExtended(uint48 indexed newEndTime);
    event RoleChanged(bytes32 indexed role, address indexed account, bool granted);

    // --- Errors ---
    error InvalidParameter(string parameter);
    error SaleNotActive();
    error InsufficientTokens();
    error CapExceeded();
    error InvalidProof();
    error TimelockPending();
    error TimelockNotReady();
    error EmergencyStopped();
    error UnauthorizedDeposit();

    // --- Modifiers ---
    modifier whenNotStopped() {
        if (emergencyStopped) revert EmergencyStopped();
        _;
    }

    /// @notice Constructor to initialize the contract.
    /// @param _token Token address.
    /// @param _treasuryWallet Treasury wallet address.
    /// @param _admin Admin address.
    constructor(address _token, address _treasuryWallet, address _admin) payable {
        if (_token == address(0)) revert InvalidParameter("token");
        if (_treasuryWallet == address(0)) {
            revert InvalidParameter("treasuryWallet");
        }
        if (_admin == address(0)) revert InvalidParameter("admin");
        if (_treasuryWallet == _token) {
            revert InvalidParameter("treasuryWallet");
        }

        token = IERC20(_token);
        treasuryWallet = _treasuryWallet;
        deploymentTimestamp = uint48(block.timestamp);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        emit RoleChanged(DEFAULT_ADMIN_ROLE, _admin, true);
        emit RoleChanged(ADMIN_ROLE, _admin, true);
    }

    // --- Admin Functions ---

    /// @notice Initializes the sale.
    /// @param startTime Sale start time.
    /// @param endTime Sale end time.
    /// @param _merkleRoot Merkle root for whitelisting.
    function initializeSale(uint48 startTime, uint48 endTime, bytes32 _merkleRoot)
        external
        onlyRole(ADMIN_ROLE)
        whenNotStopped
    {
        if (_merkleRoot == bytes32(0)) revert InvalidParameter("merkleRoot");
        if (saleState.initialized) {
            revert InvalidParameter("saleState.initialized");
        }
        uint48 currentTime = uint48(block.timestamp);
        if (startTime <= currentTime || endTime <= startTime) {
            revert InvalidParameter("timeRange");
        }

        address self = address(this); // Cache address(this)
        if (token.balanceOf(self) < PUBLIC_ALLOCATION) {
            revert InvalidParameter("tokenBalance");
        }

        saleStartTime = startTime;
        saleEndTime = endTime;
        merkleRoot = _merkleRoot;
        SaleState storage state = saleState;
        state.initialized = true;
        state.active = true;

        emit SaleInitialized(startTime, endTime);
        emit MerkleRootUpdated(_merkleRoot);
    }

    /// @notice Updates the timelock delay.
    /// @param newDelay New delay in seconds (1 hour to 30 days).
    function updateTimelockDelay(uint48 newDelay) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (newDelay < ONE_HOUR || newDelay > THIRTY_DAYS) {
            revert InvalidParameter("timelockDelay");
        }
        uint48 oldDelay = timelockDelay;
        if (oldDelay == newDelay) return;
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(oldDelay, newDelay);
    }

    /// @notice Schedules a timelock action.
    /// @param actionType Type of action (WithdrawFunds or RecoverUnsoldTokens).
    /// @dev Uses abi.encodePacked instead of abi.encode for gas optimization.
    ///      Zero-to-one storage writes are unavoidable for dynamic mappings.
    function scheduleTimelockAction(ActionType actionType) external onlyRole(ADMIN_ROLE) whenNotStopped {
        SaleState storage state = saleState; // Use storage pointer
        if (state.active) revert InvalidParameter("saleState.active");
        bytes32 actionId = keccak256(abi.encodePacked(actionType, _timelockNonce));
        if (timelockActions[actionId].scheduledTime != 0) {
            revert TimelockPending();
        }

        uint48 scheduledTime = uint48(block.timestamp) + timelockDelay;
        TimelockAction storage action = timelockActions[actionId];
        action.scheduledTime = scheduledTime;
        action.executed = false;
        action.actionType = actionType;
        pendingTimelockActions = pendingTimelockActions + 1;
        _timelockNonce = _timelockNonce + 1;

        emit ActionScheduled(actionId, actionType, scheduledTime);
    }

    /// @notice Executes a timelock action.
    /// @param actionId Action ID.
    /// @param actionType Action type.
    /// @dev Uses block.timestamp for timelock checks, suitable for coarse-grained timing.
    ///      .call for ETH transfer does not require payable modifier in Solidity 0.8.x.
    function executeTimelockAction(bytes32 actionId, ActionType actionType)
        external
        nonReentrant
        onlyRole(ADMIN_ROLE)
        whenNotStopped
    {
        TimelockAction storage action = timelockActions[actionId];
        if (action.scheduledTime == 0 || action.executed || action.actionType != actionType) {
            revert InvalidParameter("actionId");
        }
        if (block.timestamp < action.scheduledTime) revert TimelockNotReady(); // Strict inequality used for standard timelock timing

        action.executed = true;
        pendingTimelockActions = pendingTimelockActions - 1;

        if (actionType == ActionType.WithdrawFunds) {
            address treasury = treasuryWallet; // Cache treasuryWallet
            uint256 balance = address(this).balance; // Uses address(this).balance, standard in Solidity 0.8.x
            if (balance != 0) {
                (bool sent,) = treasury.call{value: balance}("");
                if (!sent) revert InvalidParameter("withdrawal");
                emit FundsWithdrawn(treasury, balance);
            }
        } else if (actionType == ActionType.RecoverUnsoldTokens) {
            address self = address(this); // Cache address(this)
            address treasury = treasuryWallet; // Cache treasuryWallet
            uint256 unsold = token.balanceOf(self);
            if (unsold != 0) {
                uint256 balanceBefore = token.balanceOf(treasury);
                token.safeTransfer(treasury, unsold);
                uint256 balanceAfter = token.balanceOf(treasury);
                uint256 actualAmount = balanceAfter - balanceBefore;
                if (actualAmount == 0) revert InvalidParameter("transfer");
                emit UnsoldTokensRecovered(treasury, actualAmount);
            }
        }

        emit ActionExecuted(actionId, actionType);
    }

    /// @notice Cancels a timelock action.
    /// @param actionId Action ID.
    /// @param actionType Action type.
    function cancelTimelockAction(bytes32 actionId, ActionType actionType)
        external
        onlyRole(ADMIN_ROLE)
        whenNotStopped
    {
        TimelockAction storage action = timelockActions[actionId];
        if (action.scheduledTime == 0 || action.executed || action.actionType != actionType) {
            revert InvalidParameter("actionId");
        }

        delete timelockActions[actionId]; // Free storage
        pendingTimelockActions = pendingTimelockActions - 1;
        emit ActionCanceled(actionId, actionType);
    }

    /// @notice Pauses or unpauses the sale.
    /// @param paused Pause state.
    function setSalePaused(bool paused) external onlyRole(ADMIN_ROLE) whenNotStopped {
        SaleState storage state = saleState;
        if (!state.initialized) {
            revert InvalidParameter("saleState.initialized");
        }
        if (state.active == !paused) return;
        state.active = !paused;
        emit SalePaused(paused);
    }

    /// @notice Sets emergency stop state.
    /// @param stopped Stop state.
    function setEmergencyStop(bool stopped) external onlyRole(ADMIN_ROLE) {
        if (emergencyStopped == stopped) return;
        emergencyStopped = stopped;
        SaleState storage state = saleState;
        if (stopped && state.active) {
            state.active = false;
        }
        emit EmergencyStop(stopped);
    }

    /// @notice Updates the treasury wallet.
    /// @param newWallet New wallet address.
    function updateTreasuryWallet(address newWallet) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (newWallet == address(0)) revert InvalidParameter("zero address");
        if (newWallet == address(token)) {
            revert InvalidParameter("token address");
        }
        address oldWallet = treasuryWallet;
        if (oldWallet == newWallet) return;
        treasuryWallet = newWallet;
        emit TreasuryWalletUpdated(oldWallet, newWallet);
    }

    /// @notice Extends the sale period.
    /// @param newEndTime New end time.
    function extendSalePeriod(uint48 newEndTime) external onlyRole(ADMIN_ROLE) whenNotStopped {
        SaleState storage state = saleState; // Use storage pointer
        if (!state.initialized) {
            revert InvalidParameter("saleState.initialized");
        }
        if (!state.active) revert InvalidParameter("saleState.active");
        if (newEndTime <= saleEndTime) revert InvalidParameter("newEndTime");
        saleEndTime = newEndTime;
        emit SalePeriodExtended(newEndTime);
    }

    /// @notice Grants a role to an account.
    /// @param role Role to grant.
    /// @param account Account address.
    function grantRoleToAddress(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotStopped {
        if (account == address(0)) revert InvalidParameter("account");
        if (hasRole(role, account)) return;
        _grantRole(role, account);
        emit RoleChanged(role, account, true);
    }

    /// @notice Revokes a role from an account.
    /// @param role Role to revoke.
    /// @param account Account address.
    function revokeRoleFromAddress(bytes32 role, address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotStopped
    {
        if (account == address(0)) revert InvalidParameter("account");
        if (!hasRole(role, account)) revert InvalidParameter("role");
        _revokeRole(role, account);
        emit RoleChanged(role, account, false);
    }

    // --- Public Functions ---

    /// @notice Purchases tokens.
    /// @param proof Merkle proof for whitelisting.
    /// @dev Uses block.timestamp for sale period checks, suitable for coarse-grained timing.
    ///      Revert conditions are necessary for security but limited to mitigate DoS risks.
    function buyTokens(bytes32[] calldata proof) external payable nonReentrant whenNotStopped {
        address caller = msg.sender;
        if (caller == address(0)) revert InvalidParameter("caller");
        if (!isWhitelisted(caller, proof)) revert InvalidProof();
        _buyTokens(caller, msg.value);
    }

    // --- View Functions ---

    /// @notice Gets the contract's ETH balance.
    /// @return Balance in wei.
    function selfBalance() public view returns (uint256) {
        return address(this).balance; // Uses address(this).balance, standard in Solidity 0.8.x
    }

    /// @notice Checks if a user is whitelisted.
    /// @param user User address.
    /// @param proof Merkle proof.
    /// @return True if whitelisted.
    /// @dev Uses abi.encodePacked instead of abi.encode for gas optimization.
    function isWhitelisted(address user, bytes32[] memory proof) public view returns (bool) {
        if (user == address(0)) revert InvalidParameter("user");
        bytes32 leaf = keccak256(abi.encodePacked(user));
        return proof.verify(merkleRoot, leaf);
    }

    /// @notice Gets a contributor's contribution.
    /// @param contributor Contributor address.
    /// @return Contribution in wei.
    function getContribution(address contributor) external view returns (uint128) {
        return _contributors[contributor].contribution;
    }

    /// @notice Gets timelock action details.
    /// @param actionId Action ID.
    /// @return scheduledTime Scheduled execution time.
    /// @return executed Execution status.
    /// @return actionType Action type.
    function getTimelockAction(bytes32 actionId)
        external
        view
        returns (uint48 scheduledTime, bool executed, ActionType actionType)
    {
        TimelockAction storage action = timelockActions[actionId];
        scheduledTime = action.scheduledTime;
        executed = action.executed;
        actionType = action.actionType;
    }

    /// @notice Gets timelock status.
    /// @return pendingCount Number of pending actions.
    /// @return delay Timelock delay.
    function getTimelockStatus() external view returns (uint32 pendingCount, uint48 delay) {
        pendingCount = pendingTimelockActions;
        delay = timelockDelay;
    }

    /// @notice Gets the ADMIN_ROLE constant.
    /// @return The admin role bytes32 value.
    function getAdminRole() external pure returns (bytes32) {
        return ADMIN_ROLE;
    }

    // --- Internal Functions ---

    /// @notice Handles token purchase logic.
    /// @param buyer Buyer address.
    /// @param ethValue ETH amount sent.
    /// @dev Zero-to-one storage writes are unavoidable for dynamic mappings.
    function _buyTokens(address buyer, uint256 ethValue) private {
        SaleState storage state = saleState;
        uint48 currentTime = uint48(block.timestamp);
        uint128 currentTotalRaised = _totalRaised;
        uint128 currentTotalTokensSold = _totalTokensSold;

        if (!state.active || currentTime < saleStartTime || currentTime >= saleEndTime) revert SaleNotActive();
        if (ethValue < MIN_CONTRIBUTION || ethValue > MAX_CONTRIBUTION) {
            revert InvalidParameter("ethValue");
        }

        Contributor storage contributor = _contributors[buyer];
        uint128 currentContribution = contributor.contribution;
        uint128 newUserContribution = currentContribution + uint128(ethValue);
        if (newUserContribution > MAX_USER_CONTRIBUTION) revert CapExceeded();

        uint256 tokens = (ethValue * 1e18) / TOKEN_PRICE;
        uint128 newTotalRaised = currentTotalRaised + uint128(ethValue);
        uint128 newTotalTokensSold = currentTotalTokensSold + uint128(tokens);
        if (newTotalRaised >= SALE_CAP || newTotalTokensSold >= PUBLIC_ALLOCATION) revert CapExceeded(); // Uses non-strict inequalities for gas efficiency

        _totalRaised = newTotalRaised;
        _totalTokensSold = newTotalTokensSold;
        if (currentContribution == 0) {
            uint32 newCount = _contributorCount + 1;
            _contributorCount = newCount;
            emit ContributorAdded(buyer, newCount);
        }
        contributor.contribution = newUserContribution;

        // Transfer tokens and emit event
        uint256 actualTokens = _transferTokens(buyer, tokens);
        emit TokensPurchased(buyer, ethValue, actualTokens);

        if (newTotalRaised >= SALE_CAP || newTotalTokensSold >= PUBLIC_ALLOCATION) {
            state.active = false;
            emit SaleEnded(newTotalRaised, newTotalTokensSold);
        }
    }

    /// @notice Transfers tokens to the buyer and verifies the transfer.
    /// @param buyer Buyer address.
    /// @param tokenAmount Amount of tokens to transfer.
    /// @return actualTokens Actual tokens transferred.
    function _transferTokens(address buyer, uint256 tokenAmount) private returns (uint256 actualTokens) {
        //address self = address(this); // Cache address(this)
        uint256 balanceBefore = token.balanceOf(buyer);
        token.safeTransfer(buyer, tokenAmount);
        uint256 balanceAfter = token.balanceOf(buyer);
        actualTokens = balanceAfter - balanceBefore;
        if (actualTokens == 0) revert InvalidParameter("transfer");
    }

    /// @notice Restricts direct ETH deposits.
    receive() external payable {
        revert UnauthorizedDeposit();
    }
}
