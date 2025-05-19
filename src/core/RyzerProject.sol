// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./IRyzerEscrow.sol";
import "./IRyzerOrderManager.sol";
import "./IRyzerDAO.sol";

/// @title RyzerProject
/// @notice ERC-3643 compliant token for general asset tokenization with transfer restrictions, access control, and metadata management
/// @dev Uses OpenZeppelin upgradeable contracts for security, modularity, and upgradability
contract RyzerProject is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC20Upgradeable
{
    using SafeERC20 for IERC20;

    // Role identifiers
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROJECT_ADMIN_ROLE = keccak256("PROJECT_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Constants
    uint256 public constant TOKEN_DECIMALS = 10 ** 18;
    uint256 public constant USDT_DECIMALS = 10 ** 6;
    uint256 public constant MAX_DIVIDEND_PCT = 50;
    uint256 public constant MAX_EOI_PCT = 50;
    uint256 public constant DEFAULT_LOCK_PERIOD = 365 days;

    // Core project state
    address public factoryOwner;
    address public projectOwner;
    bytes32 public companyId;
    bytes32 public assetId;
    uint256 public tokenPrice;
    uint256 public cancelDelay;
    uint256 public dividendPct;
    uint256 public eoiPct;
    uint256 public minInvestment;
    uint256 public maxInvestment;
    bytes32 public assetType;
    bytes32 public legalMetadataCID;
    IERC20 public usdtToken;
    address public escrow;
    address public orderManager;
    address public dao;
    uint16 public chainId;
    bytes32 public metadataCID;
    bool public isActive;
    uint48 public defaultLockPeriod;
    uint256 public requiredSignatures;

    // Mappings
    mapping(address => uint48) public lockUntil;
    mapping(uint256 => MetadataUpdate) private metadataUpdates;
    uint256 public metadataUpdateCount;

    // Structs
    struct ProjectInitParams {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 tokenPrice;
        uint256 cancelDelay;
        address projectOwner;
        address factory;
        bytes32 companyId;
        bytes32 assetId;
        bytes32 metadataCID;
        bytes32 assetType;
        bytes32 legalMetadataCID;
        uint16 chainId;
        uint256 dividendPct;
        uint256 premintAmount;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 eoiPct;
    }

    struct MetadataUpdate {
        bytes32 newCID;
        bool isLegal;
        uint256 signatureCount;
        mapping(address => bool) signed;
        bool executed;
    }

    struct ProjectDetails {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 tokenPrice;
        uint256 cancelDelay;
        uint256 dividendPct;
        uint256 minInvestment;
        uint256 maxInvestment;
        bytes32 assetType;
        bytes32 metadataCID;
        bytes32 legalMetadataCID;
        bytes32 companyId;
        bytes32 assetId;
        address projectOwner;
        address factoryOwner;
        address escrow;
        address orderManager;
        address dao;
        address owner;
        uint16 chainId;
        bool isActive;
        uint256 eoiPct;
    }

    // Events
    event LockPeriodSet(address indexed user, uint48 unlockTime, uint16 chainId);
    event BatchLockPeriodSet(uint256 userCount, uint48 unlockTime, uint16 chainId);
    event ProjectDeactivated(address indexed project, bytes32 reason, uint16 chainId);
    event MetadataUpdateProposed(uint256 indexed updateId, bytes32 newCID, bool isLegal, uint16 chainId);
    event MetadataUpdateSigned(uint256 indexed updateId, address indexed signer, uint16 chainId);
    event MetadataUpdated(uint256 indexed updateId, bytes32 oldCID, bytes32 newCID, bool isLegal, uint16 chainId);
    event ProjectContractsSet(
        address indexed escrow, address indexed orderManager, address indexed dao, uint16 chainId
    );
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, uint16 chainId);
    event UsdtTokenSet(address indexed usdtToken, uint16 chainId);

    // Errors
    error InvalidAddress(address addr);
    error InvalidChainId(uint16 chainId);
    error InvalidParameter(string parameter);
    error Unauthorized(address caller);
    error ProjectInactive();
    error InvalidMetadataCID(bytes32 cid);
    error InvalidAssetType(bytes32 assetType);
    error TokensLocked(address user, uint48 unlockTime);
    error InvalidMetadataUpdate(uint256 updateId);
    error AlreadySigned(address signer);
    error UpdateAlreadyExecuted(uint256 updateId);
    error InvalidToken(address token);

    /// @notice Validates initialization parameters
    function _validateInitParams(ProjectInitParams memory params) private pure {
        if (params.factory == address(0)) revert InvalidAddress(params.factory);
        if (params.projectOwner == address(0)) {
            revert InvalidAddress(params.projectOwner);
        }
        if (params.maxSupply == 0) revert InvalidParameter("maxSupply");
        if (params.tokenPrice == 0) revert InvalidParameter("tokenPrice");
        if (params.cancelDelay == 0) revert InvalidParameter("cancelDelay");
        if (params.dividendPct > MAX_DIVIDEND_PCT) {
            revert InvalidParameter("dividendPct");
        }
        if (params.eoiPct > MAX_EOI_PCT) revert InvalidParameter("eoiPct");
        if (params.premintAmount > params.maxSupply) {
            revert InvalidParameter("premintAmount");
        }
        if (params.metadataCID == bytes32(0)) {
            revert InvalidMetadataCID(params.metadataCID);
        }
        if (params.legalMetadataCID == bytes32(0)) {
            revert InvalidMetadataCID(params.legalMetadataCID);
        }
        if (params.minInvestment == 0) revert InvalidParameter("minInvestment");
        if (params.maxInvestment < params.minInvestment) {
            revert InvalidParameter("maxInvestment");
        }
        if (params.chainId == 0) revert InvalidChainId(params.chainId);
        if (
            params.assetType != bytes32("Commercial") && params.assetType != bytes32("Residential")
                && params.assetType != bytes32("Holiday") && params.assetType != bytes32("Land")
        ) revert InvalidAssetType(params.assetType);
    }

    /// @notice Sets initial project state
    function _setProjectState(ProjectInitParams memory params) internal {
        factoryOwner = params.factory;
        projectOwner = params.projectOwner;
        companyId = params.companyId;
        assetId = params.assetId;
        tokenPrice = params.tokenPrice;
        cancelDelay = params.cancelDelay;
        dividendPct = params.dividendPct;
        eoiPct = params.eoiPct;
        minInvestment = params.minInvestment * TOKEN_DECIMALS;
        maxInvestment = params.maxInvestment * TOKEN_DECIMALS;
        assetType = params.assetType;
        legalMetadataCID = params.legalMetadataCID;
        metadataCID = params.metadataCID;
        chainId = params.chainId;
        isActive = true;
        defaultLockPeriod = uint48(DEFAULT_LOCK_PERIOD);
        requiredSignatures = 2;
    }

    /// @notice Initializes the contract
    function initialize(bytes memory initData) public virtual initializer {
        ProjectInitParams memory params = abi.decode(initData, (ProjectInitParams));
        _validateInitParams(params);

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __ERC20_init(params.name, params.symbol);

        _setProjectState(params);

        if (params.premintAmount > 0) {
            _mint(params.projectOwner, params.premintAmount * TOKEN_DECIMALS);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, params.projectOwner);
        _grantRole(ADMIN_ROLE, params.projectOwner);
        _setRoleAdmin(PROJECT_ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _grantRole(PROJECT_ADMIN_ROLE, params.projectOwner);
        _grantRole(MINTER_ROLE, params.projectOwner);
    }

    /// @notice Sets the USDT token contract
    function setUsdtToken(address _usdtToken) external onlyRole(ADMIN_ROLE) {
        if (_usdtToken == address(0)) revert InvalidAddress(_usdtToken);
        if (IERC20Metadata(_usdtToken).decimals() != 6) {
            revert InvalidToken(_usdtToken);
        }
        usdtToken = IERC20(_usdtToken);
        emit UsdtTokenSet(_usdtToken, chainId);
    }

    /// @notice Sets project-related contracts
    function setProjectContracts(address _escrow, address _orderManager, address _dao)
        public
        virtual
        onlyRole(ADMIN_ROLE)
    {
        if (_escrow == address(0) || _orderManager == address(0) || _dao == address(0)) {
            revert InvalidAddress(address(0));
        }
        escrow = _escrow;
        orderManager = _orderManager;
        dao = _dao;
        emit ProjectContractsSet(_escrow, _orderManager, _dao, chainId);
    }

    /// @notice Proposes a metadata update
    function proposeMetadataUpdate(bytes32 newCID, bool isLegal) external onlyRole(PROJECT_ADMIN_ROLE) whenNotPaused {
        if (newCID == bytes32(0)) revert InvalidMetadataCID(newCID);
        uint256 updateId = metadataUpdateCount++;
        MetadataUpdate storage update = metadataUpdates[updateId];
        update.newCID = newCID;
        update.isLegal = isLegal;
        update.signed[msg.sender] = true;
        update.signatureCount = 1;
        emit MetadataUpdateProposed(updateId, newCID, isLegal, chainId);
        emit MetadataUpdateSigned(updateId, msg.sender, chainId);
    }

    /// @notice Approves a metadata update
    function approveMetadataUpdate(uint256 updateId) external onlyRole(PROJECT_ADMIN_ROLE) whenNotPaused {
        MetadataUpdate storage update = metadataUpdates[updateId];
        if (update.newCID == bytes32(0)) revert InvalidMetadataUpdate(updateId);
        if (update.executed) revert UpdateAlreadyExecuted(updateId);
        if (update.signed[msg.sender]) revert AlreadySigned(msg.sender);

        update.signed[msg.sender] = true;
        update.signatureCount++;
        emit MetadataUpdateSigned(updateId, msg.sender, chainId);

        if (update.signatureCount >= requiredSignatures) {
            bytes32 oldCID = update.isLegal ? legalMetadataCID : metadataCID;
            if (update.isLegal) {
                legalMetadataCID = update.newCID;
            } else {
                metadataCID = update.newCID;
            }
            update.executed = true;
            emit MetadataUpdated(updateId, oldCID, update.newCID, update.isLegal, chainId);
        }
    }

    /// @notice Hook to enforce transfer restrictions
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {
        if (!isActive) revert ProjectInactive();
        if (from != address(0) && block.timestamp < lockUntil[from]) {
            revert TokensLocked(from, lockUntil[from]);
        }
        if (to != address(0)) {
            uint256 newBalance = balanceOf(to) + amount;
            if (amount < minInvestment && newBalance != 0) {
                revert InvalidParameter("amount below minInvestment");
            }
            if (newBalance > maxInvestment) {
                revert InvalidParameter("exceeds maxInvestment");
            }
        }
    }

    /// @notice Returns project details
    function getProjectDetails() public view virtual returns (ProjectDetails memory) {
        return ProjectDetails({
            name: name(),
            symbol: symbol(),
            maxSupply: totalSupply(),
            tokenPrice: tokenPrice,
            cancelDelay: cancelDelay,
            dividendPct: dividendPct,
            minInvestment: minInvestment,
            maxInvestment: maxInvestment,
            assetType: assetType,
            metadataCID: metadataCID,
            legalMetadataCID: legalMetadataCID,
            companyId: companyId,
            assetId: assetId,
            projectOwner: projectOwner,
            factoryOwner: factoryOwner,
            escrow: escrow,
            orderManager: orderManager,
            dao: dao,
            owner: projectOwner,
            chainId: chainId,
            isActive: isActive,
            eoiPct: eoiPct
        });
    }

    /// @notice Returns the project owner
    function owner() external view returns (address) {
        return projectOwner;
    }

    /// @notice Returns whether the project is active
    function getIsActive() external view returns (bool) {
        return isActive;
    }

    /// @notice Returns investment limits
    function getInvestmentLimits() external view returns (uint256 minInvestment_, uint256 maxInvestment_) {
        return (minInvestment, maxInvestment);
    }

    /// @notice Pauses the contract and related contracts
    function pause() public virtual onlyRole(ADMIN_ROLE) {
        _pause();
        if (escrow != address(0)) IRyzerEscrow(escrow).pause();
        if (orderManager != address(0)) {
            IRyzerOrderManager(orderManager).pause();
        }
    }

    /// @notice Unpauses the contract and related contracts
    function unpause() public virtual onlyRole(ADMIN_ROLE) {
        _unpause();
        if (escrow != address(0)) IRyzerEscrow(escrow).unpause();
        if (orderManager != address(0)) {
            IRyzerOrderManager(orderManager).unpause();
        }
    }

    /// @notice Authorizes contract upgrades
    function _authorizeUpgrade(address newImplementation) internal view virtual override onlyRole(ADMIN_ROLE) {
        if (newImplementation == address(0) || newImplementation.code.length == 0) {
            revert InvalidAddress(newImplementation);
        }
    }
}
