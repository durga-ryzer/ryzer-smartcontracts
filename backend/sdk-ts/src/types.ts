import { ethers } from 'ethers';

/**
 * Configuration for the RyzerSDK
 */
export interface RyzerSDKConfig {
  /** Web3 provider */
  provider: ethers.providers.Provider;
  /** Address of the RyzerWalletFactory contract */
  factoryAddress: string;
  /** Address of the EntryPoint contract */
  entryPointAddress: string;
  /** Address of the RyzerPaymaster contract */
  paymasterAddress: string;
  /** Private key for signing transactions (optional) */
  privateKey?: string;
}

/**
 * Parameters for creating a wallet
 */
export interface CreateWalletParams {
  /** User's Ethereum address */
  user: string;
  /** User ID */
  userId: number;
  /** Signature threshold */
  threshold: number;
  /** List of custodian addresses */
  custodians: string[];
  /** List of broker addresses */
  brokers: string[];
}

/**
 * User operation object
 */
export interface UserOperation {
  /** Sender address */
  sender: string;
  /** Nonce */
  nonce: ethers.BigNumberish;
  /** Initialization code */
  initCode: string;
  /** Call data */
  callData: string;
  /** Call gas limit */
  callGasLimit: ethers.BigNumberish;
  /** Verification gas limit */
  verificationGasLimit: ethers.BigNumberish;
  /** Pre-verification gas */
  preVerificationGas: ethers.BigNumberish;
  /** Maximum fee per gas */
  maxFeePerGas: ethers.BigNumberish;
  /** Maximum priority fee per gas */
  maxPriorityFeePerGas: ethers.BigNumberish;
  /** Paymaster and data */
  paymasterAndData: string;
  /** Signature */
  signature: string;
}

/**
 * Parameters for creating a user operation
 */
export interface CreateUserOpParams {
  /** Sender address */
  sender: string;
  /** Nonce */
  nonce?: ethers.BigNumberish;
  /** Initialization code */
  initCode?: string;
  /** Call data */
  callData?: string;
  /** Call gas limit */
  callGasLimit?: ethers.BigNumberish;
  /** Verification gas limit */
  verificationGasLimit?: ethers.BigNumberish;
  /** Pre-verification gas */
  preVerificationGas?: ethers.BigNumberish;
  /** Maximum fee per gas */
  maxFeePerGas?: ethers.BigNumberish;
  /** Maximum priority fee per gas */
  maxPriorityFeePerGas?: ethers.BigNumberish;
  /** Paymaster and data */
  paymasterAndData?: string;
}

/**
 * Parameters for transferring ERC20 tokens
 */
export interface TransferERC20Params {
  /** Token address */
  token: string;
  /** Amount to transfer */
  amount: ethers.BigNumberish;
  /** Recipient address */
  recipient: string;
  /** Target chain ID */
  targetChainId: ethers.BigNumberish;
  /** Additional adapter parameters */
  adapterParams?: string;
}

/**
 * Parameters for transferring ERC721 tokens
 */
export interface TransferERC721Params {
  /** Token address */
  token: string;
  /** Token ID */
  tokenId: ethers.BigNumberish;
  /** Recipient address */
  recipient: string;
  /** Target chain ID */
  targetChainId: ethers.BigNumberish;
  /** Additional adapter parameters */
  adapterParams?: string;
}

/**
 * Parameters for transferring ERC1155 tokens
 */
export interface TransferERC1155Params {
  /** Token address */
  token: string;
  /** Token IDs */
  tokenIds: ethers.BigNumberish[];
  /** Amounts to transfer */
  amounts: ethers.BigNumberish[];
  /** Recipient address */
  recipient: string;
  /** Target chain ID */
  targetChainId: ethers.BigNumberish;
  /** Additional adapter parameters */
  adapterParams?: string;
}

/**
 * Parameters for estimating cross-chain fees
 */
export interface EstimateCrossChainFeeParams {
  /** Token address */
  token: string;
  /** Amount to transfer */
  amount: ethers.BigNumberish;
  /** Target chain ID */
  targetChainId: ethers.BigNumberish;
  /** Additional adapter parameters */
  adapterParams?: string;
  /** Token IDs (for ERC1155) */
  tokenIds?: ethers.BigNumberish[];
  /** Amounts (for ERC1155) */
  amounts?: ethers.BigNumberish[];
}

/**
 * Token metadata
 */
export interface TokenMetadata {
  /** Compliance level */
  complianceLevel: number;
  /** Token standard */
  tokenStandard: string;
  /** Whether the token is locked */
  isLocked: boolean;
  /** Whether the token is emergency stopped */
  isEmergencyStopped: boolean;
  /** Approval expiry timestamp */
  approvalExpiry: ethers.BigNumberish;
}

/**
 * Adapter performance metrics
 */
export interface AdapterPerformance {
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
  /** Total latency */
  totalLatency: number;
  /** Transfer count */
  transferCount: number;
}

/**
 * Multi-signer configuration
 */
export interface MultiSignerConfig {
  /** Merkle root */
  merkleRoot: string;
  /** Threshold */
  threshold: ethers.BigNumberish;
}

/**
 * Recovery status
 */
export interface RecoveryStatus {
  /** Whether recovery is initiated */
  isInitiated: boolean;
  /** Recovery timestamp */
  timestamp: number;
  /** Recovery threshold */
  recoveryThreshold: number;
  /** Social threshold */
  socialThreshold: number;
  /** Approvals count */
  approvalsCount: number;
  /** Social approvals count */
  socialApprovalsCount: number;
}

/**
 * Off-peak discount parameters
 */
export interface OffPeakDiscount {
  /** Start hour */
  start: number;
  /** End hour */
  end: number;
  /** Discount percentage (in basis points) */
  discount: number;
}

/**
 * Volume discount parameters
 */
export interface VolumeDiscount {
  /** Volume threshold */
  threshold: number;
  /** Discount percentage (in basis points) */
  discount: number;
}

/**
 * Low balance thresholds
 */
export interface LowBalanceThresholds {
  /** ETH threshold */
  ethThreshold: ethers.BigNumberish;
  /** Token threshold */
  tokenThreshold: ethers.BigNumberish;
}

/**
 * Deposit object for batch token deposit
 */
export interface TokenDeposit {
  /** Token address */
  tokenAddress: string;
  /** Amount to deposit */
  amount?: ethers.BigNumberish;
  /** Whether the token is ERC721 */
  isERC721: boolean;
  /** Token ID (for ERC721) */
  tokenId?: ethers.BigNumberish;
}

/**
 * Constants used in the SDK
 */
export interface RyzerConstants {
  /** CUSTODIAN_ROLE hash */
  CUSTODIAN_ROLE: string;
  /** BROKER_ROLE hash */
  BROKER_ROLE: string;
  /** ADMIN_ROLE hash */
  ADMIN_ROLE: string;
  /** RECOVERY_ROLE hash */
  RECOVERY_ROLE: string;
  /** DEFAULT_ADMIN_ROLE hash */
  DEFAULT_ADMIN_ROLE: string;
  /** Default role duration in seconds */
  DEFAULT_ROLE_DURATION: number;
  /** Maximum gas per operation */
  MAX_GAS_PER_OP: number;
  /** Rate limit in blocks */
  RATE_LIMIT_BLOCKS: number;
  /** Fee denominator (100%) */
  FEE_DENOMINATOR: number;
  /** Maximum fee in basis points (10%) */
  MAX_FEE_BASIS_POINTS: number;
  /** Maximum number of cross-chain adapters */
  MAX_ADAPTERS: number;
  /** Duration for which cached fees are valid (in seconds) */
  FEE_CACHE_DURATION: number;
  /** Maximum age of oracle data before considered stale (in seconds) */
  ORACLE_STALENESS_THRESHOLD: number;
  /** Minimum success rate for adapters (in percentage) */
  MIN_ADAPTER_SUCCESS_RATE: number;
}

/**
 * Recovery request information
 */
export interface RecoveryRequest {
  /** Address that initiated the recovery */
  initiator: string;
  /** Address of the new owner */
  newOwner: string;
  /** Total support weight accumulated */
  supportWeight: number;
  /** Timestamp when recovery was initiated */
  initiatedAt: number;
  /** Timestamp when recovery expires */
  expiresAt: number;
  /** Whether the recovery has been executed */
  executed: boolean;
  /** Whether the recovery has been canceled */
  canceled: boolean;
}

/**
 * Recovery proof for guardian signatures
 */
export interface RecoveryProof {
  /** ID of the recovery request */
  requestId: number;
  /** Guardian address */
  guardian: string;
  /** Guardian's signature */
  signature: string;
  /** Merkle proof (if using Merkle tree for guardians) */
  merkleProof: string[];
}

/**
 * Guardian information
 */
export interface GuardianInfo {
  /** Guardian's weight */
  weight: number;
  /** Whether the guardian is active */
  active: boolean;
}

/**
 * Token approval information
 */
export interface TokenApproval {
  /** Approved amount */
  amount: ethers.BigNumber;
  /** Expiry timestamp */
  expiry: number;
}

/**
 * Token allowance information
 */
export interface TokenAllowance {
  /** Allowance amount */
  allowance: ethers.BigNumber;
  /** Whether approved for all tokens (ERC721/ERC1155) */
  isApprovedForAll: boolean;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Token balance */
  balance: ethers.BigNumber;
  /** Token type (ERC20, ERC721, ERC1155) */
  tokenType: number;
}
