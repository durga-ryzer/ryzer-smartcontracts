// Network configuration
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
  pimlicoApiKey?: string;
  entryPoint?: string;
}

// Supported networks
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  '1': {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETH_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    chainId: 1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://etherscan.io',
    pimlicoApiKey: process.env.PIMLICO_API_KEY_MAINNET,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  '137': {
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
    chainId: 137,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrl: 'https://polygonscan.com',
    pimlicoApiKey: process.env.PIMLICO_API_KEY_POLYGON,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  '56': {
    name: 'Binance Smart Chain',
    rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org',
    chainId: 56,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorerUrl: 'https://bscscan.com',
    pimlicoApiKey: process.env.PIMLICO_API_KEY_BSC,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  '11155111': {
    name: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/your-api-key',
    chainId: 11155111,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    pimlicoApiKey: process.env.PIMLICO_API_KEY_SEPOLIA,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
};

// Get network by chain ID
export const getNetworkByChainId = (chainId: number): NetworkConfig | undefined => {
  return SUPPORTED_NETWORKS[chainId.toString()];
};

// Get all supported chain IDs
export const getSupportedChainIds = (): number[] => {
  return Object.keys(SUPPORTED_NETWORKS).map(Number);
};
