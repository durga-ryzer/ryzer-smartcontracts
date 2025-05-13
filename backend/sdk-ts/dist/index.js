"use strict";
/**
 * @title Ryzer SDK
 * @description A comprehensive TypeScript SDK for interacting with the Ryzer Wallet ecosystem
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerUtils = exports.RyzerTokenManagement = exports.RyzerRecovery = exports.RyzerPaymaster = exports.RyzerCrosschain = exports.RyzerFactory = exports.RyzerCore = exports.RyzerSDK = void 0;
const index_1 = require("./modules/index");
const RyzerUtils = __importStar(require("./utils"));
/**
 * Main Ryzer SDK class that integrates all modules
 */
class RyzerSDK {
    /**
     * Initialize the Ryzer SDK
     * @param {RyzerSDKConfig} config - Configuration object
     */
    constructor(config) {
        if (!config.provider) {
            throw new Error('Provider is required');
        }
        this.provider = config.provider;
        this.factoryAddress = config.factoryAddress;
        this.entryPointAddress = config.entryPointAddress;
        this.paymasterAddress = config.paymasterAddress;
        this._privateKey = config.privateKey;
        // Initialize modules
        this.core = new index_1.RyzerCore(this);
        this.factory = new index_1.RyzerFactory(this);
        this.crosschain = new index_1.RyzerCrosschain(this);
        this.paymaster = new index_1.RyzerPaymaster(this);
        this.recovery = new index_1.RyzerRecovery(this);
        this.tokenManagement = new index_1.RyzerTokenManagement(this);
        this.utils = RyzerUtils;
    }
    /**
     * Get the private key
     * @returns {string | undefined} - Private key
     * @throws {Error} If private key is not set
     */
    get privateKey() {
        if (!this._privateKey) {
            throw new Error('Private key not set. Use sdk.connect() to set a private key.');
        }
        return this._privateKey;
    }
    /**
     * Connect to a wallet using private key
     * @param {string} privateKey - Private key for signing transactions
     * @returns {RyzerSDK} - Returns the SDK instance for chaining
     */
    connect(privateKey) {
        this._privateKey = privateKey;
        return this;
    }
    /**
     * Get a user's wallet address
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<string>} - Wallet address
     */
    async getWalletAddress(userAddress) {
        return this.factory.getWallet(userAddress);
    }
    /**
     * Create a new wallet for a user
     * @param {CreateWalletParams} params - Wallet creation parameters
     * @returns {Promise<string>} - New wallet address
     */
    async createWallet(params) {
        return this.factory.createWallet(params);
    }
    /**
     * Sign a user operation
     * @param {UserOperation} userOp - User operation object
     * @returns {Promise<string>} - Signature
     */
    async signUserOp(userOp) {
        return this.utils.signUserOp(userOp, this.privateKey);
    }
    /**
     * Send a user operation through the entry point
     * @param {UserOperation} userOp - User operation object
     * @returns {Promise<string>} - Transaction hash
     */
    async sendUserOperation(userOp) {
        return this.core.sendUserOperation(userOp);
    }
}
exports.RyzerSDK = RyzerSDK;
// Export types
__exportStar(require("./types"), exports);
// Export modules
var core_1 = require("./modules/core");
Object.defineProperty(exports, "RyzerCore", { enumerable: true, get: function () { return core_1.RyzerCore; } });
var factory_1 = require("./modules/factory");
Object.defineProperty(exports, "RyzerFactory", { enumerable: true, get: function () { return factory_1.RyzerFactory; } });
var crosschain_1 = require("./modules/crosschain");
Object.defineProperty(exports, "RyzerCrosschain", { enumerable: true, get: function () { return crosschain_1.RyzerCrosschain; } });
var paymaster_1 = require("./modules/paymaster");
Object.defineProperty(exports, "RyzerPaymaster", { enumerable: true, get: function () { return paymaster_1.RyzerPaymaster; } });
var recovery_1 = require("./modules/recovery");
Object.defineProperty(exports, "RyzerRecovery", { enumerable: true, get: function () { return recovery_1.RyzerRecovery; } });
var tokenManagement_1 = require("./modules/tokenManagement");
Object.defineProperty(exports, "RyzerTokenManagement", { enumerable: true, get: function () { return tokenManagement_1.RyzerTokenManagement; } });
exports.RyzerUtils = __importStar(require("./utils"));
