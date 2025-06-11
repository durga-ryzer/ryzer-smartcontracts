// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IToken} from "../project/token/IToken.sol";

interface IRyzerRealEstateToken is IToken {
    struct TokenConfig {
        address identityRegistry;
        address compliance;
        address onchainID;
        string name;
        string symbol;
        uint8 decimals;
        uint256 maxSupply;
        uint256 tokenPrice;
        uint256 cancelDelay;
        address projectOwner;
        address factory;
        address escrow;
        address orderManager;
        address dao;
        bytes32 companyId;
        bytes32 assetId;
        bytes32 metadataCID;
        bytes32 assetType;
        bytes32 legalMetadataCID;
        uint256 dividendPct;
        uint256 premintAmount;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 eoiPct;
        uint256 lockPeriod;
        uint8 requiredSignatures;
        bool isActive;
    }

    // Initialization
    function initialize(bytes memory initData) external;

    // Project admin actions
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
    function getProjectDetails() external view returns (TokenConfig memory);
    function getProjectOwner() external view returns (address);
    function getIsActive() external view returns (bool);
    function getInvestmentLimits()
        external
        view
        returns (uint256 minInvestment, uint256 maxInvestment);
    function tokenPrice() external view returns (uint256);
    function eoiPct() external view returns (uint256);
}
