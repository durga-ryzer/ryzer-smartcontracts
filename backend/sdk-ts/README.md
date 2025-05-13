# Ryzer SDK (TypeScript)

A comprehensive TypeScript SDK for interacting with the Ryzer Wallet ecosystem.

## Overview

The Ryzer SDK provides a simple and intuitive way to interact with the Ryzer Wallet smart contracts. It includes modules for wallet creation, token management, cross-chain transfers, recovery, and more.

## Installation

```bash
npm install ryzer-sdk
```

## Usage

### Initializing the SDK

```typescript
import { ethers } from 'ethers';
import { RyzerSDK } from 'ryzer-sdk';

// Initialize the SDK with a provider
const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
const sdk = new RyzerSDK({
  provider,
  factoryAddress: '0x...',
  entryPointAddress: '0x...',
  paymasterAddress: '0x...'
});

// Connect with a private key (for signing transactions)
sdk.connect('YOUR_PRIVATE_KEY');
```

### Creating a Wallet

```typescript
// Create a new wallet for a user
const walletAddress = await sdk.createWallet({
  user: userAddress,
  userId: userId,
  threshold: threshold,
  custodians: custodianAddresses,
  brokers: brokerAddresses
});
```

### Getting a Wallet Address

```typescript
// Get a user's wallet address
const walletAddress = await sdk.getWalletAddress(userAddress);
```

### Working with Modules

The SDK is organized into modules, each corresponding to a specific contract in the Ryzer Wallet ecosystem:

#### Core Module

```typescript
// Set a delegated signer for a wallet
await sdk.core.setDelegatedSigner(walletAddress, signerAddress);

// Get the delegated signer for a user
const delegatedSigner = await sdk.core.getDelegatedSigner(walletAddress, userAddress);
```

#### Factory Module

```typescript
// Predict a wallet address before creation
const predictedAddress = await sdk.factory.predictWalletAddress(userAddress);

// Check if an address is a wallet
const isWallet = await sdk.factory.isWallet(address);
```

#### Crosschain Module

```typescript
// Transfer ERC20 tokens across chains
await sdk.crosschain.transferERC20(walletAddress, {
  token: tokenAddress,
  amount: ethers.utils.parseEther('1.0'),
  recipient: recipientAddress,
  targetChainId: 137 // Polygon
});

// Estimate cross-chain transfer fee
const fee = await sdk.crosschain.estimateCrossChainFee(walletAddress, {
  token: tokenAddress,
  amount: ethers.utils.parseEther('1.0'),
  targetChainId: 137
});
```

#### Paymaster Module

```typescript
// Deposit ETH to cover gas costs for a user
await sdk.paymaster.depositEth(userAddress, ethers.utils.parseEther('0.1'));

// Get a user's ETH balance
const balance = await sdk.paymaster.getEthBalance(userAddress);
```

#### Recovery Module

```typescript
// Add a guardian to a wallet
await sdk.recovery.addGuardian(walletAddress, guardianAddress, weight);

// Initiate a recovery request
await sdk.recovery.initiateRecovery(walletAddress, newOwnerAddress);
```

#### Token Management Module

```typescript
// Deposit ERC20 tokens to a wallet
await sdk.tokenManagement.depositERC20(walletAddress, tokenAddress, amount);

// Withdraw ETH from a wallet
await sdk.tokenManagement.withdrawEth(walletAddress, recipientAddress, amount);
```

### Utility Functions

The SDK also includes various utility functions:

```typescript
// Create a user operation
const userOp = sdk.utils.createUserOp({
  sender: walletAddress,
  callData: callData
});

// Sign a user operation
const signature = sdk.utils.signUserOp(userOp, privateKey);

// Create a Merkle root from a list of addresses
const merkleRoot = sdk.utils.createMerkleRoot(addresses);
```

## Modules

The SDK consists of the following modules:

- **Core**: Interacts with the `RyzerWalletCore` contract
- **Factory**: Manages wallet creation and interactions with the `RyzerWalletFactory` contract
- **Crosschain**: Handles cross-chain token transfers via the `RyzerCrosschain` contract
- **Paymaster**: Manages gas sponsorship and fee handling through the `RyzerPaymaster` contract
- **Recovery**: Facilitates wallet recovery using the `RyzerWalletRecovery` contract
- **TokenManagement**: Manages token deposits and withdrawals via the `RyzerTokenManagement` contract

## License

MIT
