// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.29;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
// import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
// import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
// import "./RyzerWalletCore.sol";
// import "./RyzerWalletInterfaces.sol";
// import "./RyzerWalletLibraries.sol";

// /// @title RyzerCrossChain - Cross-chain token transfer contract
// /// @notice Facilitates secure cross-chain transfers of ERC20, ERC721, and ERC1155 tokens using CCIP
// /// @dev Inherits from RyzerWalletCore, uses SafeERC20 and Chainlink CCIP
// contract RyzerCrossChain is RyzerWalletCore {
//     using SafeERC20 for IERC20;
//     using BitmapSet for BitmapSet.Set;

//     // --- State Variables ---

//     /// @notice Tracks supported tokens using a bitmap set
//     BitmapSet.Set internal supportedTokens;

//     /// @notice Blacklisted tokens that cannot be transferred
//     mapping(address => bool) internal blacklistedTokens;

//     /// @notice Metadata for each token (standard, compliance level, token address)
//     mapping(address => TokenMetadata) internal tokenMetadata;

//     /// @notice User balances for ERC20 tokens
//     mapping(address => mapping(address => uint256)) internal userTokenBalances;

//     /// @notice Maps token addresses and token IDs to their owners for ERC721
//     mapping(address => mapping(uint256 => address)) internal tokenToIdToUser;

//     /// @notice User balances for ERC1155 tokens
//     mapping(address => mapping(address => mapping(uint256 => uint256)))
//         internal userERC1155Balances;

//     /// @notice History of cross-chain transactions
//     PackedTransactionLog.Log[] internal transactionHistory;

//     /// @notice Chainlink CCIP router address
//     address public ccipRouter;

//     /// @notice List of oracle aggregators for fee estimation
//     address[] public oracleAggregators;

//     /// @notice Recipient address for wallet fees
//     address public feeRecipient;

//     /// @notice Fee percentage for wallet transfers (in basis points)
//     uint64 public feePercentage;

//     /// @notice Cross-chain adapter configurations
//     mapping(address => AdapterInfo) public crossChainAdapters;

//     /// @notice Performance metrics for adapters
//     mapping(address => AdapterPerformance) public adapterPerformance;

//     /// @notice List of active adapter addresses
//     address[] public adapterList;

//     /// @notice Cached cross-chain fees by chain ID and token
//     mapping(uint256 => mapping(address => uint256)) public cachedCrossChainFees;

//     /// @notice Expiry timestamps for cached fees
//     mapping(uint256 => mapping(address => uint64)) public feeCacheExpiries;

//     // --- Constants ---

//     /// @notice Denominator for fee calculations (100%)
//     uint256 public constant FEE_DENOMINATOR = 10000;

//     /// @notice Maximum fee in basis points (10%)
//     uint256 public constant MAX_FEE_BASIS_POINTS = 1000;

//     /// @notice Maximum number of cross-chain adapters
//     uint256 public constant MAX_ADAPTERS = 10;

//     /// @notice Duration for which cached fees are valid
//     uint256 public constant FEE_CACHE_DURATION = 1 hours;

//     /// @notice Maximum age of oracle data before considered stale
//     uint256 public constant ORACLE_STALENESS_THRESHOLD = 30 minutes;

//     /// @notice Maximum priority value for adapters
//     uint32 public constant MAX_PRIORITY = type(uint32).max;

//     /// @notice Minimum success rate for adapters (in percentage)
//     uint256 public constant MIN_ADAPTER_SUCCESS_RATE = 80;

//     // --- Events ---

//     /// @notice Emitted when a cross-chain fee is cached
//     /// @param chainId Target chain ID
//     /// @param token Token address
//     /// @param fee Cached fee amount
//     event CrossChainFeeCached(
//         uint256 indexed chainId,
//         address indexed token,
//         uint256 fee
//     );

//     /// @notice Emitted when a new cross-chain adapter is added
//     /// @param adapter Adapter address
//     /// @param priority Adapter priority
//     event CrossChainAdapterAdded(address indexed adapter, uint32 priority);

//     /// @notice Emitted when a cross-chain adapter is removed
//     /// @param adapter Adapter address
//     event CrossChainAdapterRemoved(address indexed adapter);

//     /// @notice Emitted when an adapter's priority is updated
//     /// @param adapter Adapter address
//     /// @param priority New priority
//     event CrossChainAdapterPriorityUpdated(
//         address indexed adapter,
//         uint32 priority
//     );

//     /// @notice Emitted when adapter performance is updated
//     /// @param adapter Adapter address
//     /// @param success Whether the transfer succeeded
//     /// @param latency Transfer latency in seconds
//     event AdapterPerformanceUpdated(
//         address indexed adapter,
//         bool success,
//         uint256 latency
//     );

//     /// @notice Emitted when an oracle aggregator is used
//     /// @param aggregator Oracle aggregator address
//     event OracleAggregatorUsed(address indexed aggregator);

//     /// @notice Emitted when the fee recipient is updated
//     /// @param newFeeRecipient New fee recipient address
//     event FeeRecipientUpdated(address indexed newFeeRecipient);

//     /// @notice Emitted when the fee percentage is updated
//     /// @param newFeePercentage New fee percentage (in basis points)
//     event FeePercentageUpdated(uint64 newFeePercentage);

//     /// @notice Emitted when a cross-chain transfer fails
//     /// @param txHash Transaction hash
//     /// @param reason Failure reason
//     event TransferFailed(bytes32 indexed txHash, string reason);

//     // --- Errors ---

//     /// @notice Thrown when no valid cross-chain adapter is available
//     error CrossChainAdapterFailed();

//     /// @notice Thrown when oracle data cannot be retrieved
//     error OracleFailed();

//     /// @notice Thrown when oracle data is too old
//     error StaleOracleData();

//     /// @notice Thrown when oracle returns an invalid price
//     error InvalidOraclePrice();

//     /// @notice Thrown when an adapter's success rate is too low
//     error UnhealthyAdapter();

//     /// @notice Thrown when a transfer fails
//     error TransferFailedError();

//     /// @notice Thrown when an invalid address is provided
//     error InvalidAddress();

//     /// @notice Thrown when an invalid fee recipient is provided
//     error InvalidFeeRecipient();

//     /// @notice Thrown when the fee percentage is too high
//     error FeeTooHigh();

//     /// @notice Thrown when array lengths do not match
//     error ArrayLengthMismatch();

//     /// @notice Thrown when too many adapters are provided
//     error TooManyAdapters();

//     /// @notice Thrown when an invalid or existing adapter is provided
//     error InvalidAdapter();

//     /// @notice Thrown when the adapter priority is too high
//     error PriorityTooHigh();

//     /// @notice Thrown when an adapter is not found
//     error AdapterNotFound();

//     /// @notice Thrown when the user is not registered
//     error UserNotRegistered();

//     /// @notice Thrown when the token is not supported
//     error UnsupportedToken();

//     /// @notice Thrown when the token is blacklisted
//     error TokenBlacklisted();

//     /// @notice Thrown when the transfer amount is invalid
//     error InvalidAmount();

//     /// @notice Thrown when too many tokens are provided
//     error TooManyTokens();

//     /// @notice Thrown when recipient KYC is required
//     error RecipientKycRequired();

//     /// @notice Thrown when advanced KYC is required for the recipient
//     error RecipientAdvancedKycRequired();

//     /// @notice Thrown when the recipient is not compliant
//     error RecipientNotCompliant();

//     /// @notice Thrown when the amount is insufficient to cover fees
//     error InsufficientAmountForFee();

//     /// @notice Thrown when the user has insufficient balance
//     error InsufficientBalance();

//     /// @notice Thrown when the token ID count is invalid for ERC721
//     error InvalidTokenIdCount();

//     /// @notice Thrown when the user is not the token owner
//     error NotTokenOwner();

//     // --- Structs ---

//     /// @notice Parameters for initializing cross-chain functionality
//     struct CrossChainParams {
//         address[] crossChainAdapters;
//         uint32[] adapterPriorities;
//         address[] oracleAggregators;
//         address feeRecipient;
//         uint64 feePercentage;
//     }

//     /// @notice Parameters for initiating a cross-chain transfer
//     struct TransferParams {
//         address user;
//         address token;
//         uint256 amount;
//         address recipient;
//         uint256 targetChainId;
//         bytes params;
//         uint256[] tokenIds;
//         uint256[] amounts;
//     }

//     /// @notice Selected adapter and its fee
//     struct AdapterSelection {
//         address adapter;
//         uint256 fee;
//         uint32 priority;
//     }

//     // --- Modifiers ---

//     /// @notice Ensures the contract is not in emergency stop mode
//     modifier notEmergencyStopped() override {
//         if (emergencyStopped) revert EmergencyStopped();
//         _;
//     }

//     // --- Functions ---

//     /// @notice Sets the emergency stop state
//     /// @param stopped True to enable emergency stop, false to disable
//     function setEmergencyStop(
//         bool stopped
//     ) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
//         emergencyStopped = stopped;
//         if (stopped) {
//             _pause();
//         } else {
//             _unpause();
//         }
//         emit EmergencyStop(stopped);
//     }

//     /// @notice Initializes the cross-chain wallet
//     /// @param initialUser Initial user address
//     /// @param userId User ID
//     /// @param threshold Approval threshold
//     /// @param custodians List of custodian addresses
//     /// @param brokers List of broker addresses
//     /// @param entryPoint Entry point address
//     /// @param paymaster Paymaster address
//     /// @param timelock Timelock address
//     /// @param ccipRouterAddress Chainlink CCIP router address
//     /// @param params Cross-chain parameters
//     function initializeCrossChain(
//         address initialUser,
//         uint64 userId,
//         uint64 threshold,
//         address[] calldata custodians,
//         address[] calldata brokers,
//         address entryPoint,
//         address paymaster,
//         address payable timelock,
//         address ccipRouterAddress,
//         CrossChainParams memory params
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) initializer {
//         RyzerWalletCore.initialize(
//             RyzerWalletCore.InitParams({
//                 initialUser: initialUser,
//                 userId: userId,
//                 threshold: threshold,
//                 custodians: custodians,
//                 brokers: brokers,
//                 entryPoint: entryPoint,
//                 paymaster: paymaster,
//                 timelock: timelock
//             })
//         );

//         if (
//             ccipRouterAddress == address(0) ||
//             params.oracleAggregators.length == 0
//         ) {
//             revert InvalidAddress();
//         }
//         if (params.feeRecipient == address(0)) {
//             revert InvalidFeeRecipient();
//         }
//         if (params.feePercentage > MAX_FEE_BASIS_POINTS) {
//             revert FeeTooHigh();
//         }
//         if (
//             params.crossChainAdapters.length != params.adapterPriorities.length
//         ) {
//             revert ArrayLengthMismatch();
//         }
//         if (params.crossChainAdapters.length > MAX_ADAPTERS) {
//             revert TooManyAdapters();
//         }

//         ccipRouter = ccipRouterAddress;
//         oracleAggregators = params.oracleAggregators;
//         feeRecipient = params.feeRecipient;
//         feePercentage = params.feePercentage;

//         for (uint256 i = 0; i < params.crossChainAdapters.length; i++) {
//             address adapterAddress = params.crossChainAdapters[i];
//             uint32 priority = params.adapterPriorities[i];
//             if (adapterAddress == address(0)) {
//                 revert InvalidAdapter();
//             }
//             if (priority > MAX_PRIORITY) {
//                 revert PriorityTooHigh();
//             }
//             crossChainAdapters[adapterAddress] = AdapterInfo(
//                 adapterAddress,
//                 priority
//             );
//             adapterList.push(adapterAddress);
//             emit CrossChainAdapterAdded(adapterAddress, priority);
//         }
//     }

//     /// @notice Adds a new cross-chain adapter
//     /// @param adapterAddress Adapter address
//     /// @param priority Adapter priority
//     function addCrossChainAdapter(
//         address adapterAddress,
//         uint32 priority
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant notEmergencyStopped {
//         if (
//             adapterAddress == address(0) ||
//             crossChainAdapters[adapterAddress].adapter != address(0)
//         ) {
//             revert InvalidAdapter();
//         }
//         if (adapterList.length >= MAX_ADAPTERS) {
//             revert TooManyAdapters();
//         }
//         if (priority > MAX_PRIORITY) {
//             revert PriorityTooHigh();
//         }
//         crossChainAdapters[adapterAddress] = AdapterInfo(
//             adapterAddress,
//             priority
//         );
//         adapterList.push(adapterAddress);
//         emit CrossChainAdapterAdded(adapterAddress, priority);
//     }

//     /// @notice Removes a cross-chain adapter
//     /// @param adapterAddress Adapter address to remove
//     function removeCrossChainAdapter(
//         address adapterAddress
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant notEmergencyStopped {
//         if (crossChainAdapters[adapterAddress].adapter == address(0)) {
//             revert AdapterNotFound();
//         }
//         delete crossChainAdapters[adapterAddress];
//         delete adapterPerformance[adapterAddress];
//         for (uint256 i = 0; i < adapterList.length; i++) {
//             if (adapterList[i] == adapterAddress) {
//                 adapterList[i] = adapterList[adapterList.length - 1];
//                 adapterList.pop();
//                 break;
//             }
//         }
//         emit CrossChainAdapterRemoved(adapterAddress);
//     }

//     /// @notice Updates an adapter's priority
//     /// @param adapterAddress Adapter address
//     /// @param priority New priority
//     function updateAdapterPriority(
//         address adapterAddress,
//         uint32 priority
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant notEmergencyStopped {
//         if (crossChainAdapters[adapterAddress].adapter == address(0)) {
//             revert AdapterNotFound();
//         }
//         if (priority > MAX_PRIORITY) {
//             revert PriorityTooHigh();
//         }
//         crossChainAdapters[adapterAddress].priority = priority;
//         emit CrossChainAdapterPriorityUpdated(adapterAddress, priority);
//     }

//     /// @notice Updates an adapter's performance metrics
//     /// @param adapterAddress Adapter address
//     /// @param success Whether the transfer succeeded
//     /// @param latency Transfer latency in seconds
//     function updateAdapterPerformance(
//         address adapterAddress,
//         bool success,
//         uint256 latency
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant notEmergencyStopped {
//         if (crossChainAdapters[adapterAddress].adapter == address(0)) {
//             revert AdapterNotFound();
//         }
//         AdapterPerformance storage perf = adapterPerformance[adapterAddress];
//         if (success) {
//             perf.successCount++;
//         } else {
//             perf.failureCount++;
//         }
//         perf.transferCount++;
//         perf.totalLatency += uint128(latency);
//         emit AdapterPerformanceUpdated(adapterAddress, success, latency);

//         uint256 successRate = (perf.successCount * 100) /
//             (perf.successCount + perf.failureCount);
//         uint256 avgLatency = perf.transferCount > 0
//             ? perf.totalLatency / perf.transferCount
//             : 0;
//         uint32 newPriority = crossChainAdapters[adapterAddress].priority;
//         if (successRate >= 95 && avgLatency < 30) {
//             newPriority = newPriority < MAX_PRIORITY - 10
//                 ? newPriority + 10
//                 : MAX_PRIORITY;
//         } else if (successRate < MIN_ADAPTER_SUCCESS_RATE || avgLatency > 60) {
//             newPriority = newPriority > 10 ? newPriority - 10 : 1;
//         }
//         if (newPriority != crossChainAdapters[adapterAddress].priority) {
//             crossChainAdapters[adapterAddress].priority = newPriority;
//             emit CrossChainAdapterPriorityUpdated(adapterAddress, newPriority);
//         }
//     }

//     /// @notice Initiates a cross-chain token transfer
//     /// @param transferParams Transfer parameters
//     function initiateCrossChainTransfer(
//         TransferParams memory transferParams
//     )
//         external
//         onlyRole(CUSTODIAN_ROLE)
//         nonReentrant
//         whenNotPaused
//         notBlacklisted(transferParams.user)
//         notBlacklisted(transferParams.recipient)
//         rateLimited(transferParams.user)
//         notEmergencyStopped
//     {
//         if (userAddressToId[transferParams.user] == 0) {
//             revert UserNotRegistered();
//         }
//         if (!supportedTokens.contains(transferParams.token)) {
//             revert UnsupportedToken();
//         }
//         if (blacklistedTokens[transferParams.token]) {
//             revert TokenBlacklisted();
//         }
//         if (transferParams.amount == 0 && transferParams.tokenIds.length == 0) {
//             revert InvalidAmount();
//         }
//         if (transferParams.tokenIds.length != transferParams.amounts.length) {
//             revert ArrayLengthMismatch();
//         }
//         if (transferParams.tokenIds.length > 100) {
//             revert TooManyTokens();
//         }

//         TokenMetadata memory metadata = tokenMetadata[transferParams.token];
//         _validateRecipientCompliance(transferParams.recipient, metadata);
//         _checkTokenBalances(transferParams, metadata);

//         (
//             uint256 crossChainFee,
//             uint256 walletFee,
//             uint256 amountAfterWalletFee
//         ) = _calculateFees(
//                 transferParams.token,
//                 transferParams.amount,
//                 transferParams.targetChainId
//             );
//         (address selectedAdapter, ) = _selectCrossChainAdapter(transferParams);

//         bool success;
//         bytes32 txHash;
//         uint256 startTime = block.timestamp;

//         _handleTokenApprovals(
//             transferParams,
//             metadata,
//             walletFee,
//             amountAfterWalletFee,
//             selectedAdapter
//         );
//         (success, txHash) = _executeCcipTransfer(
//             transferParams,
//             amountAfterWalletFee,
//             selectedAdapter
//         );

//         if (!success) {
//             _revertTokenBalances(transferParams, metadata);
//             revert TransferFailedError();
//         }

//         PackedTransactionLog.addLog(
//             transactionHistory,
//             PackedTransactionLog.LogParams({
//                 txHash: txHash,
//                 sender: transferParams.user,
//                 recipient: transferParams.recipient,
//                 token: transferParams.token,
//                 amount: uint128(amountAfterWalletFee),
//                 timestamp: uint128(block.timestamp),
//                 success: success,
//                 sourceChainId: uint32(block.chainid),
//                 targetChainId: uint32(transferParams.targetChainId),
//                 fee: uint128(walletFee + crossChainFee)
//             })
//         );

//         uint256 latency = block.timestamp - startTime;
//         adapterPerformance[selectedAdapter].transferCount++;
//         adapterPerformance[selectedAdapter].successCount += success ? 1 : 0;
//         adapterPerformance[selectedAdapter].failureCount += success ? 0 : 1;
//         adapterPerformance[selectedAdapter].totalLatency += uint128(latency);
//         emit AdapterPerformanceUpdated(selectedAdapter, success, latency);
//     }

//     /// @notice Validates recipient compliance based on token metadata
//     /// @param recipient Recipient address
//     /// @param metadata Token metadata
//     function _validateRecipientCompliance(
//         address recipient,
//         TokenMetadata memory metadata
//     ) internal view {
//         if (metadata.complianceLevel >= 1) {
//             if (
//                 !hasRole(CUSTODIAN_ROLE, recipient) &&
//                 !hasRole(BROKER_ROLE, recipient)
//             ) {
//                 revert RecipientKycRequired();
//             }
//         }
//         if (metadata.complianceLevel == 2) {
//             if (!hasRole(CUSTODIAN_ROLE, recipient)) {
//                 revert RecipientAdvancedKycRequired();
//             }
//         }
//         if (metadata.tokenStandard == type(IERC3643).interfaceId) {
//             if (!IERC3643(metadata.token).isCompliant(recipient)) {
//                 revert RecipientNotCompliant();
//             }
//         }
//     }

//     /// @notice Reverts token balances if a transfer fails
//     /// @param transferParams Transfer parameters
//     /// @param metadata Token metadata
//     function _revertTokenBalances(
//         TransferParams memory transferParams,
//         TokenMetadata memory metadata
//     ) internal {
//         if (
//             metadata.tokenStandard == type(IERC20).interfaceId ||
//             metadata.tokenStandard == type(IERC3643).interfaceId
//         ) {
//             userTokenBalances[transferParams.user][
//                 transferParams.token
//             ] += transferParams.amount;
//         } else if (metadata.tokenStandard == type(IERC721).interfaceId) {
//             tokenToIdToUser[transferParams.token][
//                 transferParams.tokenIds[0]
//             ] = transferParams.user;
//         } else {
//             for (uint256 i = 0; i < transferParams.tokenIds.length; i++) {
//                 userERC1155Balances[transferParams.user][transferParams.token][
//                     transferParams.tokenIds[i]
//                 ] += transferParams.amounts[i];
//             }
//         }
//     }

//     /// @notice Executes the CCIP transfer
//     /// @param transferParams Transfer parameters
//     /// @param amountAfterWalletFee Amount after deducting wallet fee
//     /// @param selectedAdapter Selected adapter address
//     /// @return success Whether the transfer succeeded
//     /// @return txHash Transaction hash
//     function _executeCcipTransfer(
//         TransferParams memory transferParams,
//         uint256 amountAfterWalletFee,
//         address selectedAdapter
//     ) internal returns (bool success, bytes32 txHash) {
//         Client.EVM2AnyMessage memory message = _constructCcipMessage(
//             transferParams,
//             amountAfterWalletFee
//         );
//         try
//             IRouterClient(selectedAdapter).ccipSend(
//                 uint64(transferParams.targetChainId),
//                 message
//             )
//         returns (bytes32 _txHash) {
//             txHash = _txHash;
//             success = txHash != bytes32(0);
//         } catch Error(string memory reason) {
//             emit TransferFailed(txHash, reason);
//         } catch {
//             emit TransferFailed(txHash, "Unknown error");
//         }
//     }

//     /// @notice Constructs the CCIP message for transfer
//     /// @param transferParams Transfer parameters
//     /// @param amountAfterWalletFee Amount after deducting wallet fee
//     /// @return Client.EVM2AnyMessage CCIP message
//     function _constructCcipMessage(
//         TransferParams memory transferParams,
//         uint256 amountAfterWalletFee
//     ) internal pure returns (Client.EVM2AnyMessage memory) {
//         return
//             Client.EVM2AnyMessage({
//                 receiver: abi.encode(transferParams.recipient),
//                 data: abi.encode(
//                     transferParams.token,
//                     amountAfterWalletFee,
//                     transferParams.tokenIds,
//                     transferParams.amounts,
//                     transferParams.params
//                 ),
//                 tokenAmounts: new Client.EVMTokenAmount[](0),
//                 extraArgs: "",
//                 feeToken: address(0)
//             });
//     }

//     /// @notice Handles token approvals and fee transfers
//     /// @param transferParams Transfer parameters
//     /// @param metadata Token metadata
//     /// @param walletFee Wallet fee amount
//     /// @param amountAfterWalletFee Amount after deducting wallet fee
//     /// @param selectedAdapter Selected adapter address
//     function _handleTokenApprovals(
//         TransferParams memory transferParams,
//         TokenMetadata memory metadata,
//         uint256 walletFee,
//         uint256 amountAfterWalletFee,
//         address selectedAdapter
//     ) internal {
//         address token = transferParams.token;
//         if (
//             metadata.tokenStandard == type(IERC20).interfaceId ||
//             metadata.tokenStandard == type(IERC3643).interfaceId
//         ) {
//             if (walletFee > 0) {
//                 IERC20(token).safeTransfer(feeRecipient, walletFee);
//             }
//             IERC20(token).approve(selectedAdapter, amountAfterWalletFee);
//         } else if (metadata.tokenStandard == type(IERC721).interfaceId) {
//             IERC721(token).approve(selectedAdapter, transferParams.tokenIds[0]);
//         } else {
//             IERC1155(token).setApprovalForAll(selectedAdapter, true);
//         }
//     }

//     /// @notice Calculates fees for a cross-chain transfer
//     /// @param token Token address
//     /// @param amount Transfer amount
//     /// @param targetChainId Target chain ID
//     /// @return crossChainFee Cross-chain fee
//     /// @return walletFee Wallet fee
//     /// @return amountAfterWalletFee Amount after deducting wallet fee
//     function _calculateFees(
//         address token,
//         uint256 amount,
//         uint256 targetChainId
//     )
//         internal
//         returns (
//             uint256 crossChainFee,
//             uint256 walletFee,
//             uint256 amountAfterWalletFee
//         )
//     {
//         crossChainFee = cachedCrossChainFees[targetChainId][token];
//         if (
//             crossChainFee == 0 ||
//             block.timestamp > feeCacheExpiries[targetChainId][token]
//         ) {
//             crossChainFee = estimateCrossChainFee(token, amount, targetChainId);
//             cachedCrossChainFees[targetChainId][token] = crossChainFee;
//             feeCacheExpiries[targetChainId][token] = uint64(
//                 block.timestamp + FEE_CACHE_DURATION
//             );
//             emit CrossChainFeeCached(targetChainId, token, crossChainFee);
//         }

//         walletFee = (amount * feePercentage) / FEE_DENOMINATOR;
//         if (amount < walletFee) {
//             revert InsufficientAmountForFee();
//         }
//         amountAfterWalletFee = amount - walletFee;
//     }

//     /// @notice Checks token balances before transfer
//     /// @param transferParams Transfer parameters
//     /// @param metadata Token metadata
//     function _checkTokenBalances(
//         TransferParams memory transferParams,
//         TokenMetadata memory metadata
//     ) internal {
//         if (
//             metadata.tokenStandard == type(IERC20).interfaceId ||
//             metadata.tokenStandard == type(IERC3643).interfaceId
//         ) {
//             if (
//                 userTokenBalances[transferParams.user][transferParams.token] <
//                 transferParams.amount
//             ) {
//                 revert InsufficientBalance();
//             }
//             userTokenBalances[transferParams.user][
//                 transferParams.token
//             ] -= transferParams.amount;
//         } else if (metadata.tokenStandard == type(IERC721).interfaceId) {
//             if (transferParams.tokenIds.length != 1) {
//                 revert InvalidTokenIdCount();
//             }
//             if (
//                 tokenToIdToUser[transferParams.token][
//                     transferParams.tokenIds[0]
//                 ] != transferParams.user
//             ) {
//                 revert NotTokenOwner();
//             }
//             tokenToIdToUser[transferParams.token][
//                 transferParams.tokenIds[0]
//             ] = address(0);
//         } else {
//             for (uint256 i = 0; i < transferParams.tokenIds.length; i++) {
//                 if (
//                     userERC1155Balances[transferParams.user][
//                         transferParams.token
//                     ][transferParams.tokenIds[i]] < transferParams.amounts[i]
//                 ) {
//                     revert InsufficientBalance();
//                 }
//                 userERC1155Balances[transferParams.user][transferParams.token][
//                     transferParams.tokenIds[i]
//                 ] -= transferParams.amounts[i];
//             }
//         }
//     }

//     /// @notice Selects the best cross-chain adapter
//     /// @param transferParams Transfer parameters
//     /// @return selectedAdapter Selected adapter address
//     /// @return selectedFee Estimated fee for the adapter
//     function _selectCrossChainAdapter(
//         TransferParams memory transferParams
//     ) internal view returns (address selectedAdapter, uint256 selectedFee) {
//         AdapterSelection memory selection = AdapterSelection(
//             address(0),
//             type(uint256).max,
//             0
//         );

//         if (
//             IRouterClient(ccipRouter).isChainSupported(
//                 uint64(transferParams.targetChainId)
//             )
//         ) {
//             uint256 fee = IRouterClient(ccipRouter).getFee(
//                 uint64(transferParams.targetChainId),
//                 Client.EVM2AnyMessage({
//                     receiver: abi.encode(address(0)),
//                     data: abi.encode(
//                         transferParams.token,
//                         transferParams.amount,
//                         new uint256[](0),
//                         new uint256[](0),
//                         transferParams.params
//                     ),
//                     tokenAmounts: new Client.EVMTokenAmount[](0),
//                     extraArgs: "",
//                     feeToken: address(0)
//                 })
//             );
//             fee += (fee * tx.gasprice) / 1e18;
//             selection = AdapterSelection(ccipRouter, fee, MAX_PRIORITY);
//         }

//         for (uint256 i = 0; i < adapterList.length; i++) {
//             address adapterAddress = adapterList[i];
//             AdapterInfo memory info = crossChainAdapters[adapterAddress];
//             AdapterPerformance memory perf = adapterPerformance[adapterAddress];
//             uint256 successRate = perf.transferCount > 0
//                 ? (perf.successCount * 100) / perf.transferCount
//                 : 100;
//             if (successRate < MIN_ADAPTER_SUCCESS_RATE) {
//                 revert UnhealthyAdapter();
//             }
//             if (
//                 info.adapter != address(0) &&
//                 ICrossChainAdapter(adapterAddress).isChainSupported(
//                     uint64(transferParams.targetChainId)
//                 )
//             ) {
//                 uint256 fee = ICrossChainAdapter(adapterAddress).estimateFees(
//                     transferParams.token,
//                     transferParams.amount,
//                     transferParams.targetChainId,
//                     transferParams.params,
//                     transferParams.tokenIds,
//                     transferParams.amounts
//                 );
//                 fee += (fee * tx.gasprice) / 1e18;
//                 if (
//                     selection.adapter == address(0) ||
//                     (info.priority > selection.priority) ||
//                     (info.priority == selection.priority && fee < selection.fee)
//                 ) {
//                     selection = AdapterSelection(
//                         adapterAddress,
//                         fee,
//                         info.priority
//                     );
//                 }
//             }
//         }

//         if (selection.adapter == address(0)) {
//             revert CrossChainAdapterFailed();
//         }
//         return (selection.adapter, selection.fee);
//     }

//     /// @notice Estimates the cross-chain transfer fee
//     /// @param token Token address
//     /// @param amount Transfer amount
//     /// @param targetChainId Target chain ID
//     /// @return Estimated fee
//     function estimateCrossChainFee(
//         address token,
//         uint256 amount,
//         uint256 targetChainId
//     ) internal returns (uint256) {
//         int256 price;
//         uint256 latestUpdate;
//         for (uint256 i = 0; i < oracleAggregators.length; i++) {
//             try
//                 IOracleAggregator(oracleAggregators[i]).latestRoundData()
//             returns (
//                 uint80,
//                 int256 _price,
//                 uint256,
//                 uint256 updatedAt,
//                 uint80
//             ) {
//                 if (
//                     _price > 0 &&
//                     block.timestamp <= updatedAt + ORACLE_STALENESS_THRESHOLD
//                 ) {
//                     price = _price;
//                     latestUpdate = updatedAt;
//                     emit OracleAggregatorUsed(oracleAggregators[i]);
//                     break;
//                 }
//             } catch {}
//         }
//         if (price == 0) {
//             revert OracleFailed();
//         }
//         if (block.timestamp > latestUpdate + ORACLE_STALENESS_THRESHOLD) {
//             revert StaleOracleData();
//         }
//         if (price < 0) {
//             revert InvalidOraclePrice();
//         }

//         (, uint256 baseFee) = _selectCrossChainAdapter(
//             TransferParams({
//                 user: address(0),
//                 token: token,
//                 amount: amount,
//                 recipient: address(0),
//                 targetChainId: targetChainId,
//                 params: "",
//                 tokenIds: new uint256[](0),
//                 amounts: new uint256[](0)
//             })
//         );
//         return baseFee + (uint256(price) * amount) / 1e18;
//     }

//     /// @notice Sets the fee recipient address
//     /// @param newFeeRecipient New fee recipient address
//     function setFeeRecipient(
//         address newFeeRecipient
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant notEmergencyStopped {
//         if (newFeeRecipient == address(0)) {
//             revert InvalidAddress();
//         }
//         feeRecipient = newFeeRecipient;
//         emit FeeRecipientUpdated(newFeeRecipient);
//     }

//     /// @notice Sets the fee percentage
//     /// @param newFeePercentage New fee percentage (in basis points)
//     function setFeePercentage(
//         uint64 newFeePercentage
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant notEmergencyStopped {
//         if (newFeePercentage > MAX_FEE_BASIS_POINTS) {
//             revert FeeTooHigh();
//         }
//         feePercentage = newFeePercentage;
//         emit FeePercentageUpdated(newFeePercentage);
//     }

//     /// @notice Gets the list of cross-chain adapters
//     /// @return List of adapter addresses
//     function getCrossChainAdapters() external view returns (address[] memory) {
//         return adapterList;
//     }

//     /// @notice Gets information about a cross-chain adapter
//     /// @param adapterAddress Adapter address
//     /// @return adapterInfo Adapter information
//     /// @return adapterPerf Adapter performance metrics
//     function getAdapterInfo(
//         address adapterAddress
//     )
//         external
//         view
//         returns (
//             AdapterInfo memory adapterInfo,
//             AdapterPerformance memory adapterPerf
//         )
//     {
//         return (
//             crossChainAdapters[adapterAddress],
//             adapterPerformance[adapterAddress]
//         );
//     }
// }
