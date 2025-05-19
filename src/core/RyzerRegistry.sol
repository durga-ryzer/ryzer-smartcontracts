// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title RyzerRegistry
/// @notice Manages company and project metadata for real estate tokenization in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern for modularity and upgradability
contract RyzerRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    /*//////////////////////////////////////////////////////////////
                           ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidAddress(address addr);
    error InvalidChainId(uint16 chainId);
    error InvalidParameter(string parameter);
    error AddressAlreadyOwnsCompany();
    error InvalidCompanyId(uint256 companyId);
    error InvalidProjectId(uint256 projectId);
    error EtherNotAccepted();

    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    // Enums
    enum CompanyType {
        LLC,
        PrivateLimited,
        DAOLLC,
        Corporation,
        PublicEntity,
        Partnership
    }
    enum AssetType {
        Commercial,
        Residential,
        Holiday,
        Land
    }

    // Structs
    struct Company {
        address owner;
        string name;
        CompanyType companyType;
        string jurisdiction;
        bool isActive;
    }

    struct Project {
        address projectAddress;
        address escrow;
        address orderManager;
        address dao;
        string name;
        string symbol;
        string metadataCID;
        AssetType assetType;
        string legalMetadataCID;
        bool isActive;
    }

    struct ProjectParams {
        string name;
        string symbol;
        string metadataCID;
        AssetType assetType;
        string legalMetadataCID;
        address projectAddress;
        address escrow;
        address orderManager;
        address dao;
    }

    struct ProjectDetails {
        address projectAddress;
        address escrow;
        address orderManager;
        address dao;
        string name;
        string symbol;
        string metadataCID;
        AssetType assetType;
        string legalMetadataCID;
        bool isActive;
    }

    struct BatchProjectResponse {
        uint256[] projectIds;
        ProjectDetails[] projectDetails;
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // Role identifiers
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRY_ADMIN_ROLE =
        keccak256("REGISTRY_ADMIN_ROLE");

    // Constants
    uint256 public constant MAX_STRING_LENGTH = 100;
    uint256 public constant MAX_SYMBOL_LENGTH = 32;
    uint256 public constant MAX_BATCH_SIZE = 50;
    string public constant CONTRACT_VERSION = "1.0.0";

    // Core state
    address public factory;
    uint16 public chainId;
    uint256 public companyCount;
    uint256 public projectCount;

    // Mappings
    mapping(uint256 => Company) public companies;
    mapping(address => uint256) public companyIdForAddress;
    mapping(uint256 => mapping(uint256 => Project)) public projects;
    mapping(uint256 => uint256[]) public companyProjectIds;

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    event RegistryInitialized(uint16 chainId);
    event CompanyRegistered(
        uint256 indexed companyId,
        address indexed owner,
        string name,
        CompanyType companyType,
        string jurisdiction
    );
    event ProjectRegistered(
        uint256 indexed companyId,
        uint256 indexed projectId,
        address indexed projectAddress
    );
    event BatchProjectRegistered(
        uint256 indexed companyId,
        uint256[] projectIds
    );
    event ProjectDeactivated(
        uint256 indexed companyId,
        uint256 indexed projectId
    );
    event MetadataUpdated(
        uint256 indexed companyId,
        uint256 indexed projectId,
        string metadataType,
        string newCID
    );

    /*//////////////////////////////////////////////////////////////
                           MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyValidCompany(uint256 companyId) {
        if (
            companyId == 0 ||
            companyId > companyCount ||
            !companies[companyId].isActive
        ) {
            revert InvalidCompanyId(companyId);
        }
        _;
    }

    modifier onlyValidProject(uint256 companyId, uint256 projectId) {
        if (
            projectId == 0 ||
            projectId > projectCount ||
            projects[companyId][projectId].projectAddress == address(0)
        ) {
            revert InvalidProjectId(projectId);
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Prevents direct Ether transfers
    receive() external payable {
        revert EtherNotAccepted();
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the registry
    /// @param _chainId Chain ID
    function initialize(uint16 _chainId) external initializer {
        if (_chainId == 0 || _chainId != uint16(block.chainid))
            revert InvalidChainId(_chainId);

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        chainId = _chainId;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, ADMIN_ROLE);
        _grantRole(REGISTRY_ADMIN_ROLE, msg.sender);

        emit RegistryInitialized(_chainId);
    }

    /// @notice Sets the factory address
    /// @param _factory New factory address
    function setFactory(address _factory) external onlyRole(ADMIN_ROLE) {
        if (_factory == address(0)) revert InvalidAddress(_factory);
        factory = _factory;
    }

    /// @notice Registers a new company
    /// @param owner Company owner
    /// @param name Company name
    /// @param companyType Company type
    /// @param jurisdiction Company jurisdiction
    /// @return New company ID
    function registerCompany(
        address owner,
        string calldata name,
        CompanyType companyType,
        string calldata jurisdiction
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        _validateCompanyInput(owner, name, jurisdiction);
        if (companyIdForAddress[owner] != 0) revert AddressAlreadyOwnsCompany();

        uint256 newCompanyId = ++companyCount;
        companies[newCompanyId] = Company({
            owner: owner,
            name: name,
            companyType: companyType,
            jurisdiction: jurisdiction,
            isActive: true
        });
        companyIdForAddress[owner] = newCompanyId;

        emit CompanyRegistered(
            newCompanyId,
            owner,
            name,
            companyType,
            jurisdiction
        );
        return newCompanyId;
    }

    /// @notice Registers a new project
    /// @param companyId Company ID
    /// @param params Project parameters
    /// @return New project ID
    function registerProject(
        uint256 companyId,
        ProjectParams calldata params
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        nonReentrant
        onlyValidCompany(companyId)
        whenNotPaused
        returns (uint256)
    {
        _validateProjectInput(params);

        uint256 newProjectId = _createProject(companyId, params);
        emit ProjectRegistered(companyId, newProjectId, params.projectAddress);
        return newProjectId;
    }

    /// @notice Updates project metadata CID
    /// @param companyId Company ID
    /// @param projectId Project ID
    /// @param newCID New metadata CID
    function updateMetadataCID(
        uint256 companyId,
        uint256 projectId,
        string calldata newCID
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        whenNotPaused
    {
        if (bytes(newCID).length == 0) revert InvalidParameter("metadataCID");
        projects[companyId][projectId].metadataCID = newCID;
        emit MetadataUpdated(companyId, projectId, "metadata", newCID);
    }

    /// @notice Updates project legal metadata CID
    /// @param companyId Company ID
    /// @param projectId Project ID
    /// @param newCID New legal metadata CID
    function updateLegalMetadataCID(
        uint256 companyId,
        uint256 projectId,
        string calldata newCID
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        whenNotPaused
    {
        if (bytes(newCID).length == 0)
            revert InvalidParameter("legalMetadataCID");
        projects[companyId][projectId].legalMetadataCID = newCID;
        emit MetadataUpdated(companyId, projectId, "legalMetadata", newCID);
    }

    /// @notice Deactivates a project
    /// @param companyId Company ID
    /// @param projectId Project ID
    function deactivateProject(
        uint256 companyId,
        uint256 projectId
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        whenNotPaused
    {
        projects[companyId][projectId].isActive = false;
        emit ProjectDeactivated(companyId, projectId);
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
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Creates a new project
    /// @param companyId Company ID
    /// @param params Project parameters
    /// @return New project ID
    function _createProject(
        uint256 companyId,
        ProjectParams calldata params
    ) private returns (uint256) {
        uint256 newProjectId = ++projectCount;
        projects[companyId][newProjectId] = Project({
            projectAddress: params.projectAddress,
            escrow: params.escrow,
            orderManager: params.orderManager,
            dao: params.dao,
            name: params.name,
            symbol: params.symbol,
            metadataCID: params.metadataCID,
            assetType: params.assetType,
            legalMetadataCID: params.legalMetadataCID,
            isActive: true
        });
        companyProjectIds[companyId].push(newProjectId);
        return newProjectId;
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
                           PRIVATE PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Validates company input parameters
    /// @param owner Company owner
    /// @param name Company name
    /// @param jurisdiction Company jurisdiction
    function _validateCompanyInput(
        address owner,
        string memory name,
        string memory jurisdiction
    ) private pure {
        if (owner == address(0)) revert InvalidAddress(owner);
        if (bytes(name).length == 0 || bytes(name).length > MAX_STRING_LENGTH)
            revert InvalidParameter("name");
        if (
            bytes(jurisdiction).length == 0 ||
            bytes(jurisdiction).length > MAX_STRING_LENGTH
        ) {
            revert InvalidParameter("jurisdiction");
        }
    }

    /// @notice Validates project input parameters
    /// @param params Project parameters
    function _validateProjectInput(ProjectParams calldata params) private pure {
        if (
            bytes(params.name).length == 0 ||
            bytes(params.name).length > MAX_STRING_LENGTH
        ) {
            revert InvalidParameter("name");
        }
        if (
            bytes(params.symbol).length == 0 ||
            bytes(params.symbol).length > MAX_SYMBOL_LENGTH
        ) {
            revert InvalidParameter("symbol");
        }
        if (bytes(params.metadataCID).length == 0)
            revert InvalidParameter("metadataCID");
        if (bytes(params.legalMetadataCID).length == 0)
            revert InvalidParameter("legalMetadataCID");
        if (params.projectAddress == address(0))
            revert InvalidAddress(params.projectAddress);
        if (
            params.escrow == address(0) ||
            params.orderManager == address(0) ||
            params.dao == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL VIEW/PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Gets company details
    /// @param companyId Company ID
    /// @return owner Company owner
    /// @return name Company name
    /// @return companyType Company type
    /// @return jurisdiction Company jurisdiction
    /// @return isActive Active status
    /// @return projectIds Project IDs
    function getCompanyDetails(
        uint256 companyId
    )
        external
        view
        onlyValidCompany(companyId)
        returns (
            address owner,
            string memory name,
            CompanyType companyType,
            string memory jurisdiction,
            bool isActive,
            uint256[] memory projectIds
        )
    {
        Company storage company = companies[companyId];
        return (
            company.owner,
            company.name,
            company.companyType,
            company.jurisdiction,
            company.isActive,
            companyProjectIds[companyId]
        );
    }

    /// @notice Gets project details
    /// @param companyId Company ID
    /// @param projectId Project ID
    /// @return Project details
    function getProjectDetails(
        uint256 companyId,
        uint256 projectId
    )
        external
        view
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        returns (ProjectDetails memory)
    {
        Project storage project = projects[companyId][projectId];
        return
            ProjectDetails({
                projectAddress: project.projectAddress,
                escrow: project.escrow,
                orderManager: project.orderManager,
                dao: project.dao,
                name: project.name,
                symbol: project.symbol,
                metadataCID: project.metadataCID,
                assetType: project.assetType,
                legalMetadataCID: project.legalMetadataCID,
                isActive: project.isActive
            });
    }

    /// @notice Gets batch project details
    /// @param companyId Company ID
    /// @param startIndex Start index
    /// @param count Number of projects
    /// @return Batch project response
    function getBatchProjects(
        uint256 companyId,
        uint256 startIndex,
        uint256 count
    )
        external
        view
        onlyValidCompany(companyId)
        returns (BatchProjectResponse memory)
    {
        if (count > MAX_BATCH_SIZE) revert InvalidParameter("batch size");
        uint256[] memory projIds = companyProjectIds[companyId];
        uint256 length = count;

        if (startIndex + count > projIds.length) {
            length = projIds.length > startIndex
                ? projIds.length - startIndex
                : 0;
        }

        uint256[] memory ids = new uint256[](length);
        ProjectDetails[] memory details = new ProjectDetails[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 projId = projIds[startIndex + i];
            Project storage project = projects[companyId][projId];
            ids[i] = projId;
            details[i] = ProjectDetails({
                projectAddress: project.projectAddress,
                escrow: project.escrow,
                orderManager: project.orderManager,
                dao: project.dao,
                name: project.name,
                symbol: project.symbol,
                metadataCID: project.metadataCID,
                assetType: project.assetType,
                legalMetadataCID: project.legalMetadataCID,
                isActive: project.isActive
            });
        }

        return BatchProjectResponse({projectIds: ids, projectDetails: details});
    }

    /// @notice Gets contract version
    /// @return Contract version
    function getContractVersion() external pure returns (string memory) {
        return CONTRACT_VERSION;
    }
}
