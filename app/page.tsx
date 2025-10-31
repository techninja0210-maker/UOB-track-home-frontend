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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [goldHoldings, setGoldHoldings] = useState<GoldHolding[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [skrReceipts, setSkrReceipts] = useState<SKRReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
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
  // User's platform balances (off-chain credits)
  const [userBalances, setUserBalances] = useState<{[key: string]: number}>({
    BTC: 0,
    ETH: 0,
    USDT: 0
  });
  // Current crypto prices
  const [cryptoPrices, setCryptoPrices] = useState<{[key: string]: number}>({
    BTC: 50000,
    ETH: 2000,
    USDT: 1
  });
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date>(new Date());
  // Fixed top-right toast (3s)
  const [topToast, setTopToast] = useState<{ text: string; type: 'warning' | 'error' | 'success' } | null>(null);
  const showTopToast = (text: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    setTopToast({ text, type });
    setTimeout(() => setTopToast(null), 3000);
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-profile')) {
        setShowProfileDropdown(false);
      }
    };

      document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          BTC: response.data.BTC || 50000,
          ETH: response.data.ETH || 2000,
          USDT: response.data.USDT || 1
        };
      }
    } catch (error) {
      console.error('Failed to get crypto prices:', error);
    }
    // Fallback prices
    return { BTC: 50000, ETH: 2000, USDT: 1 };
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
        // BTC handled by external wallet; just surface address
        setDepositSuccess(`Send BTC to: ${poolAddress}`);
        return; // No transaction hash for BTC, so no processing needed
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

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/UOB_logo.png"
                alt="UOB Security House"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
                priority
              />
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm font-medium text-primary-600 border-b-2 border-primary-600 pb-1">
            Dashboard
          </Link>
          <Link href="/wallet" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Wallet
          </Link>
          <Link href="/skrs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
            SKRs
          </Link>
          <Link href="/transactions" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Transactions
          </Link>
          <Link href="/exchange" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Exchange
          </Link>
          <Link href="/ai-trading" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
            AI Trading
          </Link>
            </div>

            {/* User Profile */}
            <div className="relative user-profile">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 text-sm rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {user?.fullName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">{user?.fullName}</div>
                  <div className="text-xs text-gray-500">{user?.role}</div>
                </div>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                  </div>
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500">
                      User: {user?.role}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 py-1">
                    <Link
                      href="/referrals"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Referral Program
                      </div>
                    </Link>
                    <Link
                      href="/account-settings"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-2 space-y-1">
            <Link href="/" className="block px-3 py-2 text-sm font-medium bg-primary-50 text-primary-600 rounded-lg">
              Dashboard
            </Link>
            <Link href="/wallet" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Wallet
            </Link>
            <Link href="/skrs" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              SKRs
            </Link>
            <Link href="/transactions" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Transactions
            </Link>
            <Link href="/exchange" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Exchange
            </Link>
            <Link href="/ai-trading" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              AI Trading
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user?.fullName}</h2>
          <p className="mt-2 text-gray-600">Manage your crypto and gold investments</p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Portfolio Value */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Portfolio</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPortfolioValue)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Live prices • Updated {lastPriceUpdate.toLocaleTimeString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* BTC Balance */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">BTC Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCrypto(userBalances.BTC)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(userBalances.BTC * cryptoPrices.BTC)}</p>
                <p className="text-xs text-green-600 mt-1">● Live</p>
              </div>
              <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-bold text-lg">₿</span>
              </div>
            </div>
          </div>

          {/* ETH Balance */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ETH Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCrypto(userBalances.ETH)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(userBalances.ETH * cryptoPrices.ETH)}</p>
                <p className="text-xs text-green-600 mt-1">● Live</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">Ξ</span>
              </div>
            </div>
          </div>

          {/* USDT Balance */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">USDT Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCrypto(userBalances.USDT)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(userBalances.USDT * cryptoPrices.USDT)}</p>
                <p className="text-xs text-green-600 mt-1">● Live</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">₮</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Portfolio Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Gold Holdings */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gold Holdings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGoldValue)}</p>
                {!hasGoldData && (
                  <p className="text-xs text-gray-500 mt-1">No gold holdings yet</p>
                )}
                {hasGoldData && (
                  <button
                    onClick={downloadGoldHoldingsPDF}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
              <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* SKR Profit/Loss */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SKR P&L</p>
                <p className={`text-2xl font-bold ${totalSKRProfitLoss >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                  {formatCurrency(totalSKRProfitLoss)}
                </p>
                {!hasSkrData && (
                  <p className="text-xs text-gray-500 mt-1">No SKR receipts yet</p>
                )}
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Crypto Value */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Crypto Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCryptoValue)}</p>
                {!hasCryptoData && (
                  <p className="text-xs text-gray-500 mt-1">No crypto balances yet</p>
                )}
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Crowdfunding Section */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Crowdfunding Opportunities</h3>
                <p className="text-sm text-gray-600 mt-1">Invest in Gold and Oil contracts with guaranteed returns</p>
              </div>
              <Link 
                href="/crowdfunding" 
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                style={{ color: 'white' }}
              >
                View All
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sample Gold Contract */}
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🥇</span>
                    <span className="font-medium text-gray-900">Gold Mining</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Ongoing
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">$500,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raised:</span>
                    <span className="font-medium">$125,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-medium text-green-600">1%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-primary-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500">25% funded</div>
                </div>
                <Link 
                  href="/crowdfunding" 
                  className="block w-full mt-3 bg-primary-600 text-white text-center py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  style={{ color: 'white' }}
                >
                  Invest Now
                </Link>
              </div>

              {/* Sample Oil Contract */}
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🛢️</span>
                    <span className="font-medium text-gray-900">Oil Exploration</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Ongoing
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">$1,000,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raised:</span>
                    <span className="font-medium">$750,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-medium text-green-600">1%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-primary-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500">75% funded</div>
                </div>
                <Link 
                  href="/crowdfunding" 
                  className="block w-full mt-3 bg-primary-600 text-white text-center py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  style={{ color: 'white' }}
                >
                  Invest Now
                </Link>
              </div>

              {/* Upcoming Contract */}
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🥇</span>
                    <span className="font-medium text-gray-900">Gold Reserve</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Upcoming
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">$250,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Starts:</span>
                    <span className="font-medium">Dec 1, 2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-medium text-green-600">1%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-gray-300 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500">Starting soon</div>
                </div>
                <Link 
                  href="/crowdfunding" 
                  className="block w-full mt-3 bg-gray-200 text-gray-800 text-center py-2 rounded-lg cursor-not-allowed text-sm"
                >
                  Coming Soon
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MetaMask Connection */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect Wallet</h3>
              
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
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="ETH">ETH</option>
                          <option value="USDT">USDT (ERC20)</option>
                          <option value="BTC">BTC</option>
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
                      disabled={!depositAmount}
                      className="w-full bg-success-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-success-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {depositCurrency === 'BTC' ? 'Show BTC Deposit Instructions' : `Send ${depositCurrency} to Pool`}
                    </button>
                  </div>

                  {/* BTC Deposit Instructions */}
                  {depositCurrency === 'BTC' && poolAddress && (
                    <div className="mt-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center mb-3">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">₿</span>
                        </div>
                        <h4 className="text-sm font-semibold text-orange-900">Bitcoin Deposit Instructions</h4>
                      </div>
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
                          <p className="text-xs text-orange-700 mb-2">Send BTC to this address from your external wallet:</p>
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
                      <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
                        <strong>Note:</strong> Bitcoin deposits are processed automatically once confirmed on the blockchain.
                      </div>
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

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Link href="/transactions" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View All
                </Link>
              </div>
              
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'buy' || transaction.type === 'deposit' ? 'bg-green-100' : 
                        transaction.type === 'sell' || transaction.type === 'withdrawal' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-xs font-medium ${
                          transaction.type === 'buy' || transaction.type === 'deposit' ? 'text-green-600' : 
                          transaction.type === 'sell' || transaction.type === 'withdrawal' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {transaction.type === 'withdrawal' ? 'W' : transaction.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{new Date(transaction.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        (transaction.type === 'buy' || transaction.type === 'deposit') ? 'text-green-600' : 
                        (transaction.type === 'sell' || transaction.type === 'withdrawal') ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {(transaction.type === 'buy' || transaction.type === 'deposit') ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
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
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent transactions</p>
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