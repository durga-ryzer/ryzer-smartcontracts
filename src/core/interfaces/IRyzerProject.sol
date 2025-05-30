// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRyzerProject is IERC20 {
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
        uint256 eoiPct;
    }

    // Initialization
    function initialize(bytes memory initData) external;

    // Token management
    function mint(address to, uint256 amount) external;

    // Project admin actions
    function setUsdtToken(address _usdtToken) external;
    function setProjectContracts(
        address _escrow,
        address _orderManager,
        address _dao
    ) external;
    function proposeMetadataUpdate(bytes32 newCID, bool isLegal) external;
    function approveMetadataUpdate(uint256 updateId) external;
    function pause() external;
    function unpause() external;

    // View functions
    function getProjectDetails() external view returns (ProjectDetails memory);
    function getProjectOwner() external view returns (address);
    function lockUntil(address user) external view returns (uint48);
    function owner() external view returns (address);
    function getIsActive() external view returns (bool);
    function getInvestmentLimits()
        external
        view
        returns (uint256 minInvestment, uint256 maxInvestment);
    function tokenPrice() external view returns (uint256);
    function eoiPct() external view returns (uint256);
    function dividendPct() external view returns (uint256);
}
