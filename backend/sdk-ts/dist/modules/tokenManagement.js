"use strict";
/**
 * @title RyzerTokenManagement Module
 * @description TypeScript module for interacting with the RyzerTokenManagement contract
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerTokenManagement = void 0;
const ethers_1 = require("ethers");
// Import ABI
const RyzerTokenManagement_json_1 = __importDefault(require("../abis/RyzerTokenManagement.json"));
class RyzerTokenManagement {
    /**
     * Initialize the RyzerTokenManagement module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk) {
        this.sdk = sdk;
        this.provider = sdk.provider;
    }
    /**
     * Get contract instance for a specific wallet address
     * @param {string} walletAddress - Address of the wallet
     * @returns {ExtendedContract} - Contract instance
     */
    getContract(walletAddress) {
        return new ethers_1.ethers.Contract(walletAddress, RyzerTokenManagement_json_1.default, this.provider);
    }
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner() {
        return new ethers_1.ethers.Wallet(this.sdk.privateKey, this.provider);
    }
    /**
     * Deposit ETH to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {ethers.BigNumberish} amount - Amount of ETH to deposit (in wei)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async depositEth(walletAddress, amount) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        // Use the overrides object directly as the first parameter
        return contract.depositEth({ value: amount });
    }
    /**
     * Deposit ERC20 tokens to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async depositERC20(walletAddress, tokenAddress, amount) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.depositERC20(tokenAddress, amount);
    }
    /**
     * Deposit ERC721 tokens to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async depositERC721(walletAddress, tokenAddress, tokenId) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.depositERC721(tokenAddress, tokenId);
    }
    /**
     * Deposit ERC1155 tokens to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
     * @param {string} data - Additional data
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async depositERC1155(walletAddress, tokenAddress, tokenId, amount, data = '0x') {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.depositERC1155(tokenAddress, tokenId, amount, data);
    }
    /**
     * Withdraw ETH from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} amount - Amount of ETH to withdraw (in wei)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async withdrawEth(walletAddress, recipient, amount) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.withdrawEth(recipient, amount);
    }
    /**
     * Withdraw ERC20 tokens from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} amount - Amount of tokens to withdraw
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async withdrawERC20(walletAddress, tokenAddress, recipient, amount) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.withdrawERC20(tokenAddress, recipient, amount);
    }
    /**
     * Withdraw ERC721 tokens from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async withdrawERC721(walletAddress, tokenAddress, recipient, tokenId) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.withdrawERC721(tokenAddress, recipient, tokenId);
    }
    /**
     * Withdraw ERC1155 tokens from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @param {ethers.BigNumberish} amount - Amount of tokens to withdraw
     * @param {string} data - Additional data
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async withdrawERC1155(walletAddress, tokenAddress, recipient, tokenId, amount, data = '0x') {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.withdrawERC1155(tokenAddress, recipient, tokenId, amount, data);
    }
    /**
     * Approve ERC20 tokens for spending
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} spender - Spender address
     * @param {ethers.BigNumberish} amount - Amount of tokens to approve
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async approveERC20(walletAddress, tokenAddress, spender, amount) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.approveERC20(tokenAddress, spender, amount);
    }
    /**
     * Approve ERC721 tokens for spending
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} operator - Operator address
     * @param {boolean} approved - Approval status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async approveERC721(walletAddress, tokenAddress, operator, approved) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.approveERC721(tokenAddress, operator, approved);
    }
    /**
     * Approve ERC1155 tokens for spending
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} operator - Operator address
     * @param {boolean} approved - Approval status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async approveERC1155(walletAddress, tokenAddress, operator, approved) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.approveERC1155(tokenAddress, operator, approved);
    }
    /**
     * Execute a token transfer
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} to - Recipient address
     * @param {ethers.BigNumberish} value - Amount of tokens to transfer
     * @param {string} data - Additional data
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async executeTokenTransfer(walletAddress, tokenAddress, to, value, data = '0x') {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.executeTokenTransfer(tokenAddress, to, value, data);
    }
    /**
     * Get a token approval
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} spender - Spender address
     * @returns {Promise<TokenApproval>} - Token approval
     */
    async getTokenApproval(walletAddress, tokenAddress, spender) {
        const contract = this.getContract(walletAddress);
        const approval = await contract.tokenApprovals(tokenAddress, spender);
        return {
            amount: approval.allowance,
            expiry: approval.isApprovedForAll ? Number.MAX_SAFE_INTEGER : 0
        };
    }
    /**
     * Get a token allowance
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} spender - Spender address
     * @returns {Promise<TokenAllowance>} - Token allowance
     */
    async getTokenAllowance(walletAddress, tokenAddress, spender) {
        const contract = this.getContract(walletAddress);
        const allowance = await contract.getTokenAllowance(tokenAddress, spender);
        return {
            allowance: allowance.allowance,
            isApprovedForAll: allowance.isApprovedForAll
        };
    }
    /**
     * Get a token balance
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} tokenId - Token ID (for ERC721 and ERC1155)
     * @returns {Promise<TokenBalance>} - Token balance
     */
    async getTokenBalance(walletAddress, tokenAddress, tokenId) {
        const contract = this.getContract(walletAddress);
        const balance = await contract.getTokenBalance(tokenAddress, tokenId);
        return {
            balance: balance.balance,
            tokenType: balance.tokenType
        };
    }
    /**
     * Get the ETH balance of a wallet
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<ethers.BigNumber>} - ETH balance
     */
    async getEthBalance(walletAddress) {
        return this.provider.getBalance(walletAddress);
    }
    /**
     * Get all tokens owned by a wallet
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string[]>} - Array of token addresses
     */
    async getOwnedTokens(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.getOwnedTokens();
    }
    /**
     * Get all ERC721 tokens owned by a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<ethers.BigNumber[]>} - Array of token IDs
     */
    async getOwnedERC721Tokens(walletAddress, tokenAddress) {
        const contract = this.getContract(walletAddress);
        return contract.getOwnedERC721Tokens(tokenAddress);
    }
    /**
     * Get all ERC1155 tokens owned by a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<{id: ethers.BigNumber, balance: ethers.BigNumber}[]>} - Array of token IDs and balances
     */
    async getOwnedERC1155Tokens(walletAddress, tokenAddress) {
        const contract = this.getContract(walletAddress);
        const tokens = await contract.getOwnedERC1155Tokens(tokenAddress);
        return tokens.map((token) => ({
            id: token.id,
            balance: token.balance
        }));
    }
    /**
     * Check if a token is blacklisted
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<boolean>} - Whether the token is blacklisted
     */
    async isTokenBlacklisted(walletAddress, tokenAddress) {
        const contract = this.getContract(walletAddress);
        return contract.blacklistedTokens(tokenAddress);
    }
    /**
     * Add a token to the blacklist
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async blacklistToken(walletAddress, tokenAddress) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.blacklistToken(tokenAddress);
    }
    /**
     * Remove a token from the blacklist
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async unblacklistToken(walletAddress, tokenAddress) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.unblacklistToken(tokenAddress);
    }
    /**
     * Set the emergency stop status
     * @param {string} walletAddress - Address of the wallet
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setEmergencyStop(walletAddress, stopped) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setEmergencyStop(stopped);
    }
    /**
     * Get the emergency stopped status
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    async getEmergencyStopped(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.emergencyStopped();
    }
}
exports.RyzerTokenManagement = RyzerTokenManagement;
