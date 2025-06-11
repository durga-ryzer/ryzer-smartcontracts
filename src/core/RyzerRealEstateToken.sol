// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IRyzerEscrow.sol";
import "./interfaces/IRyzerOrderManager.sol";

import {console} from "forge-std/console.sol";

import {RyzerProjectToken} from "./project/token/RyzerProjectToken.sol";

//import {IRyzerDAO} from "./interfaces/IRyzerDAO.sol";

/// @title RyzerRealEstateToken
/// @notice ERC-3643 compliant token for general asset tokenization with transfer restrictions, access control, and metadata management
/// @dev Uses OpenZeppelin upgradeable contracts for security, modularity, and upgradability
contract RyzerRealEstateToken is
    RyzerProjectToken,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    /*//////////////////////////////////////////////////////////////
                         ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidAddress(address addr);
    error InvalidParameter(string parameter);
    error ProjectInactive();
    error InvalidMetadataCID(bytes32 cid);
    error InvalidAssetType(bytes32 assetType);
    error TokensLocked(address user, uint48 unlockTime);
    error InvalidMetadataUpdate(uint256 updateId);
    error AlreadySigned(address signer);
    error UpdateAlreadyExecuted(uint256 updateId);

    uint256 public constant MAX_DIVIDEND_PCT = 50;
    uint256 public constant MAX_EOI_PCT = 50;
    uint256 public constant DEFAULT_LOCK_PERIOD = 365 days;

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

    struct MetadataUpdate {
        bytes32 newCID;
        bool isLegal;
        uint256 signatureCount;
        mapping(address => bool) signed;
        bool executed;
    }

    TokenConfig public tokenConfig;

    // Mappings
    mapping(address => uint48) public lockUntil;
    mapping(uint256 => MetadataUpdate) private metadataUpdates;
    uint256 public metadataUpdateCount;

    /*//////////////////////////////////////////////////////////////
                         EVENTS
    //////////////////////////////////////////////////////////////*/
    event LockPeriodSet(address indexed user, uint48 unlockTime);
    event BatchLockPeriodSet(uint256 userCount, uint48 unlockTime);
    event ProjectDeactivated(address indexed project, bytes32 reason);
    event MetadataUpdateProposed(
        uint256 indexed updateId,
        bytes32 newCID,
        bool isLegal
    );
    event MetadataUpdateSigned(
        uint256 indexed updateId,
        address indexed signer
    );
    event MetadataUpdated(
        uint256 indexed updateId,
        bytes32 oldCID,
        bytes32 newCID,
        bool isLegal
    );
    event ProjectContractsSet(
        address indexed escrow,
        address indexed orderManager,
        address indexed dao,
        uint256 preMintAmount
    );
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Proposes a metadata update
    function proposeMetadataUpdate(
        bytes32 newCID,
        bool isLegal
    ) external onlyRole(PROJECT_ADMIN_ROLE) whenNotPaused {
        if (newCID == bytes32(0)) revert InvalidMetadataCID(newCID);
        uint256 updateId = metadataUpdateCount++;
        MetadataUpdate storage update = metadataUpdates[updateId];
        update.newCID = newCID;
        update.isLegal = isLegal;
        update.signed[msg.sender] = true;
        update.signatureCount = 1;
        emit MetadataUpdateProposed(updateId, newCID, isLegal);
    }

    /// @notice Approves a metadata update
    function approveMetadataUpdate(
        uint256 updateId
    ) external onlyRole(PROJECT_ADMIN_ROLE) whenNotPaused {
        MetadataUpdate storage update = metadataUpdates[updateId];
        if (update.newCID == bytes32(0)) revert InvalidMetadataUpdate(updateId);
        if (update.executed) revert UpdateAlreadyExecuted(updateId);
        if (update.signed[msg.sender]) revert AlreadySigned(msg.sender);

        update.signed[msg.sender] = true;
        update.signatureCount++;
        emit MetadataUpdateSigned(updateId, msg.sender);

        uint256 requiredSignatures = tokenConfig.requiredSignatures;
        bytes32 legalMetadataCID = tokenConfig.legalMetadataCID;
        bytes32 metadataCID = tokenConfig.metadataCID;

        if (update.signatureCount >= requiredSignatures) {
            bytes32 oldCID = update.isLegal ? legalMetadataCID : metadataCID;
            if (update.isLegal) {
                legalMetadataCID = update.newCID;
            } else {
                metadataCID = update.newCID;
            }
            update.executed = true;
            emit MetadataUpdated(
                updateId,
                oldCID,
                update.newCID,
                update.isLegal
            );
        }
    }

    /*//////////////////////////////////////////////////////////////
                         PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the contract
    function initialize(bytes memory initData) public virtual initializer {
        TokenConfig memory params = abi.decode(initData, (TokenConfig));
        _validateInitParams(params);

        __UUPSUpgradeable_init();

        __ReentrancyGuard_init();

        super.init(
            params.identityRegistry,
            params.compliance,
            params.name,
            params.symbol,
            params.decimals,
            params.maxSupply,
            params.factory,
            params.projectOwner,
            params.onchainID
        );

        _setProjectState(params);
    }

    /// @notice Sets project-related contracts
    function setProjectContractsAndPreMint(
        address _escrow,
        address _orderManager,
        address _dao,
        uint256 _preMintAmount
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (
            _escrow == address(0) ||
            _orderManager == address(0) ||
            _dao == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
        tokenConfig.escrow = _escrow;
        tokenConfig.orderManager = _orderManager;
        tokenConfig.dao = _dao;
        if (_preMintAmount > 0) {
            super.mint(_escrow, _preMintAmount);
        }
        emit ProjectContractsSet(_escrow, _orderManager, _dao, _preMintAmount);
    }

    /// @notice Pauses the contract and related contracts
    function pause() public override onlyRole(ADMIN_ROLE) {
        _tokenPaused = true;
        address escrow = tokenConfig.escrow;
        address orderManager = tokenConfig.orderManager;
        if (escrow != address(0)) IRyzerEscrow(escrow).pause();
        if (orderManager != address(0)) {
            IRyzerOrderManager(orderManager).pause();
        }
    }

    /// @notice Unpauses the contract and related contracts
    function unpause() public override onlyRole(ADMIN_ROLE) {
        _tokenPaused = false;
        address escrow = tokenConfig.escrow;
        address orderManager = tokenConfig.orderManager;
        if (escrow != address(0)) IRyzerEscrow(escrow).unpause();
        if (orderManager != address(0)) {
            IRyzerOrderManager(orderManager).unpause();
        }
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Sets initial project state
    function _setProjectState(TokenConfig memory params) internal {
        tokenConfig.tokenPrice = params.tokenPrice;
        tokenConfig.cancelDelay = params.cancelDelay;
        tokenConfig.projectOwner = params.projectOwner;
        tokenConfig.factory = params.factory;
        tokenConfig.companyId = params.companyId;
        tokenConfig.assetId = params.assetId;
        tokenConfig.metadataCID = params.metadataCID;
        tokenConfig.legalMetadataCID = params.legalMetadataCID;
        tokenConfig.assetType = params.assetType;
        tokenConfig.dividendPct = params.dividendPct;
        tokenConfig.eoiPct = params.eoiPct;
        tokenConfig.minInvestment = params.minInvestment;
        tokenConfig.maxInvestment = params.maxInvestment;
        tokenConfig.requiredSignatures = params.requiredSignatures;
        tokenConfig.lockPeriod = params.lockPeriod;
        tokenConfig.isActive = params.isActive;
    }

    /// @notice Hook to enforce transfer restrictions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal view override {
        if (!tokenConfig.isActive) revert ProjectInactive();
        if (from != address(0) && block.timestamp < lockUntil[from]) {
            revert TokensLocked(from, lockUntil[from]);
        }
        if (to != address(0)) {
            uint256 newBalance = balanceOf(to) + amount;
            if (amount < tokenConfig.minInvestment && newBalance != 0) {
                revert InvalidParameter("amount below minInvestment");
            }
            if (
                newBalance > tokenConfig.maxInvestment &&
                to != tokenConfig.escrow
            ) {
                revert InvalidParameter("exceeds maxInvestment");
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                         PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Validates initialization parameters
    function _validateInitParams(TokenConfig memory params) private pure {
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
        if (
            params.assetType != bytes32("Commercial") &&
            params.assetType != bytes32("Residential") &&
            params.assetType != bytes32("Holiday") &&
            params.assetType != bytes32("Land")
        ) revert InvalidAssetType(params.assetType);
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorizes contract upgrades
    function _authorizeUpgrade(
        address newImplementation
    ) internal view virtual override onlyRole(ADMIN_ROLE) {
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

    /// @notice Returns the project owner
    function getProjectOwner() external view returns (address) {
        return tokenConfig.projectOwner;
    }

    /// @notice Returns the token price
    function tokenPrice() external view returns (uint256) {
        return tokenConfig.tokenPrice;
    }

    /// @notice Returns the eoi pct
    function eoiPct() external view returns (uint256) {
        return tokenConfig.eoiPct;
    }

    /// @notice Returns whether the project is active
    function getIsActive() external view returns (bool) {
        return tokenConfig.isActive;
    }

    /// @notice Returns investment limits
    function getInvestmentLimits()
        external
        view
        returns (uint256 minInvestment_, uint256 maxInvestment_)
    {
        return (tokenConfig.minInvestment, tokenConfig.maxInvestment);
    }

    /*//////////////////////////////////////////////////////////////
                         PUBLIC VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns project details
    function getProjectDetails()
        external
        view
        virtual
        returns (TokenConfig memory details)
    {
        details = TokenConfig({
            identityRegistry: address(_tokenIdentityRegistry),
            compliance: address(_tokenCompliance),
            onchainID: _tokenOnchainID,
            name: _tokenName,
            symbol: _tokenSymbol,
            decimals: _tokenDecimals,
            maxSupply: _totalSupply,
            tokenPrice: tokenConfig.tokenPrice,
            cancelDelay: tokenConfig.cancelDelay,
            projectOwner: tokenConfig.projectOwner,
            factory: tokenConfig.factory,
            escrow: tokenConfig.escrow,
            orderManager: tokenConfig.orderManager,
            dao: tokenConfig.dao,
            companyId: tokenConfig.companyId,
            assetId: tokenConfig.assetId,
            metadataCID: tokenConfig.metadataCID,
            assetType: tokenConfig.assetType,
            legalMetadataCID: tokenConfig.legalMetadataCID,
            dividendPct: tokenConfig.dividendPct,
            premintAmount: tokenConfig.premintAmount,
            minInvestment: tokenConfig.minInvestment,
            maxInvestment: tokenConfig.maxInvestment,
            eoiPct: tokenConfig.eoiPct,
            lockPeriod: tokenConfig.lockPeriod,
            requiredSignatures: tokenConfig.requiredSignatures,
            isActive: tokenConfig.isActive
        });
    }
}
