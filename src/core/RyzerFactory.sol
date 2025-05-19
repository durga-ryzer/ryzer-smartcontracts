// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Minimal IRyzerRegistry interface to resolve type errors
interface IRyzerRegistry {
    enum CompanyType {
        LLC,
        CORP,
        PARTNERSHIP
    }

    function registerCompany(address owner, string memory name, string memory jurisdiction, CompanyType companyType)
        external
        returns (uint256);
    function registerProject(uint256 companyId, address project) external;
}

// Updated IRyzerProject interface to include eoiPct
interface IRyzerProject {
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
    }

    function initialize(bytes memory initData) external;
    function setUsdtToken(address _usdtToken) external;
    function setProjectContracts(address _escrow, address _orderManager, address _dao) external;
    function proposeMetadataUpdate(bytes32 newCID, bool isLegal) external;
    function approveMetadataUpdate(uint256 updateId) external;
    function pause() external;
    function unpause() external;
    function getProjectDetails() external view returns (ProjectDetails memory);
    function lockUntil(address user) external view returns (uint48);
    function owner() external view returns (address);
    function getIsActive() external view returns (bool);
    function getInvestmentLimits() external view returns (uint256 minInvestment, uint256 maxInvestment);
    function tokenPrice() external view returns (uint256);
    function eoiPct() external view returns (uint256);
    function dividendPct() external view returns (uint256);
}

interface IRyzerEscrow {
    function initialize(address usdtToken, address project, uint16 chainId) external;
}

interface IRyzerOrderManager {
    function initialize(address usdtToken, address escrow, address project, uint16 chainId) external;
}

// Assumed IRyzerDAO interface with 6 arguments for initialize
interface IRyzerDAO {
    function initialize(
        address project,
        address ryzerXToken,
        uint16 chainId,
        address[] memory initialSigners,
        uint256 requiredSignatures,
        address admin
    ) external;
}

/// @title RyzerFactory
/// @notice Manages company registration and project creation for RWA tokenization in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern with multi-signature template updates
contract RyzerFactory is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MIN_JURISDICTION_LENGTH = 2;
    uint256 public constant MAX_JURISDICTION_LENGTH = 100;
    uint256 public constant MAX_TEMPLATE_UPDATE_DELAY = 7 days;
    uint256 public constant MIN_SIGNATURES = 2;
    uint256 public constant MAX_SIGNATURES = 10;
    uint256 public constant USDT_TOKEN_DECIMAL = 6;
    uint256 public constant RYZERX_TOKEN_DECIMAL = 18;

    enum CompanyType {
        LLC,
        CORP,
        PARTNERSHIP
    }
    enum TemplateType {
        PROJECT,
        ESCROW,
        ORDER_MANAGER,
        DAO
    }

    struct CompanyParams {
        string name;
        string jurisdiction;
        CompanyType companyType;
    }

    struct ProjectParams {
        string name;
        bytes32 assetType;
        uint16 chainId;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 totalSupply;
        bytes32 assetId;
        uint256 requiredSignatures;
        uint256 tokenPrice;
        uint256 cancelDelay;
        uint256 eoiPct;
        uint256 dividendPct;
        uint256 premintAmount;
        bytes32 metadataCID;
        bytes32 legalMetadataCID;
        address projectOwner;
        address factory;
    }

    struct TemplateProposal {
        address templateAddress;
        TemplateType templateType;
        uint48 startTime;
        uint48 endTime;
        uint48 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        uint256 signatureCount;
    }

    struct Contracts {
        address project;
        address escrow;
        address orderManager;
        address dao;
    }

    IERC20 public usdtToken;
    IERC20 public ryzerXToken;
    IRyzerRegistry public ryzerRegistry;
    address public projectTemplate;
    address public escrowTemplate;
    address public orderManagerTemplate;
    address daoTemplate;
    uint256 public companyCount;
    uint256 public templateProposalCount;
    uint256 public requiredSignatures;

    mapping(uint256 => address[]) public companyProjects;
    mapping(address => uint256) public ownerToCompany;
    mapping(uint256 => TemplateProposal) public templateProposals;
    mapping(uint256 => mapping(address => bool)) public proposalSigners;
    mapping(uint256 => mapping(address => address)) public projectEscrows;
    mapping(uint256 => mapping(address => address)) public projectOrderManagers;
    mapping(uint256 => mapping(address => address)) public projectDAOs;

    event FactoryInitialized(address indexed usdtToken, address indexed ryzerXToken, address indexed registry);
    event CompanyRegistered(
        uint256 indexed companyId, address indexed owner, string name, string jurisdiction, CompanyType companyType
    );
    event CompanyDetailsUpdated(uint256 indexed companyId, string name, string jurisdiction);
    event ProjectCreated(uint256 indexed companyId, address indexed project, bytes32 indexed assetId, string name);
    event TemplateUpdateProposed(
        uint256 indexed proposalId, address indexed templateAddress, TemplateType templateType
    );
    event TemplateUpdateSigned(uint256 indexed proposalId, address indexed signer);
    event TemplateUpdated(address indexed templateAddress, TemplateType templateType);
    event CoreContractsSet(address indexed usdtToken, address indexed ryzerXToken, address indexed registry);

    error InvalidAddress(address addr);
    error AddressAlreadyOwnsCompany(address addr);
    error InvalidCompanyType();
    error InvalidNameLength();
    error InvalidJurisdictionLength();
    error InvalidAssetType();
    error InvalidParameter(string parameter);
    error DeploymentFailed(string reason);
    // error InvalidTemplateType();
    // error InvalidDelay();
    error InsufficientBalance();
    //error InvalidCompany();
    error NotCompanyOwner();
    // error ProposalNotFound();
    // error VotingPeriodEnded();
    // error AlreadySigned();
    // error QuorumNotMet();
    // error InsufficientSignatures();
    // error ProposalExpired();
    error InvalidSignatureCount();
    error InvalidTokenDecimals(string token, uint8 decimals);

    /// @notice Initializes the factory contract
    function initialize(
        address _usdtToken,
        address _ryzerXToken,
        address _registry,
        address _projectTemplate,
        address _escrowTemplate,
        address _orderManagerTemplate,
        address _daoTemplate
    ) external initializer {
        if (
            _usdtToken == address(0) || _ryzerXToken == address(0) || _registry == address(0)
                || _projectTemplate == address(0) || _escrowTemplate == address(0) || _orderManagerTemplate == address(0)
                || _daoTemplate == address(0)
        ) revert InvalidAddress(address(0));
        if (
            _registry.code.length == 0 || _projectTemplate.code.length == 0 || _escrowTemplate.code.length == 0
                || _orderManagerTemplate.code.length == 0 || _daoTemplate.code.length == 0
        ) revert InvalidAddress(address(0));
        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals("USDT", IERC20Metadata(_usdtToken).decimals());
        }
        if (IERC20Metadata(_ryzerXToken).decimals() != RYZERX_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals("RyzerX", IERC20Metadata(_ryzerXToken).decimals());
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        usdtToken = IERC20(_usdtToken);
        ryzerXToken = IERC20(_ryzerXToken);
        ryzerRegistry = IRyzerRegistry(_registry);
        projectTemplate = _projectTemplate;
        escrowTemplate = _escrowTemplate;
        orderManagerTemplate = _orderManagerTemplate;
        daoTemplate = _daoTemplate;
        requiredSignatures = MIN_SIGNATURES;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        emit FactoryInitialized(address(usdtToken), address(ryzerXToken), address(ryzerRegistry));
    }

    /// @notice Sets core contract addresses
    function setCoreContracts(address _usdtToken, address _ryzerXToken, address _registry)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_usdtToken == address(0) || _ryzerXToken == address(0) || _registry == address(0)) {
            revert InvalidAddress(address(0));
        }
        if (_registry.code.length == 0) revert InvalidAddress(_registry);

        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals("USDT", IERC20Metadata(_usdtToken).decimals());
        }
        if (IERC20Metadata(_ryzerXToken).decimals() != RYZERX_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals("RyzerX", IERC20Metadata(_ryzerXToken).decimals());
        }

        usdtToken = IERC20(_usdtToken);
        ryzerXToken = IERC20(_ryzerXToken);
        ryzerRegistry = IRyzerRegistry(_registry);
        emit CoreContractsSet(_usdtToken, _ryzerXToken, _registry);
    }

    /// @notice Authorizes contract upgrades
    function _authorizeUpgrade(address newImplementation) internal view override onlyRole(ADMIN_ROLE) {
        if (newImplementation == address(0) || newImplementation.code.length == 0) {
            revert InvalidAddress(newImplementation);
        }
    }

    /// @notice Registers a new company
    function registerCompany(CompanyParams calldata params) external nonReentrant whenNotPaused {
        if (ownerToCompany[msg.sender] != 0) {
            revert AddressAlreadyOwnsCompany(msg.sender);
        }
        if (ryzerXToken.balanceOf(msg.sender) == 0) {
            revert InsufficientBalance();
        }
        if (bytes(params.name).length < MIN_NAME_LENGTH || bytes(params.name).length > MAX_NAME_LENGTH) {
            revert InvalidNameLength();
        }
        if (
            bytes(params.jurisdiction).length < MIN_JURISDICTION_LENGTH
                || bytes(params.jurisdiction).length > MAX_JURISDICTION_LENGTH
        ) revert InvalidJurisdictionLength();
        if (uint256(params.companyType) > uint256(CompanyType.PARTNERSHIP)) {
            revert InvalidCompanyType();
        }

        uint256 newCompanyId = ryzerRegistry.registerCompany(
            msg.sender, params.name, params.jurisdiction, IRyzerRegistry.CompanyType(uint256(params.companyType))
        );
        ownerToCompany[msg.sender] = newCompanyId;
        companyCount = newCompanyId;

        emit CompanyRegistered(newCompanyId, msg.sender, params.name, params.jurisdiction, params.companyType);
    }

    /// @notice Validates project parameters
    function _validateProjectParams(uint256 companyId, ProjectParams calldata params) private view {
        if (companyId == 0) revert InvalidParameter("companyId");
        if (bytes(params.name).length < MIN_NAME_LENGTH || bytes(params.name).length > MAX_NAME_LENGTH) {
            revert InvalidNameLength();
        }
        if (
            params.assetType != bytes32("Commercial") && params.assetType != bytes32("Residential")
                && params.assetType != bytes32("Holiday") && params.assetType != bytes32("Land")
        ) revert InvalidAssetType();
        if (
            params.minInvestment == 0 || params.maxInvestment < params.minInvestment || params.totalSupply == 0
                || params.tokenPrice == 0 || params.cancelDelay == 0 || params.eoiPct == 0 || params.eoiPct > 50
                || params.dividendPct > 50 || params.premintAmount > params.totalSupply || params.metadataCID == bytes32(0)
                || params.legalMetadataCID == bytes32(0) || params.projectOwner == address(0)
                || params.factory != address(this)
        ) revert InvalidParameter("invalid project parameter");
        if (params.requiredSignatures < MIN_SIGNATURES || params.requiredSignatures > MAX_SIGNATURES) {
            revert InvalidSignatureCount();
        }
        if (params.chainId != uint16(block.chainid)) {
            revert InvalidParameter("chainId");
        }
    }

    /// @notice Creates a new RWA project
    function createProject(uint256 companyId, ProjectParams calldata params)
        external
        nonReentrant
        whenNotPaused
        returns (address)
    {
        if (ownerToCompany[msg.sender] != companyId) revert NotCompanyOwner();
        _validateProjectParams(companyId, params);

        uint16 chainId = params.chainId;
        Contracts memory contracts;
        contracts.project = Clones.clone(projectTemplate);
        contracts.escrow = Clones.clone(escrowTemplate);
        contracts.orderManager = Clones.clone(orderManagerTemplate);
        contracts.dao = Clones.clone(daoTemplate);

        if (
            contracts.project == address(0) || contracts.escrow == address(0) || contracts.orderManager == address(0)
                || contracts.dao == address(0)
        ) revert DeploymentFailed("clone failed");
        if (
            contracts.project.code.length == 0 || contracts.escrow.code.length == 0
                || contracts.orderManager.code.length == 0 || contracts.dao.code.length == 0
        ) revert DeploymentFailed("invalid clone code");

        // Initialize Project
        try IRyzerProject(contracts.project).initialize(
            abi.encode(
                IRyzerProject.ProjectInitParams({
                    name: params.name,
                    symbol: string(abi.encodePacked("RWA-", params.name)),
                    maxSupply: params.totalSupply,
                    tokenPrice: params.tokenPrice,
                    cancelDelay: params.cancelDelay,
                    projectOwner: params.projectOwner,
                    factory: params.factory,
                    companyId: bytes32(companyId),
                    assetId: params.assetId,
                    metadataCID: params.metadataCID,
                    assetType: params.assetType,
                    legalMetadataCID: params.legalMetadataCID,
                    chainId: chainId,
                    dividendPct: params.dividendPct,
                    premintAmount: params.premintAmount,
                    minInvestment: params.minInvestment,
                    maxInvestment: params.maxInvestment,
                    eoiPct: params.eoiPct
                })
            )
        ) {
            // Initialize Escrow
            try IRyzerEscrow(contracts.escrow).initialize(address(usdtToken), contracts.project, chainId) {}
            catch {
                revert DeploymentFailed("escrow initialization failed");
            }

            // Initialize Order Manager
            try IRyzerOrderManager(contracts.orderManager).initialize(
                address(usdtToken), contracts.escrow, contracts.project, chainId
            ) {} catch {
                revert DeploymentFailed("order manager initialization failed");
            }

            // Initialize DAO
            address[] memory initialSigners = new address[](1);
            initialSigners[0] = msg.sender;
            try IRyzerDAO(contracts.dao).initialize(
                contracts.project,
                address(ryzerXToken),
                chainId,
                initialSigners,
                params.requiredSignatures,
                msg.sender // Added admin parameter
            ) {} catch {
                revert DeploymentFailed("DAO initialization failed");
            }

            // Set project contracts
            try IRyzerProject(contracts.project).setProjectContracts(
                contracts.escrow, contracts.orderManager, contracts.dao
            ) {} catch {
                revert DeploymentFailed("project contract setup failed");
            }

            // Set USDT token
            try IRyzerProject(contracts.project).setUsdtToken(address(usdtToken)) {}
            catch {
                revert DeploymentFailed("USDT token setup failed");
            }

            // Register project in registry
            ryzerRegistry.registerProject(companyId, contracts.project);

            // Update storage
            companyProjects[companyId].push(contracts.project);
            projectEscrows[companyId][contracts.project] = contracts.escrow;
            projectOrderManagers[companyId][contracts.project] = contracts.orderManager;
            projectDAOs[companyId][contracts.project] = contracts.dao;

            emit ProjectCreated(companyId, contracts.project, params.assetId, params.name);
            return contracts.project;
        } catch {
            revert DeploymentFailed("project initialization failed");
        }
    }

    /// @notice Pauses the contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Gets project contracts for a company
    function getProjectContracts(uint256 companyId, address project)
        external
        view
        returns (Contracts memory contracts)
    {
        contracts = Contracts({
            project: project,
            escrow: projectEscrows[companyId][project],
            orderManager: projectOrderManagers[companyId][project],
            dao: projectDAOs[companyId][project]
        });
    }
}
