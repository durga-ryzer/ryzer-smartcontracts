// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

interface IRyzerRegistry {
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

    // Events
    event RegistryInitialized(uint16 chainId);
    event CompanyRegistered(
        uint256 indexed companyId, address indexed owner, string name, CompanyType companyType, string jurisdiction
    );
    event ProjectRegistered(uint256 indexed companyId, uint256 indexed projectId, address indexed projectAddress);
    event BatchProjectRegistered(uint256 indexed companyId, uint256[] projectIds);
    event ProjectDeactivated(uint256 indexed companyId, uint256 indexed projectId);
    event MetadataUpdated(uint256 indexed companyId, uint256 indexed projectId, string metadataType, string newCID);

    // External functions
    function initialize(uint16 _chainId) external;

    function setFactory(address _factory) external;

    function registerCompany(address owner, string calldata name, CompanyType companyType, string calldata jurisdiction)
        external
        returns (uint256);

    function registerProject(uint256 companyId, ProjectParams calldata params) external returns (uint256);

    function batchRegisterProject(uint256 companyId, ProjectParams[] calldata params)
        external
        returns (uint256[] memory);

    function updateMetadataCID(uint256 companyId, uint256 projectId, string calldata newCID) external;

    function updateLegalMetadataCID(uint256 companyId, uint256 projectId, string calldata newCID) external;

    function deactivateProject(uint256 companyId, uint256 projectId) external;

    function getCompanyDetails(uint256 companyId)
        external
        view
        returns (
            address owner,
            string memory name,
            CompanyType companyType,
            string memory jurisdiction,
            bool isActive,
            uint256[] memory projectIds
        );

    function getProjectDetails(uint256 companyId, uint256 projectId) external view returns (ProjectDetails memory);

    function getBatchProjects(uint256 companyId, uint256 startIndex, uint256 count)
        external
        view
        returns (BatchProjectResponse memory);

    function getContractVersion() external pure returns (string memory);

    function pause() external;
    function unpause() external;
}
