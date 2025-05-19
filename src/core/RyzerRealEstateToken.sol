// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./RyzerProject.sol";

/// @title ForcedTransferLib
/// @notice Library for handling multi-signature forced transfers
library ForcedTransferLib {
    // Events
    event ForceTransferSigned(
        bytes32 indexed transferId,
        address indexed signer,
        address from,
        address to,
        uint256 amount,
        uint16 chainId
    );
    event ForceTransferred(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint16 chainId
    );

    // Errors
    error InsufficientBalance(address account, uint256 balance);
    error InvalidAddress(address addr);
    error InvalidParameter(string parameter);
    error AlreadySigned(address signer);

    /// @notice Signs and processes a forced transfer
    /// @param signatures Mapping of transfer IDs to signer signatures
    /// @param signatureCount Mapping of transfer IDs to signature counts
    /// @param from Source address
    /// @param to Destination address
    /// @param amount Amount to transfer
    /// @param reason Reason for forced transfer
    /// @param chainId Network chain ID
    /// @param requiredSignatures Required number of signatures
    /// @param token ERC-20 token contract
    function signForceTransfer(
        mapping(bytes32 => mapping(address => bool)) storage signatures,
        mapping(bytes32 => uint256) storage signatureCount,
        address from,
        address to,
        uint256 amount,
        bytes32 reason,
        uint16 chainId,
        uint256 requiredSignatures,
        IERC20 token
    ) internal {
        if (from == address(0) || to == address(0)) {
            revert InvalidAddress(address(0));
        }
        if (amount == 0) revert InvalidParameter("amount");
        if (token.balanceOf(from) < amount) {
            revert InsufficientBalance(from, token.balanceOf(from));
        }

        bytes32 transferId = keccak256(
            abi.encode(from, to, amount, reason, block.timestamp)
        );
        if (signatures[transferId][msg.sender]) {
            revert AlreadySigned(msg.sender);
        }

        signatures[transferId][msg.sender] = true;
        signatureCount[transferId]++;

        emit ForceTransferSigned(
            transferId,
            msg.sender,
            from,
            to,
            amount,
            chainId
        );

        if (signatureCount[transferId] >= requiredSignatures) {
            token.transfer(to, amount);
            emit ForceTransferred(from, to, amount, chainId);
            delete signatureCount[transferId];
        }
    }
}

/// @title RyzerRealEstateToken
/// @notice ERC-20 token for tokenized real estate assets, extending RyzerProject
/// @dev Inherits from RyzerProject with real estate-specific features like forced transfers and batch minting/burning
contract RyzerRealEstateToken is RyzerProject {
    /*//////////////////////////////////////////////////////////////
                        ERRORS
    //////////////////////////////////////////////////////////////*/
    error ExceedsMaxSupply(uint256 totalSupply, uint256 maxSupply);

    /*//////////////////////////////////////////////////////////////
                         TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    struct TokenDetails {
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 maxSupply;
        uint256 tokenPrice;
        bytes32 assetType;
        uint16 chainId;
        string version;
        uint256 cancelDelay;
        uint256 dividendPct;
        uint256 minInvestment;
        uint256 maxInvestment;
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
        bool isActive;
        uint256 eoiPct;
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // Role identifiers
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Constants
    uint256 public constant MIN_SIGNATURES = 2;
    string public constant VERSION = "1.0.0";

    // Mappings for forced transfers
    mapping(bytes32 => mapping(address => bool)) public forceTransferSignatures;
    mapping(bytes32 => uint256) public forceTransferSignatureCount;

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    event TokensMinted(
        address[] indexed to,
        uint256 totalAmount,
        uint16 chainId
    );
    event TokensBurned(
        address[] indexed from,
        uint256 totalAmount,
        uint16 chainId
    );
    event MaxSupplySet(uint256 maxSupply, uint16 chainId);
    event AssetTypeSet(bytes32 assetType, uint16 chainId);
    event TokenPriceSet(uint256 newTokenPrice, uint16 chainId);

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the token
    /// @param params Project initialization parameters
    function initialize(ProjectInitParams memory params) external initializer {
        super.initialize(abi.encode(params));

        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
        _grantRole(BURNER_ROLE, params.projectOwner);
    }

    /// @notice Mints tokens to multiple addresses
    /// @param to Array of recipient addresses
    /// @param amounts Array of amounts to mint
    function batchMint(
        address[] calldata to,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to.length != amounts.length || to.length == 0) {
            revert InvalidParameter("array length mismatch or empty");
        }
        uint256 totalAmount;
        for (uint256 i = 0; i < to.length; i++) {
            if (to[i] == address(0)) revert InvalidAddress(to[i]);
            if (amounts[i] == 0) revert InvalidParameter("amount");
            totalAmount += amounts[i];
        }
        if (totalSupply() + totalAmount > maxInvestment) {
            revert ExceedsMaxSupply(totalSupply() + totalAmount, maxInvestment);
        }
        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], amounts[i]);
        }
        emit TokensMinted(to, totalAmount, chainId);
    }

    /// @notice Burns tokens from multiple addresses
    /// @param from Array of source addresses
    /// @param amounts Array of amounts to burn
    function batchBurn(
        address[] calldata from,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) whenNotPaused {
        if (from.length != amounts.length || from.length == 0) {
            revert InvalidParameter("array length mismatch or empty");
        }
        uint256 totalAmount;
        for (uint256 i = 0; i < from.length; i++) {
            if (from[i] == address(0)) revert InvalidAddress(from[i]);
            if (amounts[i] == 0) revert InvalidParameter("amount");
            if (balanceOf(from[i]) < amounts[i]) {
                revert ForcedTransferLib.InsufficientBalance(
                    from[i],
                    balanceOf(from[i])
                );
            }
            totalAmount += amounts[i];
        }
        for (uint256 i = 0; i < from.length; i++) {
            _burn(from[i], amounts[i]);
        }
        emit TokensBurned(from, totalAmount, chainId);
    }

    /// @notice Signs a forced transfer request
    /// @param from Source address
    /// @param to Destination address
    /// @param amount Amount to transfer
    /// @param reason Reason for forced transfer
    function signForceTransfer(
        address from,
        address to,
        uint256 amount,
        bytes32 reason
    ) external nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
        ForcedTransferLib.signForceTransfer(
            forceTransferSignatures,
            forceTransferSignatureCount,
            from,
            to,
            amount,
            reason,
            chainId,
            requiredSignatures,
            IERC20(address(this))
        );
    }

    /// @notice Updates the maximum token supply
    /// @param newMaxSupply New maximum supply
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(ADMIN_ROLE) {
        if (newMaxSupply < totalSupply() || newMaxSupply == 0) {
            revert InvalidParameter("maxSupply");
        }
        maxInvestment = newMaxSupply * TOKEN_DECIMALS;
        emit MaxSupplySet(maxInvestment, chainId);
    }

    /// @notice Updates the token price
    /// @param newTokenPrice New token price
    function setTokenPrice(
        uint256 newTokenPrice
    ) external onlyRole(ADMIN_ROLE) {
        if (newTokenPrice == 0) revert InvalidParameter("tokenPrice");
        tokenPrice = newTokenPrice;
        emit TokenPriceSet(newTokenPrice, chainId);
    }

    /// @notice Updates the asset type
    /// @param newAssetType New asset type
    function setAssetType(bytes32 newAssetType) external onlyRole(ADMIN_ROLE) {
        if (
            newAssetType != bytes32("Commercial") &&
            newAssetType != bytes32("Residential") &&
            newAssetType != bytes32("Holiday") &&
            newAssetType != bytes32("Land")
        ) revert InvalidAssetType(newAssetType);
        assetType = newAssetType;
        emit AssetTypeSet(newAssetType, chainId);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Hook to enforce transfer restrictions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Retrieves token details
    /// @return TokenDetails struct containing token information
    function getTokenDetails() external view returns (TokenDetails memory) {
        ProjectDetails memory projectDetails = getProjectDetails();
        return
            TokenDetails({
                name: projectDetails.name,
                symbol: projectDetails.symbol,
                totalSupply: totalSupply(),
                maxSupply: projectDetails.maxInvestment,
                tokenPrice: projectDetails.tokenPrice,
                assetType: projectDetails.assetType,
                chainId: projectDetails.chainId,
                version: VERSION,
                cancelDelay: projectDetails.cancelDelay,
                dividendPct: projectDetails.dividendPct,
                minInvestment: projectDetails.minInvestment,
                maxInvestment: projectDetails.maxInvestment,
                metadataCID: projectDetails.metadataCID,
                legalMetadataCID: projectDetails.legalMetadataCID,
                companyId: projectDetails.companyId,
                assetId: projectDetails.assetId,
                projectOwner: projectDetails.projectOwner,
                factoryOwner: projectDetails.factoryOwner,
                escrow: projectDetails.escrow,
                orderManager: projectDetails.orderManager,
                dao: projectDetails.dao,
                owner: projectDetails.owner,
                isActive: projectDetails.isActive,
                eoiPct: projectDetails.eoiPct
            });
    }
}
