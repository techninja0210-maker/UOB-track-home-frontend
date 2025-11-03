'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto, formatCompact, formatPercentage } from '@/lib/formatters';
import Image from 'next/image';
import notificationSocket from '@/lib/notificationSocket';
import NotificationCenter from '@/components/NotificationCenter';
import bitcoinWallet from '@/lib/bitcoinWallet';
import Navbar from '@/components/Navbar';
// Coming soon modal no longer used here

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface WalletBalance {
  currency: string;
  balance: number;
  symbol: string;
  valueUsd: number;
}

interface GoldHolding {
  id: string;
  amount: number;
  unit: string;
  purchasePrice: number;
  currentPrice: number;
  profit: number;
  weightGrams?: number;
  goldName?: string;
  status?: string;
  purchasePricePerGram?: number;
  totalPaid?: number;
  profitLoss?: number;
  currentValue?: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  timestamp: string;
  status: string;
}

interface SKRReceipt {
  id: string;
  amount: string;
  description: string;
  status: string;
  checked: boolean;
  profitLoss?: number;
  currentValue?: number;
}

interface CrowdfundingContract {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  start_date: string;
  contract_type: 'gold' | 'oil';
  profit_percentage: number;
  progress_percentage: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [goldHoldings, setGoldHoldings] = useState<GoldHolding[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [skrReceipts, setSkrReceipts] = useState<SKRReceipt[]>([]);
  const [crowdfundingContracts, setCrowdfundingContracts] = useState<CrowdfundingContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<{
    skrs: SKRReceipt[];
    transactions: Transaction[];
  }>({
    skrs: [],
    transactions: []
  });
  const router = useRouter();

  // MetaMask deposit state (pool model)
  const [mmConnected, setMmConnected] = useState(false);
  const [mmAddress, setMmAddress] = useState<string>('');
  const [mmNetwork, setMmNetwork] = useState<string>('');
  const [mmBalance, setMmBalance] = useState<string>('');
  const [mmChainId, setMmChainId] = useState<string>('');
  const [depositCurrency, setDepositCurrency] = useState<'BTC' | 'ETH' | 'USDT'>('ETH');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [depositError, setDepositError] = useState<string>('');
  const [depositSuccess, setDepositSuccess] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [mmTokenBalance, setMmTokenBalance] = useState<string>(''); // e.g., USDT balance
  
  // Bitcoin wallet state
  const [btcConnected, setBtcConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string>('');
  const [btcBalance, setBtcBalance] = useState<string>('');
  const [btcWalletName, setBtcWalletName] = useState<string>('');
  const [btcWallets, setBtcWallets] = useState<{name: string; installed: boolean; url: string}[]>([]);
  
  // Deposit history/status
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [showDepositHistory, setShowDepositHistory] = useState(false);
  // User's platform balances (off-chain credits)
  const [userBalances, setUserBalances] = useState<{[key: string]: number}>({
    BTC: 0,
    ETH: 0,
    USDT: 0
  });
  // Current crypto prices - initialized to zero, will be loaded from API
  const [cryptoPrices, setCryptoPrices] = useState<{[key: string]: number}>({
    BTC: 0,
    ETH: 0,
    USDT: 1
  });
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date>(new Date());
  const [isClient, setIsClient] = useState(false);
  // Fixed top-right toast (3s)
  const [topToast, setTopToast] = useState<{ text: string; type: 'warning' | 'error' | 'success' } | null>(null);
  const showTopToast = (text: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    setTopToast({ text, type });
    setTimeout(() => setTopToast(null), 3000);
  };

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    checkAuthentication();
    loadDashboardData();
  }, []);

  // Hook up socket connect notification
  useEffect(() => {
    if (!user?.id) return;
    notificationSocket.connect(String(user.id));
    const onConnect = () => {
      showTopToast('Connected to notification server', 'success');
    };
    notificationSocket.addConnectListener(onConnect);
    return () => notificationSocket.removeConnectListener(onConnect);
  }, [user?.id]);


  // Load pool address when currency changes or MetaMask connects
  useEffect(() => {
    if (mmConnected) {
      getPoolAddress();
    }
  }, [depositCurrency, mmConnected]);

  // Check for existing MetaMask connection on mount (but don't auto-connect)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      // Only check if already connected, don't auto-connect
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setMmAddress(accounts[0]);
            // Use setTimeout to avoid blocking the main thread
            setTimeout(() => {
              setupMetaMaskConnection(accounts[0]);
            }, 100);
          }
        })
        .catch((error: unknown) => {
          // Silently handle MetaMask not available
          if (error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && 
              (error.message.includes('MetaMask extension not found') ||
               error.message.includes('Failed to connect to MetaMask'))) {
            console.log('MetaMask not available - this is expected if not installed');
          }
        });
    }
  }, []);

  // Load user balances, transactions, and crypto prices when component mounts
  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
      // Load crypto prices first, then transactions (so USD calculations work)
      getCryptoPrices().then(prices => {
        setCryptoPrices(prices);
        setLastPriceUpdate(new Date());
        loadTransactions(); // Load transactions after prices are set
      });
    }
  }, [user?.id]);

  // Auto-refresh crypto prices every 30 seconds for real-time USD balance updates
  useEffect(() => {
    if (user?.id) {
      const interval = setInterval(() => {
        getCryptoPrices().then(prices => {
          setCryptoPrices(prices);
          setLastPriceUpdate(new Date());
          console.log('🔄 Real-time crypto prices updated:', prices);
        });
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const checkAuthentication = async () => {
    try {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

      const response = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');

      // Load wallet balances (legacy - keeping for compatibility)
      const walletResponse = await api.get('/api/wallet/balances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalances(walletResponse.data.balances || []);

      // Load user platform balances
      await loadUserBalances();
      
      // Load crypto prices first, then transactions (so USD calculations work)
      const prices = await getCryptoPrices();
      setCryptoPrices(prices);
      setLastPriceUpdate(new Date());
      await loadTransactions();

      // Load gold holdings (off-chain) and current gold price
      const [goldHoldingsRes, goldPriceRes] = await Promise.all([
        api.get('/api/gold-exchange/holdings', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/api/prices/gold/current')
      ]);
      const totalActiveGrams = parseFloat(goldHoldingsRes.data?.totalActiveGrams || 0);
      const goldPricePerGram = parseFloat(goldPriceRes.data?.pricePerGram || 0);
      const totalGoldUsd = totalActiveGrams * goldPricePerGram;
      // Represent total gold value as a single summarized holding for the dashboard cards
      setGoldHoldings(totalGoldUsd > 0 ? [{ 
        id: 'TOTAL', 
        amount: totalActiveGrams, 
        unit: 'g', 
        purchasePrice: 0, // Will be calculated from individual holdings if needed
        currentPrice: goldPricePerGram,
        profit: 0, // Will be calculated from individual holdings if needed
        currentValue: totalGoldUsd 
      }] : []);


      // Load SKR receipts
      const skrResponse = await api.get('/api/skrs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkrReceipts(skrResponse.data.receipts || []);

      // Load crowdfunding contracts (get first 3 ongoing and upcoming)
      try {
        // Fetch all contracts and filter on frontend (more reliable)
        const response = await api.get('/api/crowdfunding/contracts?limit=10');
        
        console.log('Crowdfunding API response:', response.data);
        
        // Handle response structure
        let allContracts = [];
        if (response.data?.success && Array.isArray(response.data?.data)) {
          allContracts = response.data.data;
        } else if (Array.isArray(response.data)) {
          allContracts = response.data;
        } else if (Array.isArray(response.data?.data)) {
          allContracts = response.data.data;
        }
        
        // Filter to get ongoing and upcoming contracts, take first 3
        const filteredContracts = allContracts
          .filter((contract: CrowdfundingContract) => 
            contract.status === 'ongoing' || contract.status === 'upcoming'
          )
          .slice(0, 3);
        
        console.log('Filtered crowdfunding contracts:', filteredContracts);
        setCrowdfundingContracts(filteredContracts);
      } catch (crowdfundingError: any) {
        console.error('Error loading crowdfunding contracts:', crowdfundingError);
        console.error('Error details:', {
          message: crowdfundingError?.message,
          response: crowdfundingError?.response?.data,
          status: crowdfundingError?.response?.status,
          url: crowdfundingError?.config?.url
        });
        setCrowdfundingContracts([]);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      if (token) {
      await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  // Bitcoin Wallet Functions
  const connectBitcoinWallet = async () => {
    setIsConnecting(true);
    setDepositError('');
    
    try {
      const result = await bitcoinWallet.connect();
      setBtcAddress(result.address);
      setBtcWalletName(result.walletName);
      setBtcConnected(true);
      
      // Get balance
      try {
        const balance = await bitcoinWallet.getBalance();
        setBtcBalance(balance.toFixed(8));
      } catch (balanceError) {
        console.error('Failed to get BTC balance:', balanceError);
      }
      
      notificationSocket.notifyLocal({
        type: 'success',
        title: `${result.walletName} connected`,
        message: `${result.address.slice(0, 6)}...${result.address.slice(-4)}`,
      });
    } catch (error: any) {
      console.error('Bitcoin wallet connection error:', error);
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Bitcoin wallet connection failed',
        message: error.message || 'Please install Unisat or Xverse wallet',
      });
      setDepositError(error.message || 'Failed to connect Bitcoin wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Load deposit history
  const loadDepositHistory = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/wallet/deposits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter by current currency
      const filtered = response.data.filter((deposit: any) => 
        deposit.currency === depositCurrency
      );
      setDepositHistory(filtered || []);
    } catch (error) {
      console.error('Error loading deposit history:', error);
      setDepositHistory([]);
    }
  };

  // Detect Bitcoin wallets on mount and when currency changes
  useEffect(() => {
    if (depositCurrency === 'BTC') {
      const wallets = bitcoinWallet.detectWallets();
      setBtcWallets(wallets);
      
      // Check if wallet is already connected
      if (bitcoinWallet.isConnected()) {
        setBtcAddress(bitcoinWallet.getAddress());
        setBtcConnected(true);
      }
      
      // Load deposit history for this currency
      loadDepositHistory();
    }
  }, [depositCurrency]);

  // Auto-refresh deposit history every 30 seconds when deposit section is visible
  useEffect(() => {
    if (depositCurrency === 'BTC' && poolAddress) {
      loadDepositHistory();
      const interval = setInterval(() => {
        loadDepositHistory();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [depositCurrency, poolAddress]);

  // MetaMask Functions
  const connectMetaMask = async () => {
    setIsConnecting(true);
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      notificationSocket.notifyLocal({
        type: 'warning',
        title: 'Please install MetaMask',
        message: 'MetaMask is required to connect your wallet.',
      });
      setIsConnecting(false);
      return;
    }

    try {
      setDepositError('');
      const provider = (window as any).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });

      if (accounts.length > 0) {
        setMmAddress(accounts[0]);
        await setupMetaMaskConnection(accounts[0]);
        notificationSocket.notifyLocal({
          type: 'success',
          title: 'Wallet connected',
          message: `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      } else {
        setMmConnected(false);
        setDepositError('No accounts found. Please unlock MetaMask and try again.');
      }
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
      
      // Handle specific MetaMask errors gracefully
      if (error.message && error.message.includes('MetaMask extension not found')) {
        notificationSocket.notifyLocal({
          type: 'warning',
          title: 'MetaMask not found',
          message: 'Please install MetaMask extension to connect your wallet.',
        });
        setIsConnecting(false);
        return;
      }
      
      let msg = typeof error?.message === 'string' ? error.message : 'Failed to connect to MetaMask';
      // Common MetaMask codes
      if (typeof error?.code === 'number') {
        if (error.code === -32002) {
          msg = 'Connection request already pending in MetaMask';
        } else if (error.code === 4001 || error.code === -4001) {
          msg = 'Connection request rejected by user';
        }
      }
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'MetaMask connection failed',
        message: msg,
      });
    }
    finally {
      setIsConnecting(false);
    }
  };

  const setupMetaMaskConnection = async (addressOverride?: string) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      console.log('MetaMask not available - skipping connection setup');
      return;
    }

    try {
      // Get network info
      const provider = (window as any).ethereum;
      const chainId = await provider.request({ method: 'eth_chainId' });
      const networkName = getNetworkName(chainId);
      setMmChainId(chainId);
      setMmNetwork(networkName);

      // Get balance
      const addressToUse = addressOverride || mmAddress || ((await provider.request({ method: 'eth_accounts' }))?.[0] || '');
      if (!addressToUse) {
        setMmConnected(false);
        return;
      }
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [addressToUse, 'latest']
      });
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
      setMmBalance(balanceInEth.toFixed(4));
      setMmConnected(true);

      // Get pool address (with error handling)
      try {
        await getPoolAddress();
      } catch (poolError) {
        console.log('Pool address not available:', poolError);
      }

      // Load ERC20 (USDT) balance if selected (with error handling)
      if (depositCurrency === 'USDT') {
        try {
          await loadUsdtBalance(addressToUse);
        } catch (usdtError) {
          console.log('USDT balance not available:', usdtError);
        }
      }

      // Set up event listeners
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);

    } catch (error: unknown) {
      console.error('Setup MetaMask connection error:', error);
      // Don't show error notifications for automatic connection attempts
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && 
          (error.message.includes('MetaMask extension not found') || 
           error.message.includes('Failed to connect to MetaMask'))) {
        console.log('MetaMask connection failed - this is expected if not available');
        return;
      }
    }
  };

  const getNetworkName = (chainId: string) => {
    switch (chainId) {
      case '0x1': return 'Ethereum Mainnet';
      case '0xaa36a7': return 'Sepolia Testnet';
      default: return 'Unknown Network';
    }
  };

  const getNetworkConfig = (networkName: string) => {
    switch (networkName) {
      case 'Ethereum Mainnet': return { chainId: '0x1', name: 'Ethereum Mainnet' };
      case 'Sepolia Testnet': return { chainId: '0xaa36a7', name: 'Sepolia Testnet' };
      default: return null;
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setMmConnected(false);
      setMmAddress('');
    } else {
      setMmAddress(accounts[0]);
      setupMetaMaskConnection(accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    setMmChainId(chainId);
    const networkName = getNetworkName(chainId);
    setMmNetwork(networkName);
    setupMetaMaskConnection();
  };

  const switchNetwork = async (targetNetwork: 'mainnet' | 'sepolia') => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;

    const networkConfig = targetNetwork === 'mainnet' 
      ? { chainId: '0x1', chainName: 'Ethereum Mainnet' }
      : { chainId: '0xaa36a7', chainName: 'Sepolia Testnet' };

    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkConfig.chainId }],
      });
      
      // Network switched successfully, refresh pool address and balance
      setPoolAddress(''); // Clear old address
      await getPoolAddress(); // Get fresh address for current currency
      
      // Refresh balance for current currency
      if (mmAddress) {
        if (depositCurrency === 'ETH') {
          const balance = await (window as any).ethereum.request({
            method: 'eth_getBalance',
            params: [mmAddress, 'latest']
          });
          const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
          setMmBalance(balanceInEth.toFixed(4));
        } else if (depositCurrency === 'USDT') {
          await loadUsdtBalance(mmAddress);
        }
      }
      
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added, add it
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: networkConfig.chainId,
              chainName: networkConfig.chainName,
              rpcUrls: targetNetwork === 'mainnet' 
                ? ['https://mainnet.infura.io/v3/'] 
                : ['https://sepolia.infura.io/v3/'],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
            }],
          });
          
          // After adding network, refresh pool address
          setPoolAddress('');
          await getPoolAddress();
          
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      } else {
        console.error('Failed to switch network:', error);
      }
    }
  };

  // Minimal USDT support (ERC20): balanceOf and transfer
  const getUsdtContractAddress = () => {
    // Mainnet USDT
    if (mmChainId === '0x1') return '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    // Sepolia placeholder (set your deployed test USDT here). If missing, return empty to disable.
    if (mmChainId === '0xaa36a7') return '';
    return '';
  };

  const loadUsdtBalance = async (holder: string) => {
    try {
      const token = getUsdtContractAddress();
      if (!token) { setMmTokenBalance(''); return; }
      
      // Check if ethereum is available
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        setMmTokenBalance('');
        return;
      }
      
      // balanceOf(address) selector: 0x70a08231
      const data = '0x70a08231' + holder.replace('0x', '').padStart(64, '0');
      const result = await (window as any).ethereum.request({
        method: 'eth_call',
        params: [{ to: token, data }, 'latest']
      });
      const raw = parseInt(result, 16);
      const human = raw / Math.pow(10, 6); // USDT decimals = 6
      setMmTokenBalance(human.toFixed(2));
    } catch (e) {
      console.log('USDT balance not available:', e);
      setMmTokenBalance('');
    }
  };

  const getPoolAddress = async () => {
    try {
      setPoolAddress(''); // Clear previous address
      const response = await api.get(`/api/wallet/pool-address/${depositCurrency}`);
      if (response.data && response.data.address) {
        setPoolAddress(response.data.address);
        setDepositError(''); // Clear any previous errors
      } else {
        setDepositError(`No pool address found for ${depositCurrency}`);
      }
    } catch (error) {
      console.error('Failed to get pool address:', error);
      setDepositError(`Failed to get ${depositCurrency} pool address`);
      setPoolAddress('');
    }
  };

  const loadUserBalances = async () => {
    try {
      const response = await api.get('/api/wallet/balances');
      if (response.data && Array.isArray(response.data)) {
        const balances: {[key: string]: number} = { BTC: 0, ETH: 0, USDT: 0 };
        response.data.forEach((balance: any) => {
          if (balance.currency && balance.balance !== undefined) {
            balances[balance.currency] = parseFloat(balance.balance) || 0;
          }
        });
        setUserBalances(balances);
      }
    } catch (error) {
      console.error('Failed to load user balances:', error);
      // Keep default zero balances on error
    }
  };

  const loadTransactions = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        const transactions: Transaction[] = response.data.map((tx: any) => {
          const cryptoAmount = parseFloat(tx.amount || 0);
          const currency = tx.currency || 'USD';
          
          // Calculate USD equivalent for crypto transactions
          let usdAmount = cryptoAmount;
          if (currency === 'BTC' && cryptoPrices.BTC) {
            usdAmount = cryptoAmount * cryptoPrices.BTC;
          } else if (currency === 'ETH' && cryptoPrices.ETH) {
            usdAmount = cryptoAmount * cryptoPrices.ETH;
          } else if (currency === 'USDT' && cryptoPrices.USDT) {
            usdAmount = cryptoAmount * cryptoPrices.USDT;
          }
          
          // Map transaction types for better display
          let displayType = tx.type || 'unknown';
          let displayAmount = usdAmount;
          let displayDescription = tx.description || tx.meta?.description || 'Transaction';
          
          // Handle different transaction types
          if (tx.type === 'withdrawal_request') {
            displayType = 'withdrawal';
            displayDescription = `Withdrawal Request: ${cryptoAmount} ${currency}`;
          } else if (tx.type === 'withdrawal_completed') {
            displayType = 'withdrawal';
            displayDescription = `Withdrawal Completed: ${cryptoAmount} ${currency}`;
          } else if (tx.type === 'withdrawal_rejected') {
            displayType = 'withdrawal';
            displayDescription = `Withdrawal Rejected: ${cryptoAmount} ${currency}`;
          } else if (tx.type === 'deposit') {
            displayType = 'deposit';
            displayDescription = `Deposit: ${cryptoAmount} ${currency}`;
          } else if (tx.type === 'buy_gold') {
            displayType = 'buy';
            displayDescription = `Gold Purchase: ${cryptoAmount} ${currency}`;
          } else if (tx.type === 'sell_gold') {
            displayType = 'sell';
            displayDescription = `Gold Sale: ${cryptoAmount} ${currency}`;
          }

          return {
            id: tx.id || tx.transactionId || `tx-${Date.now()}`,
            type: displayType,
            amount: displayAmount, // Use USD equivalent for display
            currency: 'USD', // Always display as USD in Recent Activity
            description: displayDescription,
            timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
            status: tx.status || 'completed'
          };
        });
        
        // Sort by timestamp (most recent first)
        transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentTransactions(transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setRecentTransactions([]);
    }
  };

  const downloadGoldHoldingsPDF = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/exports/gold-holdings/pdf', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Create blob from response data
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gold_holdings_report_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download gold holdings PDF');
      }
    } catch (error) {
      console.error('Error downloading gold holdings PDF:', error);
    }
  };

  const getCryptoPrices = async () => {
    try {
      const response = await api.get('/api/prices/crypto');
      if (response.data) {
        return {
          BTC: response.data.BTC || 0,
          ETH: response.data.ETH || 0,
          USDT: response.data.USDT || 1
        };
      }
    } catch (error) {
      console.error('Failed to get crypto prices:', error);
    }
    // Fallback prices - only use real price API data
    return { BTC: 0, ETH: 0, USDT: 1 };
  };

  const sendDeposit = async () => {
    if (!poolAddress || !depositAmount) {
      setDepositError('Please connect wallet/address and enter amount');
      return;
    }

    try {
      setDepositError('');
      setDepositSuccess('');

      console.log('🚀 Starting deposit process...', {
        currency: depositCurrency,
        amount: depositAmount,
        poolAddress,
        userAddress: mmAddress
      });

      // Create deposit intent
      const depositIntent = await api.post('/api/wallet/deposit-intent', {
        currency: depositCurrency,
        amount: parseFloat(depositAmount),
        userAddress: mmAddress
      });
      
      console.log('✅ Deposit intent created:', depositIntent.data);

      let txHash = '';

      if (depositCurrency === 'ETH') {
        if (!mmConnected) throw new Error('Please connect MetaMask first');
        
        console.log('💰 Sending ETH transaction...', {
          from: mmAddress,
          to: poolAddress,
          amount: depositAmount
        });
        
        const valueHex = '0x' + Math.floor(parseFloat(depositAmount) * 1e18).toString(16);
        txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: mmAddress, to: poolAddress, value: valueHex }]
        });
        
        console.log('✅ ETH transaction sent:', txHash);
        setDepositSuccess(`Transaction sent! Hash: ${txHash}`);
        setDepositError(''); // Clear any previous errors
      } else if (depositCurrency === 'USDT') {
        if (!mmConnected) throw new Error('Please connect MetaMask first');
        
        console.log('💰 Sending USDT transaction...', {
          from: mmAddress,
          to: poolAddress,
          amount: depositAmount
        });
        
        const token = getUsdtContractAddress();
        if (!token) throw new Error('USDT not available on this network');
        
        const methodId = '0xa9059cbb'; // transfer(address,uint256)
        const toPadded = poolAddress.replace('0x', '').padStart(64, '0');
        const amountHex = BigInt(Math.floor(parseFloat(depositAmount) * 1e6)).toString(16).padStart(64, '0');
        const data = methodId + toPadded + amountHex;
        
        txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: mmAddress, to: token, data }]
        });
        
        console.log('✅ USDT transaction sent:', txHash);
        setDepositSuccess(`Transaction sent! Hash: ${txHash}`);
        setDepositError(''); // Clear any previous errors
      } else if (depositCurrency === 'BTC') {
        // BTC handled by Bitcoin wallet (Unisat/Xverse) or manual address
        if (btcConnected && btcAddress) {
          // Use Bitcoin wallet to send transaction
          console.log('💰 Sending BTC transaction via wallet...', {
            from: btcAddress,
            to: poolAddress,
            amount: depositAmount
          });

          try {
            const txHash = await bitcoinWallet.sendBitcoin(poolAddress, parseFloat(depositAmount));
            console.log('✅ BTC transaction sent:', txHash);
            
            // Process the deposit to credit user balance
            try {
              const processResponse = await api.post('/api/wallet/process-deposit', {
                currency: 'BTC',
                amount: parseFloat(depositAmount),
                transactionHash: txHash,
                fromAddress: btcAddress
              });
              
              console.log('✅ Deposit processed successfully:', processResponse.data);
              setDepositSuccess(`Deposit successful! Transaction: ${txHash.slice(0, 10)}... Your balance will be updated once confirmed.`);
            } catch (processError: any) {
              console.error('❌ Error processing deposit:', processError);
              setDepositSuccess(`Transaction sent! Hash: ${txHash}. Processing may take a few minutes.`);
            }
            
            // Refresh deposit history after processing
            loadDepositHistory();
          } catch (btcError: any) {
            throw new Error(`Failed to send Bitcoin: ${btcError.message}`);
          }
        } else {
          // Manual deposit - just show address
          setDepositSuccess(`Send BTC to: ${poolAddress}`);
          // Refresh deposit history periodically for manual deposits
          loadDepositHistory();
          return; // No transaction hash for manual BTC, so no processing needed
        }
      }

      // Process the deposit to credit user balance (for ETH and USDT)
      if (txHash && (depositCurrency === 'ETH' || depositCurrency === 'USDT')) {
        console.log('🔄 Processing deposit to credit user balance...');
        
        try {
          const processResponse = await api.post('/api/wallet/process-deposit', {
            currency: depositCurrency,
            amount: parseFloat(depositAmount),
            transactionHash: txHash,
            fromAddress: mmAddress
          });
          
          console.log('✅ Deposit processed successfully:', processResponse.data);
          setDepositSuccess(`Deposit successful! Your balance has been updated. New ${depositCurrency} balance: ${processResponse.data.newBalance}`);
        } catch (processError: any) {
          console.error('❌ Error processing deposit:', processError);
          setDepositError(`Transaction sent but failed to credit balance: ${processError.response?.data?.message || processError.message}`);
        }
      }

      // Refresh platform balances and transactions after successful deposit
      await loadUserBalances();
      await loadTransactions();
      
      // Refresh MetaMask balance
      if (mmAddress) {
        if (depositCurrency === 'ETH') {
          const balance = await (window as any).ethereum.request({
            method: 'eth_getBalance',
            params: [mmAddress, 'latest']
          });
          const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
          setMmBalance(balanceInEth.toFixed(4));
        } else if (depositCurrency === 'USDT') {
          await loadUsdtBalance(mmAddress);
        }
      }

      setDepositAmount('');
    } catch (error: any) {
      console.error('❌ Send deposit error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Transaction failed';
      
      if (error.code === 4001 || error.code === -4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.code === -32002) {
        errorMessage = 'Transaction already pending, please wait';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in your wallet';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error, please check your connection';
      } else if (error.message?.includes('MetaMask')) {
        errorMessage = 'MetaMask error: ' + error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setDepositError(errorMessage);
    }
  };

  // Calculate totals using platform balances and real-time prices
  const totalCryptoValue = (userBalances.ETH * cryptoPrices.ETH) + (userBalances.USDT * cryptoPrices.USDT) + (userBalances.BTC * cryptoPrices.BTC);
  const totalGoldValue = goldHoldings.reduce((sum, holding) => sum + (holding.currentValue || 0), 0);
  const totalPortfolioValue = totalCryptoValue + totalGoldValue;
  const totalSKRProfitLoss = skrReceipts.reduce((sum, skr) => sum + (skr.profitLoss || 0), 0);
  const hasCryptoData = userBalances.ETH > 0 || userBalances.USDT > 0 || userBalances.BTC > 0;
  const hasGoldData = goldHoldings && goldHoldings.length > 0;
  const hasSkrData = skrReceipts && skrReceipts.length > 0;


  return (
    <div className="min-h-screen bg-white">
      {/* Reusable Notification Center (socket + programmatic) */}
      <NotificationCenter userId={user?.id ? String(user.id) : undefined} />

      {/* Shared Navbar Component */}
      <Navbar user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section - Minimal & Clean */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user?.fullName}</h1>
          <p className="text-lg text-gray-500">Here's an overview of your portfolio</p>
        </div>

        {/* Portfolio Overview - Improved Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Portfolio Value */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Total Portfolio</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(totalPortfolioValue)}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Live • Updated {isClient ? lastPriceUpdate.toLocaleTimeString() : '—'}
                </p>
              </div>
              <div className="h-14 w-14 bg-white/60 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* BTC Balance */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Bitcoin</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{formatCrypto(userBalances.BTC)} BTC</p>
                <p className="text-base text-gray-400">{formatCurrency(userBalances.BTC * cryptoPrices.BTC)}</p>
              </div>
              <div className="h-14 w-14 bg-orange-50 rounded-xl flex items-center justify-center">
                <span className="text-orange-600 font-bold text-2xl">₿</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Live price
            </div>
          </div>

          {/* ETH Balance */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Ethereum</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{formatCrypto(userBalances.ETH)} ETH</p>
                <p className="text-base text-gray-400">{formatCurrency(userBalances.ETH * cryptoPrices.ETH)}</p>
              </div>
              <div className="h-14 w-14 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-blue-600 font-bold text-2xl">Ξ</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Live price
            </div>
          </div>

          {/* USDT Balance */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Tether</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{formatCrypto(userBalances.USDT)} USDT</p>
                <p className="text-base text-gray-400">{formatCurrency(userBalances.USDT * cryptoPrices.USDT)}</p>
              </div>
              <div className="h-14 w-14 bg-green-50 rounded-xl flex items-center justify-center">
                <span className="text-green-600 font-bold text-2xl">₮</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Live price
            </div>
          </div>
        </div>

        {/* Additional Portfolio Cards - Cleaner Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Gold Holdings */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Gold Holdings</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(totalGoldValue)}</p>
                {!hasGoldData && (
                  <p className="text-sm text-gray-400">No holdings yet</p>
                )}
                {hasGoldData && (
                  <button
                    onClick={downloadGoldHoldingsPDF}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
              <div className="h-12 w-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                <span className="text-yellow-600 text-2xl">🥇</span>
              </div>
            </div>
          </div>

          {/* SKR Profit/Loss */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">SKR P&L</p>
                <p className={`text-2xl font-bold mb-2 ${totalSKRProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalSKRProfitLoss)}
                </p>
                {!hasSkrData && (
                  <p className="text-sm text-gray-400">No receipts yet</p>
                )}
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Crypto Value */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Total Crypto</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(totalCryptoValue)}</p>
                {!hasCryptoData && (
                  <p className="text-sm text-gray-400">No balances yet</p>
                )}
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section - Cleaner Design */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Quick Actions</h2>
                <p className="text-blue-100">Deposit, trade, and manage your assets</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="#full-deposit-section" 
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Deposit</p>
                    <p className="text-blue-100 text-sm">Add funds</p>
                  </div>
                </div>
              </a>
              <Link 
                href="/exchange" 
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Exchange</p>
                    <p className="text-blue-100 text-sm">Trade assets</p>
                  </div>
                </div>
              </Link>
              <Link 
                href="/wallet" 
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Wallet</p>
                    <p className="text-blue-100 text-sm">Manage funds</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Crowdfunding Section - Cleaner Design */}
        <div className="mb-12">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Crowdfunding Opportunities</h3>
                <p className="text-gray-500">Invest in Gold and Oil contracts with guaranteed returns</p>
              </div>
              <Link 
                href="/crowdfunding" 
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all text-sm font-semibold shadow-sm hover:shadow-md"
              >
                View All
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crowdfundingContracts.length > 0 ? (
                crowdfundingContracts.map((contract) => {
                  const progress = Math.min(100, Math.max(0, parseFloat(String(contract.progress_percentage)) || 0));
                  const targetAmount = parseFloat(String(contract.target_amount)) || 0;
                  const currentAmount = parseFloat(String(contract.current_amount)) || 0;
                  const profitPercent = parseFloat(String(contract.profit_percentage)) || 0;
                  const startDate = contract.start_date ? new Date(contract.start_date) : null;
                  
                  return (
                    <div key={contract.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{contract.contract_type === 'gold' ? '🥇' : '🛢️'}</span>
                          <span className="font-medium text-gray-900">{contract.title}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          contract.status === 'ongoing' 
                            ? 'bg-green-100 text-green-800' 
                            : contract.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status === 'ongoing' ? 'Ongoing' : 
                           contract.status === 'upcoming' ? 'Upcoming' : 
                           contract.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Target:</span>
                          <span className="font-medium">{formatCurrency(targetAmount)}</span>
                        </div>
                        {contract.status === 'ongoing' ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Raised:</span>
                              <span className="font-medium">{formatCurrency(currentAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Profit:</span>
                              <span className="font-medium text-green-600">{profitPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="text-xs text-gray-500">{progress.toFixed(1)}% funded</div>
                          </>
                        ) : (
                          <>
                            {startDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Starts:</span>
                                <span className="font-medium">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Profit:</span>
                              <span className="font-medium text-green-600">{profitPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div className="bg-gray-300 h-2 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                            <div className="text-xs text-gray-500">Starting soon</div>
                          </>
                        )}
                      </div>
                      <Link 
                        href={`/crowdfunding/contract/${contract.id}`}
                        className={`block w-full mt-3 text-center py-2 rounded-lg transition-colors text-sm ${
                          contract.status === 'ongoing'
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'bg-gray-200 text-gray-800 cursor-not-allowed'
                        }`}
                        style={contract.status === 'ongoing' ? { color: 'white' } : {}}
                      >
                        {contract.status === 'ongoing' ? 'Invest Now' : 
                         contract.status === 'upcoming' ? 'Coming Soon' : 
                         'View Details'}
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  <p>No crowdfunding opportunities available at the moment.</p>
                  <Link href="/crowdfunding" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                    View All Crowdfunding
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Deposit Section - Cleaner Design */}
        <div className="mb-12" id="full-deposit-section">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Deposit Cryptocurrency</h2>
              <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg font-medium">BTC • ETH • USDT</span>
            </div>
            <p className="text-gray-500 mt-2">Add funds to your account using MetaMask or external wallets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* MetaMask Connection - Cleaner Design */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Connect Wallet</h3>
              
              {!mmConnected ? (
                <div className="text-center">
                  <button
                    onClick={connectMetaMask}
                    className={`w-full ${isConnecting ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200`}
                    style={{ color: 'white' }}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting…' : 'Connect MetaMask'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">Connect your wallet to deposit crypto</p>

                  {/* Inline notice removed per request; using only top-right toast */}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-green-800">MetaMask Connected</span>
                      </div>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        {mmNetwork}
                      </span>
                    </div>
                    <div className="text-xs text-green-700 font-mono break-all">
                      {mmAddress}
                    </div>
                  </div>

                  {/* Pool Address - Prominently Displayed */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">Pool Deposit Address</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{depositCurrency}</span>
                        <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">{mmNetwork}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-blue-800 bg-white p-2 rounded border font-mono break-all">
                        {poolAddress ? poolAddress : 'Loading pool address...'}
                      </code>
                      <button
                        onClick={async () => {
                          if (!poolAddress) return;
                          try {
                            await navigator.clipboard.writeText(poolAddress);
                            notificationSocket.notifyLocal({
                              type: 'success',
                              title: 'Copied',
                              message: `${depositCurrency} pool address copied`,
                            });
                          } catch {}
                        }}
                        disabled={!poolAddress}
                        className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Send {depositCurrency} to this address to deposit to the platform
                      {depositCurrency === 'BTC' && ' (use external wallet)'}
                      {depositCurrency === 'ETH' && ' (via MetaMask)'}
                      {depositCurrency === 'USDT' && ' (via MetaMask)'}
                    </p>
                  </div>


                  {/* MetaMask Wallet Balance */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Your MetaMask Balance</span>
                    <span className="text-sm text-gray-600">
                      {depositCurrency === 'ETH' && formatCrypto(parseFloat(mmBalance || '0'), 'ETH')}
                      {depositCurrency === 'USDT' && (mmTokenBalance ? `${mmTokenBalance} USDT` : '—')}
                      {depositCurrency === 'BTC' && 'Use external wallet'}
                    </span>
                  </div>

                  {/* Network Switching */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => switchNetwork('mainnet')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        mmChainId === '0x1' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Mainnet
                    </button>
                    <button
                      onClick={() => switchNetwork('sepolia')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        mmChainId === '0xaa36a7' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Sepolia
                    </button>
                  </div>

                  {/* Notice for BTC */}
                  {depositCurrency === 'BTC' && (
                    <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">₿</span>
                        <h4 className="text-sm font-bold text-orange-900">Bitcoin (BTC) Deposit Selected</h4>
                      </div>
                      <p className="text-xs text-orange-700">
                        Scroll down below the deposit form to see your Bitcoin deposit address and instructions. 
                        <strong> No MetaMask connection needed for BTC!</strong>
                      </p>
                    </div>
                  )}

                  {/* Deposit Form */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <select
                          value={depositCurrency}
                          onChange={async (e) => {
                            const cur = e.target.value as 'BTC' | 'ETH' | 'USDT';
                            setDepositCurrency(cur);
                            setPoolAddress(''); // Clear old address
                            await getPoolAddress(); // Get new address
                            if (cur === 'USDT' && mmAddress) {
                              await loadUsdtBalance(mmAddress);
                            }
                            // Auto-scroll to BTC deposit instructions when BTC is selected
                            if (cur === 'BTC') {
                              setTimeout(() => {
                                const element = document.getElementById('btc-deposit-instructions');
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 300);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="ETH">ETH (Ethereum)</option>
                          <option value="USDT">USDT (ERC20)</option>
                          <option value="BTC">BTC (Bitcoin)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder={depositCurrency === 'ETH' ? '0.001' : depositCurrency === 'USDT' ? '10' : '0.001'}
                        />
                      </div>
                    </div>
                    <button
                      onClick={sendDeposit}
                      disabled={!depositAmount || !poolAddress}
                      className="w-full bg-success-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-success-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {depositCurrency === 'BTC' 
                        ? (poolAddress ? 'Get BTC Deposit Address ↓' : 'Loading BTC Address...') 
                        : `Send ${depositCurrency} to Pool`}
                    </button>
                  </div>

                  {/* BTC Deposit Instructions - Always show when BTC is selected */}
                  {depositCurrency === 'BTC' && (
                    <div className="mt-4 p-4 border-2 border-orange-400 rounded-lg bg-orange-50 shadow-md" id="btc-deposit-instructions">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-orange-900 flex items-center">
                          <span className="text-xl mr-2">₿</span>
                          Bitcoin Deposit Instructions
                        </h3>
                        {poolAddress && (
                          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">Ready</span>
                        )}
                      </div>
                      {!poolAddress ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-orange-700 mb-2">Loading Bitcoin deposit address...</p>
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        </div>
                      ) : (
                        <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white text-xs font-bold">₿</span>
                          </div>
                          <h4 className="text-sm font-semibold text-orange-900">Bitcoin Deposit</h4>
                        </div>
                        {btcConnected && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            {btcWalletName} Connected
                          </span>
                        )}
                      </div>
                      
                      {/* Bitcoin Wallet Connection - OPTIONAL */}
                      {!btcConnected ? (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-800 mb-2 font-semibold">
                            ⚠️ Browser Wallet is OPTIONAL (Not Required)
                          </p>
                          <p className="text-xs text-blue-700 mb-3">
                            You can send BTC from <strong>ANY Bitcoin wallet</strong> (mobile, desktop, hardware, exchange, etc.) 
                            by copying the address below. The browser wallet is just for convenience.
                          </p>
                          <div className="border-t border-blue-200 pt-3 mt-3">
                            <p className="text-xs text-blue-700 mb-2">
                              <strong>Optional:</strong> Connect browser wallet for easier sending
                            </p>
                            <button
                              onClick={connectBitcoinWallet}
                              disabled={isConnecting}
                              className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm mb-2"
                            >
                              {isConnecting ? 'Connecting...' : 'Connect Bitcoin Wallet (Optional)'}
                            </button>
                            <div className="text-xs text-orange-600 mt-2 space-y-1">
                              <p className="font-semibold mb-1">Browser Wallets:</p>
                              {btcWallets.map((wallet) => (
                                <div key={wallet.name} className="flex items-center justify-between">
                                  <span>{wallet.name}</span>
                                  {wallet.installed ? (
                                    <span className="text-green-600">✓ Installed</span>
                                  ) : (
                                    <a 
                                      href={wallet.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      Install
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-green-800">Wallet Connected</span>
                            <span className="text-xs text-green-600">{btcWalletName}</span>
                          </div>
                          <div className="text-xs text-green-700 font-mono break-all mb-1">
                            {btcAddress}
                          </div>
                          {btcBalance && (
                            <div className="text-xs text-green-600 mt-1">
                              Balance: {btcBalance} BTC
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* QR Code and Manual Address */}
                      <div className="flex items-start gap-4">
                        <div className="text-center">
                          <img
                            alt="BTC Deposit QR"
                            className="h-24 w-24 rounded bg-white border mx-auto"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=bitcoin:${encodeURIComponent(poolAddress)}`}
                          />
                          <p className="text-xs text-orange-600 mt-1">Scan QR Code</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-orange-700 mb-2">
                            {btcConnected 
                              ? 'Send BTC from your connected wallet or use this address (ANY Bitcoin wallet works):' 
                              : 'Send BTC to this address from ANY Bitcoin wallet (mobile, desktop, exchange, etc.):'}
                          </p>
                          <code className="block text-xs text-orange-800 bg-white p-2 rounded border font-mono break-all mb-2">
                            {poolAddress}
                          </code>
                          <button
                            onClick={async () => { 
                              try { 
                                await navigator.clipboard.writeText(poolAddress); 
                                notificationSocket.notifyLocal({ 
                                  type: 'success', 
                                  title: 'Copied', 
                                  message: 'BTC address copied to clipboard' 
                                }); 
                              } catch {} 
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                          >
                            📋 Copy Address
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        <strong>✅ Automatic Detection:</strong> The platform automatically monitors this address. 
                        Once you send BTC from ANY wallet, it will be detected and credited to your account 
                        after 1-3 confirmations (~10-30 minutes). No wallet connection needed!
                      </div>
                      
                      {/* Deposit History/Status */}
                      <div className="mt-4 border-t border-orange-200 pt-4">
                        <button
                          onClick={() => {
                            setShowDepositHistory(!showDepositHistory);
                            if (!showDepositHistory) {
                              loadDepositHistory();
                            }
                          }}
                          className="w-full flex items-center justify-between text-xs font-medium text-orange-700 hover:text-orange-800 transition-colors mb-2"
                        >
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            View Deposit Status ({depositHistory.length})
                          </span>
                          <svg 
                            className={`w-4 h-4 transition-transform ${showDepositHistory ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {showDepositHistory && (
                          <div className="mt-2 bg-white rounded-lg border border-orange-200 max-h-64 overflow-y-auto">
                            {depositHistory.length === 0 ? (
                              <div className="p-4 text-center text-xs text-gray-500">
                                No BTC deposits yet. Send BTC to the address above to see your deposit status here.
                                <Link href="/transactions" className="block mt-2 text-blue-600 hover:text-blue-800 underline">
                                  View All Transactions →
                                </Link>
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-200">
                                {depositHistory.map((deposit: any) => (
                                  <div key={deposit.id} className="p-3 hover:bg-gray-50">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="text-xs font-semibold text-gray-900">
                                            {parseFloat(deposit.amount || 0).toFixed(8)} {deposit.currency}
                                          </span>
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                            deposit.status === 'completed' 
                                              ? 'bg-green-100 text-green-800' 
                                              : deposit.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {deposit.status || 'pending'}
                                          </span>
                                        </div>
                                        {deposit.transaction_hash && (
                                          <div className="flex items-center space-x-1 mt-1">
                                            <span className="text-xs text-gray-500">TX:</span>
                                            <a
                                              href={`https://blockstream.info/tx/${deposit.transaction_hash}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-600 hover:text-blue-800 font-mono break-all"
                                            >
                                              {deposit.transaction_hash.slice(0, 16)}...
                                            </a>
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">
                                          {new Date(deposit.created_at).toLocaleString()}
                                          {deposit.completed_at && (
                                            <span className="ml-2">
                                              • Completed: {new Date(deposit.completed_at).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {depositHistory.length > 0 && (
                              <div className="p-2 border-t border-gray-200 bg-gray-50">
                                <Link 
                                  href="/transactions" 
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
                                >
                                  View All Transactions →
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Success Message Only */}
                  {depositSuccess && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-green-800 font-medium">Transaction sent!</p>
                            <p className="text-xs text-green-600 font-mono break-all">
                              Hash: {depositSuccess.replace('Transaction sent! Hash: ', '')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(depositSuccess.replace('Transaction sent! Hash: ', ''));
                            // You could add a toast notification here
                          }}
                          className="ml-2 p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                          title="Copy hash"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity - Cleaner Design */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                  <p className="text-sm text-gray-500 mt-1">Your latest transactions</p>
                </div>
                <Link href="/transactions" className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors">
                  View All →
                </Link>
              </div>
              
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        transaction.type === 'buy' || transaction.type === 'deposit' ? 'bg-green-100' : 
                        transaction.type === 'sell' || transaction.type === 'withdrawal' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-sm font-bold ${
                          transaction.type === 'buy' || transaction.type === 'deposit' ? 'text-green-600' : 
                          transaction.type === 'sell' || transaction.type === 'withdrawal' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {transaction.type === 'withdrawal' ? 'W' : transaction.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{transaction.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(transaction.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-bold mb-1 ${
                        (transaction.type === 'buy' || transaction.type === 'deposit') ? 'text-green-600' : 
                        (transaction.type === 'sell' || transaction.type === 'withdrawal') ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {(transaction.type === 'buy' || transaction.type === 'deposit') ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
                
                {recentTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">No recent transactions</p>
                    <p className="text-sm text-gray-400 mt-1">Your transactions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        
      </div>

    </div>
  );
}