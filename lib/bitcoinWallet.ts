/**
 * Bitcoin Wallet Integration Service
 * Supports Unisat and Xverse browser extension wallets
 */

interface BitcoinWallet {
  isInstalled: () => boolean;
  connect: () => Promise<string>;
  sendBitcoin: (toAddress: string, amount: number) => Promise<string>;
  getBalance: () => Promise<number>;
  getAddress: () => Promise<string>;
  onAccountsChanged?: (callback: (accounts: string[]) => void) => void;
}

class UnisatWallet implements BitcoinWallet {
  private unisat: any;

  constructor() {
    if (typeof window !== 'undefined') {
      this.unisat = (window as any).unisat;
    }
  }

  isInstalled(): boolean {
    return typeof this.unisat !== 'undefined';
  }

  async connect(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Unisat wallet is not installed. Please install it from https://unisat.io');
    }

    try {
      const accounts = await this.unisat.requestAccounts();
      return accounts[0];
    } catch (error: any) {
      throw new Error(`Failed to connect Unisat wallet: ${error.message}`);
    }
  }

  async sendBitcoin(toAddress: string, amount: number): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Unisat wallet is not installed');
    }

    try {
      // Convert BTC to satoshis (1 BTC = 100,000,000 satoshis)
      const satoshis = Math.floor(amount * 100000000);

      const txid = await this.unisat.sendBitcoin(toAddress, satoshis);
      return txid;
    } catch (error: any) {
      throw new Error(`Failed to send Bitcoin: ${error.message}`);
    }
  }

  async getBalance(): Promise<number> {
    if (!this.isInstalled()) {
      throw new Error('Unisat wallet is not installed');
    }

    try {
      const balance = await this.unisat.getBalance();
      // Convert satoshis to BTC
      return balance.total / 100000000;
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getAddress(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Unisat wallet is not installed');
    }

    try {
      const accounts = await this.unisat.getAccounts();
      return accounts[0];
    } catch (error: any) {
      throw new Error(`Failed to get address: ${error.message}`);
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void) {
    if (this.isInstalled() && this.unisat.on) {
      this.unisat.on('accountsChanged', callback);
    }
  }
}

class XverseWallet implements BitcoinWallet {
  private xverse: any;

  constructor() {
    if (typeof window !== 'undefined') {
      this.xverse = (window as any).XverseProviders?.BitcoinProvider;
    }
  }

  isInstalled(): boolean {
    return typeof this.xverse !== 'undefined';
  }

  async connect(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Xverse wallet is not installed. Please install it from https://www.xverse.app');
    }

    try {
      const response = await this.xverse.request('getAccounts', {});
      if (response && response.accounts && response.accounts.length > 0) {
        return response.accounts[0].address;
      }
      throw new Error('No accounts found');
    } catch (error: any) {
      throw new Error(`Failed to connect Xverse wallet: ${error.message}`);
    }
  }

  async sendBitcoin(toAddress: string, amount: number): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Xverse wallet is not installed');
    }

    try {
      // Convert BTC to satoshis
      const satoshis = Math.floor(amount * 100000000);

      const response = await this.xverse.request('sendTransfer', {
        recipients: [{
          address: toAddress,
          amount: satoshis
        }]
      });

      return response.txid;
    } catch (error: any) {
      throw new Error(`Failed to send Bitcoin: ${error.message}`);
    }
  }

  async getBalance(): Promise<number> {
    if (!this.isInstalled()) {
      throw new Error('Xverse wallet is not installed');
    }

    try {
      const response = await this.xverse.request('getBalance', {});
      // Convert satoshis to BTC
      return (response.total || 0) / 100000000;
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getAddress(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Xverse wallet is not installed');
    }

    try {
      const response = await this.xverse.request('getAccounts', {});
      if (response && response.accounts && response.accounts.length > 0) {
        return response.accounts[0].address;
      }
      throw new Error('No accounts found');
    } catch (error: any) {
      throw new Error(`Failed to get address: ${error.message}`);
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void) {
    // Xverse may not support account change events
    // This can be implemented if needed
  }
}

class BitcoinWalletService {
  private wallets: BitcoinWallet[] = [];
  private currentWallet: BitcoinWallet | null = null;
  private currentAddress: string = '';

  constructor() {
    // Initialize available wallets
    this.wallets = [
      new UnisatWallet(),
      new XverseWallet()
    ];
  }

  /**
   * Detect available Bitcoin wallets
   */
  detectWallets(): { name: string; installed: boolean; url: string }[] {
    return [
      {
        name: 'Unisat',
        installed: this.wallets[0].isInstalled(),
        url: 'https://unisat.io/download'
      },
      {
        name: 'Xverse',
        installed: this.wallets[1].isInstalled(),
        url: 'https://www.xverse.app/download'
      }
    ];
  }

  /**
   * Get the first available wallet
   */
  getAvailableWallet(): BitcoinWallet | null {
    for (const wallet of this.wallets) {
      if (wallet.isInstalled()) {
        return wallet;
      }
    }
    return null;
  }

  /**
   * Connect to available Bitcoin wallet
   */
  async connect(): Promise<{ address: string; walletName: string }> {
    const wallet = this.getAvailableWallet();

    if (!wallet) {
      throw new Error(
        'No Bitcoin wallet detected. Please install Unisat or Xverse wallet extension.\n\n' +
        'Recommended: Unisat Wallet (https://unisat.io/download)\n' +
        'Alternative: Xverse Wallet (https://www.xverse.app/download)'
      );
    }

    try {
      const address = await wallet.connect();
      this.currentWallet = wallet;
      this.currentAddress = address;

      const walletName = wallet instanceof UnisatWallet ? 'Unisat' : 'Xverse';

      return { address, walletName };
    } catch (error: any) {
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Send Bitcoin transaction
   */
  async sendBitcoin(toAddress: string, amount: number): Promise<string> {
    if (!this.currentWallet) {
      throw new Error('Please connect your Bitcoin wallet first');
    }

    try {
      const txid = await this.currentWallet.sendBitcoin(toAddress, amount);
      return txid;
    } catch (error: any) {
      throw new Error(`Failed to send Bitcoin: ${error.message}`);
    }
  }

  /**
   * Get current wallet balance
   */
  async getBalance(): Promise<number> {
    if (!this.currentWallet) {
      throw new Error('Please connect your Bitcoin wallet first');
    }

    try {
      return await this.currentWallet.getBalance();
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get current wallet address
   */
  getAddress(): string {
    return this.currentAddress;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.currentWallet !== null && this.currentAddress !== '';
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.currentWallet = null;
    this.currentAddress = '';
  }
}

// Export singleton instance
export const bitcoinWallet = new BitcoinWalletService();
export default bitcoinWallet;

