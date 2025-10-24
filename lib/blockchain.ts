// Blockchain configuration for different networks
export const BLOCKCHAIN_CONFIG = {
  // Current network configuration
  network: 'sepolia', // 'mainnet' | 'sepolia' | 'goerli'
  
  // Explorer URLs for different networks
  explorers: {
    mainnet: 'https://etherscan.io',
    sepolia: 'https://sepolia.etherscan.io',
    goerli: 'https://goerli.etherscan.io'
  },
  
  // Get the current explorer URL
  getExplorerUrl: () => {
    return BLOCKCHAIN_CONFIG.explorers[BLOCKCHAIN_CONFIG.network as keyof typeof BLOCKCHAIN_CONFIG.explorers];
  },
  
  // Get transaction URL
  getTransactionUrl: (txHash: string) => {
    return `${BLOCKCHAIN_CONFIG.getExplorerUrl()}/tx/${txHash}`;
  },
  
  // Get address URL
  getAddressUrl: (address: string) => {
    return `${BLOCKCHAIN_CONFIG.getExplorerUrl()}/address/${address}`;
  }
};

// Helper functions
export const getTransactionUrl = (txHash: string) => BLOCKCHAIN_CONFIG.getTransactionUrl(txHash);
export const getAddressUrl = (address: string) => BLOCKCHAIN_CONFIG.getAddressUrl(address);
