// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title RyzerIDOAndPresale
/// @notice Manages a presale and IDO with Merkle-based whitelisting, vesting, and timelock-protected actions.
/// @dev Non-upgradeable ERC20 token sale contract with role-based access control.
///      Uses OpenZeppelin's AccessControl for ADMIN_ROLE and DEFAULT_ADMIN_ROLE.
///      All sensitive functions are restricted to authorized roles to prevent unauthorized access.
contract RyzerIDOAndPresale is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    using MerkleProof for bytes32[];

    // --- Constants ---
    uint256 private constant PRESALE_ALLOCATION = 100_000_000e18; // 100M tokens
    uint256 private constant IDO_ALLOCATION = 200_000_000e18; // 200M tokens
    uint256 private constant TOKEN_PRICE = 0.0001 ether; // 0.0001 ETH per token
    uint256 private constant MIN_CONTRIBUTION = 0.01 ether; // 0.01 ETH minimum
    uint256 private constant MAX_CONTRIBUTION = 5 ether; // 5 ETH per transaction
    uint256 private constant MAX_USER_CONTRIBUTION = 10 ether; // 10 ETH per user
    uint256 private constant SALE_CAP = 40_000 ether; // 40,000 ETH total cap
    uint48 private constant ONE_MONTH = 30 days;
    uint256 private constant TGE_UNLOCK_PERCENT = 25; // 25% TGE unlock for IDO
    uint256 private constant PRECISION = 1e18; // Precision for vesting calculations
    bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // --- Structs ---
    /// @notice Stores contributor details.
    /// @dev Packed to optimize storage: uint128 for contributions and tokens, uint48 for timestamps.
    struct Contributor {
        uint128 presaleContribution; // ETH contributed in presale
        uint128 idoContribution; // ETH contributed in IDO
        uint128 presaleVestedTokens; // Vested presale tokens
        uint128 idoVestedTokens; // Vested IDO tokens
        uint128 presaleReleased; // Released presale tokens
        uint128 idoReleased; // Released IDO tokens
        uint48 presaleVestingStart; // Presale vesting start time
        uint48 idoVestingStart; // IDO vesting start time
    }

    /// @notice Stores timelock action details.
    /// @dev Packed: uint48 and bool for gas efficiency.
    struct TimelockAction {
        uint48 scheduledTime; // Execution time
        bool executed; // Execution status
        ActionType actionType; // Action type
    }

    // --- Enums ---
    /// @notice Types of timelock actions.
    enum ActionType {
        WithdrawPresaleFunds,
        WithdrawIDOFunds,
        RecoverUnsoldTokens
    }

    // --- State Variables ---
    IERC20 public immutable token; // Sale token
    address public treasuryWallet; // Treasury wallet
    uint48 public immutable deploymentTimestamp; // Deployment time
    uint48 public presaleStartTime; // Presale start time
    uint48 public presaleEndTime; // Presale end time
    uint48 public idoStartTime; // IDO start time
    uint48 public idoEndTime; // IDO end time
    uint48 public timelockDelay = 3 days; // Timelock delay with non-zero default
    uint128 private _presaleTotalRaised; // Total ETH raised in presale
    uint128 private _idoTotalRaised; // Total ETH raised in IDO
    uint128 private _presaleTokensSold; // Total tokens sold in presale
    uint128 private _idoTokensSold; // Total tokens sold in IDO
    uint32 private _presaleContributorCount; // Number of presale contributors
    uint32 private _idoContributorCount; // Number of IDO contributors
    uint8 private _flags; // Bit flags: 0x01 (presale active), 0x02 (IDO active), 0x04 (initialized)
    bool public emergencyStopped; // Emergency stop state
    bytes32 public presaleMerkleRoot; // Presale Merkle root
    bytes32 public idoMerkleRoot; // IDO Merkle root
    uint32 private _nonce = 1; // Nonce for actions with non-zero default
    uint32 public pendingTimelockActions; // Pending timelock actions
    mapping(address contributor => Contributor data) private _contributors; // Contributor data
    mapping(bytes32 actionId => TimelockAction action) public timelockActions; // Timelock actions
    mapping(address user => uint32 nonce) private _presaleUsedNonces; // Nonces used in presale
    mapping(address user => uint32 nonce) private _idoUsedNonces; // Nonces used in IDO

    // --- Events ---
    event TimelockDelayUpdated(uint48 indexed oldDelay, uint48 indexed newDelay);
    event PresaleTokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event IDOTokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tgeTokens, uint256 vestedTokens);
    event VestingReleased(address indexed contributor, bool indexed isPresale, uint256 amount);
    event MerkleRootUpdated(bool indexed isPresale, bytes32 indexed newRoot);
    event ContributorAdded(bool indexed isPresale, address indexed contributor, uint32 newCount);
    event SaleInitialized(uint48 indexed presaleStart, uint48 presaleEnd, uint48 idoStart, uint48 idoEnd);
    event SalePhaseEnded(bool indexed isPresale, uint128 indexed totalRaised, uint128 totalSold);
    event ActionScheduled(bytes32 indexed actionId, ActionType indexed actionType, uint48 scheduledTime);
    event ActionExecuted(bytes32 indexed actionId, ActionType indexed actionType);
    event ActionCanceled(bytes32 indexed actionId, ActionType indexed actionType);
    event FundsWithdrawn(bool indexed isPresale, address indexed recipient, uint256 amount);
    event UnsoldTokensRecovered(address indexed recipient, uint256 indexed amount);
    event SalePaused(bool indexed isPresale, bool paused);
    event EmergencyStop(bool indexed stopped);
    event TreasuryWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event SalePeriodExtended(bool indexed isPresale, uint48 indexed newEndTime);
    event RoleChanged(bytes32 indexed role, address indexed account, bool granted);

    // --- Errors ---
    error InvalidParameter();
    error SaleNotActive();
    error InsufficientTokens();
    error CapExceeded();
    error InvalidProof();
    error NoTokensToRelease();
    error VestingNotActive();
    error CliffNotPassed();
    error EmergencyStopped();
    error TimelockPending();
    error TimelockNotReady();

    // --- Modifiers ---
    modifier whenNotStopped() {
        if (emergencyStopped) revert EmergencyStopped();
        _;
    }

    /// @notice Constructor to initialize the contract.
    /// @param _token Token address.
    /// @param _treasuryWallet Treasury wallet address.
    /// @param _admin Admin address.
    constructor(address _token, address _treasuryWallet, address _admin) {
        if (_token == address(0) || _treasuryWallet == address(0) || _admin == address(0)) revert InvalidParameter();
        if (_treasuryWallet == _token) revert InvalidParameter();

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
    /// @param _presaleStartTime Presale start time.
    /// @param _presaleEndTime Presale end time.
    /// @param _idoStartTime IDO start time.
    /// @param _idoEndTime IDO end time.
    /// @param _presaleMerkleRoot Presale Merkle root.
    /// @param _idoMerkleRoot IDO Merkle root.
    function initializeSale(
        uint48 _presaleStartTime,
        uint48 _presaleEndTime,
        uint48 _idoStartTime,
        uint48 _idoEndTime,
        bytes32 _presaleMerkleRoot,
        bytes32 _idoMerkleRoot
    ) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (_flags & 0x04 != 0) revert InvalidParameter();
        if (_presaleMerkleRoot == bytes32(0) || _idoMerkleRoot == bytes32(0)) {
            revert InvalidParameter();
        }
        uint48 currentTime = uint48(block.timestamp);
        if (
            _presaleStartTime <= currentTime || _presaleEndTime <= _presaleStartTime || _idoStartTime <= currentTime
                || _idoEndTime <= _idoStartTime
        ) revert InvalidParameter();

        address self = address(this); // Cache address(this) to reduce gas
        if (token.balanceOf(self) < PRESALE_ALLOCATION + IDO_ALLOCATION) {
            revert InvalidParameter();
        }

        presaleStartTime = _presaleStartTime;
        presaleEndTime = _presaleEndTime;
        idoStartTime = _idoStartTime;
        idoEndTime = _idoEndTime;
        presaleMerkleRoot = _presaleMerkleRoot;
        idoMerkleRoot = _idoMerkleRoot;
        _flags |= 0x04;
        _flags |= 0x01; // Presale active
        _flags |= 0x02; // IDO active

        emit SaleInitialized(_presaleStartTime, _presaleEndTime, _idoStartTime, _idoEndTime);
        emit MerkleRootUpdated(true, _presaleMerkleRoot);
        emit MerkleRootUpdated(false, _idoMerkleRoot);
    }

    /// @notice Updates the timelock delay.
    /// @param newDelay New delay in seconds (1 hour to 30 days).
    function updateTimelockDelay(uint48 newDelay) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (newDelay < 1 hours || newDelay > 30 days) revert InvalidParameter();
        uint48 oldDelay = timelockDelay;
        if (oldDelay == newDelay) return; // Avoid re-storing unchanged value
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(oldDelay, newDelay);
    }

    /// @notice Schedules a timelock action.
    /// @param actionType Type of action.
    /// @dev Uses abi.encodePacked with fixed-length inputs (actionType, _nonce) to avoid hash collisions.
    ///      Zero-to-one storage writes are unavoidable for dynamic mappings.
    function scheduleTimelockAction(ActionType actionType) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (_flags & 0x01 != 0 || _flags & 0x02 != 0) revert InvalidParameter();
        bytes32 actionId = keccak256(abi.encodePacked(actionType, _nonce));
        if (timelockActions[actionId].scheduledTime != 0) {
            revert TimelockPending();
        }

        uint48 scheduledTime = uint48(block.timestamp) + timelockDelay;
        timelockActions[actionId] = TimelockAction(scheduledTime, false, actionType);
        pendingTimelockActions++;
        _nonce++;

        emit ActionScheduled(actionId, actionType, scheduledTime);
    }

    /// @notice Executes a timelock action.
    /// @param actionId Action ID.
    /// @param actionType Action type.
    /// @dev Uses block.timestamp for coarse-grained timing, suitable for timelock.
    ///      .call for ETH transfer does not require payable modifier in Solidity 0.8.x.
    function executeTimelockAction(bytes32 actionId, ActionType actionType)
        external
        nonReentrant
        onlyRole(ADMIN_ROLE)
        whenNotStopped
    {
        TimelockAction storage action = timelockActions[actionId];
        if (action.scheduledTime == 0 || action.executed || action.actionType != actionType) revert InvalidParameter();
        if (block.timestamp < action.scheduledTime) revert TimelockNotReady();

        action.executed = true;
        pendingTimelockActions--;

        address treasury = treasuryWallet; // Cache treasuryWallet
        address self = address(this); // Cache address(this)
        if (actionType == ActionType.WithdrawPresaleFunds) {
            uint256 balance = _presaleTotalRaised;
            if (balance != 0) {
                delete _presaleTotalRaised; // Use delete to free storage
                (bool sent,) = treasury.call{value: balance}(""); // No payable modifier needed
                if (!sent) revert InvalidParameter();
                emit FundsWithdrawn(true, treasury, balance);
            }
        } else if (actionType == ActionType.WithdrawIDOFunds) {
            uint256 balance = _idoTotalRaised;
            if (balance != 0) {
                delete _idoTotalRaised; // Use delete to free storage
                (bool sent,) = treasury.call{value: balance}("");
                if (!sent) revert InvalidParameter();
                emit FundsWithdrawn(false, treasury, balance);
            }
        } else if (actionType == ActionType.RecoverUnsoldTokens) {
            uint256 unsold = token.balanceOf(self);
            if (unsold != 0) {
                uint256 balanceBefore = token.balanceOf(treasury);
                token.safeTransfer(treasury, unsold);
                uint256 balanceAfter = token.balanceOf(treasury);
                uint256 actualAmount = balanceAfter - balanceBefore;
                if (actualAmount == 0) revert InvalidParameter();
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
        if (action.scheduledTime == 0 || action.executed || action.actionType != actionType) revert InvalidParameter();

        delete timelockActions[actionId]; // Free storage
        pendingTimelockActions--;
        emit ActionCanceled(actionId, actionType);
    }

    /// @notice Pauses or unpauses the sale.
    /// @param isPresale True for presale, false for IDO.
    /// @param paused Pause state.
    function setSalePaused(bool isPresale, bool paused) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (_flags & 0x04 == 0) revert InvalidParameter();
        bool current = isPresale ? (_flags & 0x01 != 0) : (_flags & 0x02 != 0);
        if (current == !paused) return; // Avoid re-storing unchanged value
        if (isPresale) {
            _flags = paused ? _flags & 0xFE : _flags | 0x01;
        } else {
            _flags = paused ? _flags & 0xFD : _flags | 0x02;
        }
        emit SalePaused(isPresale, paused);
    }

    /// @notice Sets emergency stop state.
    /// @param stopped Stop state.
    function setEmergencyStop(bool stopped) external onlyRole(ADMIN_ROLE) {
        if (emergencyStopped == stopped) return; // Avoid re-storing unchanged value
        emergencyStopped = stopped;
        if (stopped) _flags &= 0xFC; // Disable presale and IDO
        emit EmergencyStop(stopped);
    }

    /// @notice Updates the treasury wallet.
    /// @param newWallet New wallet address.
    function updateTreasuryWallet(address newWallet) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (newWallet == address(0)) revert InvalidParameter();
        if (newWallet == address(token)) revert InvalidParameter();
        address oldWallet = treasuryWallet;
        if (oldWallet == newWallet) return; // Avoid re-storing unchanged value
        treasuryWallet = newWallet;
        emit TreasuryWalletUpdated(oldWallet, newWallet);
    }

    /// @notice Extends the sale period.
    /// @param isPresale True for presale, false for IDO.
    /// @param newEndTime New end time.
    function extendSalePeriod(bool isPresale, uint48 newEndTime) external onlyRole(ADMIN_ROLE) whenNotStopped {
        if (_flags & 0x04 == 0) revert InvalidParameter();
        bool isActive = isPresale ? (_flags & 0x01 != 0) : (_flags & 0x02 != 0);
        if (!isActive) revert InvalidParameter();
        uint48 currentEndTime = isPresale ? presaleEndTime : idoEndTime;
        if (newEndTime <= currentEndTime) revert InvalidParameter();
        if (isPresale) presaleEndTime = newEndTime;
        else idoEndTime = newEndTime;
        emit SalePeriodExtended(isPresale, newEndTime);
    }

    /// @notice Grants a role to an account.
    /// @param role Role to grant.
    /// @param account Account address.
    function grantRoleToAddress(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotStopped {
        if (account == address(0)) revert InvalidParameter();
        if (hasRole(role, account)) return; // Avoid re-storing unchanged value
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
        if (account == address(0)) revert InvalidParameter();
        if (!hasRole(role, account)) revert InvalidParameter();
        _revokeRole(role, account);
        emit RoleChanged(role, account, false);
    }

    // --- Public Functions ---

    /// @notice Purchases presale tokens.
    /// @param proof Merkle proof for whitelisting.
    /// @dev Uses block.timestamp for coarse-grained timing, suitable for sale periods.
    ///      Revert conditions are limited to essential security checks to mitigate DoS risks.
    function buyPresaleTokens(bytes32[] calldata proof) external payable nonReentrant whenNotStopped {
        address buyer = msg.sender;
        if (buyer == address(0)) revert InvalidParameter();
        if (!isWhitelisted(true, buyer, proof)) revert InvalidProof();
        _buyTokens(true, buyer, msg.value);
    }

    /// @notice Purchases IDO tokens.
    /// @param proof Merkle proof for whitelisting.
    /// @dev Uses block.timestamp for coarse-grained timing, suitable for sale periods.
    ///      Revert conditions are limited to essential security checks to mitigate DoS risks.
    function buyIDOTokens(bytes32[] calldata proof) external payable nonReentrant whenNotStopped {
        address buyer = msg.sender;
        if (buyer == address(0)) revert InvalidParameter();
        if (!isWhitelisted(false, buyer, proof)) revert InvalidProof();
        _buyTokens(false, buyer, msg.value);
    }

    /// @notice Releases vested tokens for a contributor.
    /// @param contributor Contributor address.
    /// @param isPresale True for presale, false for IDO.
    /// @dev Uses block.timestamp for coarse-grained timing, suitable for vesting schedules.
    function releaseVestedTokens(address contributor, bool isPresale) external nonReentrant whenNotStopped {
        if (msg.sender != contributor && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert InvalidParameter();
        }
        Contributor storage contrib = _contributors[contributor];
        uint128 vestedTokens = isPresale ? contrib.presaleVestedTokens : contrib.idoVestedTokens;
        if (vestedTokens == 0) revert VestingNotActive();

        if (isPresale && block.timestamp < contrib.presaleVestingStart + (12 * ONE_MONTH)) revert CliffNotPassed();

        uint256 vested = _calculateVested(isPresale, contrib);
        uint128 released = isPresale ? contrib.presaleReleased : contrib.idoReleased;
        uint256 releasable = vested - released;
        if (releasable == 0) revert NoTokensToRelease();

        uint256 balanceBefore = token.balanceOf(contributor);
        if (isPresale) {
            contrib.presaleReleased = uint128(vested);
        } else {
            contrib.idoReleased = uint128(vested);
        }
        token.safeTransfer(contributor, releasable);
        uint256 balanceAfter = token.balanceOf(contributor);
        uint256 actualAmount = balanceAfter - balanceBefore;
        if (actualAmount == 0) revert InvalidParameter();

        emit VestingReleased(contributor, isPresale, actualAmount);
    }

    // --- View Functions ---

    /// @notice Gets the contract's ETH balance.
    /// @return Balance in wei.
    function selfBalance() external view returns (uint256) {
        return address(this).balance; // Uses address(this).balance as per provided contract
    }

    /// @notice Checks if a user is whitelisted.
    /// @param isPresale True for presale, false for IDO.
    /// @param user User address.
    /// @param proof Merkle proof.
    /// @return True if whitelisted.
    /// @dev Uses abi.encodePacked with fixed-length inputs (user, nonce) to avoid hash collisions.
    function isWhitelisted(bool isPresale, address user, bytes32[] memory proof) public view returns (bool) {
        if (user == address(0)) revert InvalidParameter();
        bytes32 leaf = keccak256(abi.encodePacked(user, isPresale ? _presaleUsedNonces[user] : _idoUsedNonces[user]));
        bytes32 root = isPresale ? presaleMerkleRoot : idoMerkleRoot;
        return proof.verify(root, leaf);
    }

    /// @notice Gets a contributor's details.
    /// @param contributor Contributor address.
    /// @return presaleContribution ETH contributed in presale.
    /// @return idoContribution ETH contributed in IDO.
    /// @return presaleVestedTokens Vested presale tokens.
    /// @return idoVestedTokens Vested IDO tokens.
    /// @return presaleReleased Released presale tokens.
    /// @return idoReleased Released IDO tokens.
    /// @return presaleReleasable Releasable presale tokens.
    /// @return idoReleasable Releasable IDO tokens.
    /// @return presaleVestingStart Presale vesting start time.
    /// @return idoVestingStart IDO vesting start time.
    function getContribution(address contributor)
        external
        view
        returns (
            uint128 presaleContribution,
            uint128 idoContribution,
            uint128 presaleVestedTokens,
            uint128 idoVestedTokens,
            uint128 presaleReleased,
            uint128 idoReleased,
            uint128 presaleReleasable,
            uint128 idoReleasable,
            uint48 presaleVestingStart,
            uint48 idoVestingStart
        )
    {
        Contributor storage contrib = _contributors[contributor];
        presaleContribution = contrib.presaleContribution;
        idoContribution = contrib.idoContribution;
        presaleVestedTokens = contrib.presaleVestedTokens;
        idoVestedTokens = contrib.idoVestedTokens;
        presaleReleased = contrib.presaleReleased;
        idoReleased = contrib.idoReleased;
        presaleVestingStart = contrib.presaleVestingStart;
        idoVestingStart = contrib.idoVestingStart;

        if (contrib.presaleVestedTokens == 0 || block.timestamp < contrib.presaleVestingStart + (12 * ONE_MONTH)) {
            presaleReleasable = 0;
        } else {
            uint256 vested = _calculateVested(true, contrib);
            presaleReleasable = uint128(vested - contrib.presaleReleased);
        }

        if (contrib.idoVestedTokens == 0) {
            idoReleasable = 0;
        } else {
            uint256 vested = _calculateVested(false, contrib);
            idoReleasable = uint128(vested - contrib.idoReleased);
        }
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

    /// @notice Validates sale conditions and contribution amounts.
    /// @param isPresale True for presale, false for IDO.
    /// @param ethValue ETH amount sent.
    /// @param totalRaised Current total raised.
    /// @param userContribution Current user contribution.
    /// @dev Uses block.timestamp for coarse-grained timing, suitable for sale periods.
    ///      If statements are retained for clarity over ternary operators.
    function _validateSale(bool isPresale, uint256 ethValue, uint128 totalRaised, uint128 userContribution)
        private
        view
    {
        uint48 currentTime = uint48(block.timestamp);
        bool isActive = isPresale ? (_flags & 0x01 != 0) : (_flags & 0x02 != 0);
        uint48 startTime = isPresale ? presaleStartTime : idoStartTime;
        uint48 endTime = isPresale ? presaleEndTime : idoEndTime;

        if (!isActive || currentTime < startTime || currentTime >= endTime) {
            revert SaleNotActive();
        }
        if (ethValue < MIN_CONTRIBUTION || ethValue > MAX_CONTRIBUTION) {
            revert InvalidParameter();
        }
        if (totalRaised + ethValue > SALE_CAP) revert CapExceeded();
        if (userContribution + ethValue > MAX_USER_CONTRIBUTION) {
            revert CapExceeded();
        }
    }

    /// @notice Handles token purchase logic.
    /// @param isPresale True for presale, false for IDO.
    /// @param buyer Buyer address.
    /// @param ethValue ETH amount sent.
    /// @dev Zero-to-one storage writes are unavoidable for dynamic mappings.
    function _buyTokens(bool isPresale, address buyer, uint256 ethValue) private {
        // Cache contributor and key state variables
        Contributor storage contributor = _contributors[buyer];
        uint128 totalRaised = isPresale ? _presaleTotalRaised : _idoTotalRaised;
        uint128 tokensSold = isPresale ? _presaleTokensSold : _idoTokensSold;
        uint128 userContribution = isPresale ? contributor.presaleContribution : contributor.idoContribution;

        // Validate sale and contribution
        _validateSale(isPresale, ethValue, totalRaised, userContribution);

        // Calculate tokens and check allocation
        uint256 totalTokens = (ethValue * 1e18) / TOKEN_PRICE;
        uint256 allocation = isPresale ? PRESALE_ALLOCATION : IDO_ALLOCATION;
        if (tokensSold + totalTokens > allocation) revert InsufficientTokens();

        // Update state and handle purchase
        bool isNewContributor = (isPresale ? contributor.presaleContribution : contributor.idoContribution) == 0;
        uint48 currentTime = uint48(block.timestamp);

        if (isPresale) {
            _presaleTotalRaised += uint128(ethValue);
            _presaleTokensSold += uint128(totalTokens);
            if (isNewContributor) {
                _presaleContributorCount++;
                contributor.presaleVestingStart = currentTime;
                emit ContributorAdded(true, buyer, _presaleContributorCount);
            }
            contributor.presaleContribution += uint128(ethValue);
            contributor.presaleVestedTokens += uint128(totalTokens);
            _presaleUsedNonces[buyer] = _nonce;
            emit PresaleTokensPurchased(buyer, ethValue, totalTokens);
        } else {
            uint256 tgeTokens = (totalTokens * TGE_UNLOCK_PERCENT) / 100;
            uint256 vestedTokens = totalTokens - tgeTokens;
            _idoTotalRaised += uint128(ethValue);
            _idoTokensSold += uint128(totalTokens);
            if (isNewContributor) {
                _idoContributorCount++;
                contributor.idoVestingStart = currentTime;
                emit ContributorAdded(false, buyer, _idoContributorCount);
            }
            contributor.idoContribution += uint128(ethValue);
            contributor.idoVestedTokens += uint128(vestedTokens);
            _idoUsedNonces[buyer] = _nonce;
            _transferTokens(buyer, tgeTokens);
            emit IDOTokensPurchased(buyer, ethValue, tgeTokens, vestedTokens);
        }

        _nonce++;

        // Check if sale phase should end
        if (totalRaised + ethValue >= SALE_CAP || tokensSold + totalTokens >= allocation) {
            if (isPresale) {
                _flags &= 0xFE;
            }
            // Disable presale
            else {
                _flags &= 0xFD;
            } // Disable IDO
            emit SalePhaseEnded(isPresale, uint128(totalRaised + ethValue), uint128(tokensSold + totalTokens));
        }
    }

    /// @notice Transfers tokens and verifies the transfer.
    /// @param buyer Buyer address.
    /// @param tokenAmount Amount of tokens to transfer.
    function _transferTokens(address buyer, uint256 tokenAmount) private {
        uint256 balanceBefore = token.balanceOf(buyer);
        token.safeTransfer(buyer, tokenAmount);
        uint256 balanceAfter = token.balanceOf(buyer);
        uint256 actualAmount = balanceAfter - balanceBefore;
        if (actualAmount == 0) revert InvalidParameter();
    }

    /// @notice Calculates vested tokens based on elapsed time after cliff.
    /// @param isPresale True for presale, false for IDO.
    /// @param contrib Contributor data.
    /// @return vested The amount of vested tokens.
    /// @dev Uses block.timestamp for coarse-grained timing, suitable for vesting schedules.
    function _calculateVested(bool isPresale, Contributor storage contrib) private view returns (uint256 vested) {
        uint128 vestedTokens = isPresale ? contrib.presaleVestedTokens : contrib.idoVestedTokens;
        uint48 vestingStart = isPresale ? contrib.presaleVestingStart : contrib.idoVestingStart;
        uint48 duration = isPresale ? (24 * ONE_MONTH) : (12 * ONE_MONTH);
        uint48 cliff = isPresale ? (12 * ONE_MONTH) : 0;

        if (block.timestamp >= vestingStart + duration + cliff) {
            vested = vestedTokens;
        } else if (block.timestamp <= vestingStart + cliff) {
            vested = isPresale ? contrib.presaleReleased : contrib.idoReleased;
        } else {
            uint48 elapsed = uint48(block.timestamp) - (vestingStart + cliff);
            vested = (vestedTokens * uint256(elapsed) * PRECISION) / (uint256(duration) * PRECISION);
            vested += (isPresale ? contrib.presaleReleased : contrib.idoReleased);
        }
    }

    /// @notice Restricts direct ETH deposits.
    receive() external payable {
        revert InvalidParameter();
    }
}
