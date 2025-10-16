'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import Cookies from 'js-cookie';

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
  const [loading, setLoading] = useState(true);
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
  const [depositCurrency, setDepositCurrency] = useState<'ETH'>('ETH');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [depositError, setDepositError] = useState<string>('');
  const [depositSuccess, setDepositSuccess] = useState<string>('');

  useEffect(() => {
    checkAuthentication();
    loadDashboardData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-profile')) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Filter data based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData({
        skrs: skrReceipts,
        transactions: recentTransactions
      });
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredData({
        skrs: skrReceipts.filter(receipt => 
          receipt.description.toLowerCase().includes(query) ||
          receipt.amount.toLowerCase().includes(query)
        ),
        transactions: recentTransactions.filter(transaction =>
          transaction.description.toLowerCase().includes(query) ||
          transaction.type.toLowerCase().includes(query) ||
          transaction.currency.toLowerCase().includes(query)
        )
      });
    }
  }, [searchQuery, skrReceipts, recentTransactions]);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data.user;
      
      // Redirect admin users to admin panel
      if (userData.role === 'admin') {
        router.push('/admin');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      // Load wallet balances
      const walletResponse = await api.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalances(walletResponse.data.balances || []);

      // Load gold holdings from gold-exchange API
      const goldResponse = await api.get('/api/gold-exchange/holdings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const holdings = goldResponse.data?.holdings || [];
      
      // Get current gold price for profit calculation
      const goldPriceRes = await api.get('/api/prices/gold/current');
      const currentGoldPrice = goldPriceRes.data?.pricePerGram || 0;
      
      // Transform gold holdings with current values
      const transformedHoldings = holdings.map((holding: any) => ({
        id: holding.id,
        weightGrams: holding.weight_grams,
        purchasePricePerGram: holding.purchase_price_per_gram,
        totalPaid: holding.total_value_usd || (holding.weight_grams * holding.purchase_price_per_gram),
        currentValue: holding.weight_grams * currentGoldPrice,
        profitLoss: (holding.weight_grams * currentGoldPrice) - (holding.total_value_usd || 0),
        status: holding.status,
        goldName: `Gold ${holding.weight_grams?.toFixed(4)}g`
      }));
      
      // Transform to SKR receipts format
      const skrReceipts = transformedHoldings.map((holding: any, index: number) => ({
        id: holding.id || index.toString(),
        amount: `${holding.weightGrams?.toFixed(4)} g @ $${holding.purchasePricePerGram?.toFixed(2)}/g`,
        description: holding.goldName || `Gold Holding ${index + 1}`,
        status: holding.status === 'active' ? 'active' : holding.status,
        checked: false,
        profitLoss: holding.profitLoss || 0,
        currentValue: holding.currentValue || 0
      }));
      
      setSkrReceipts(skrReceipts);
      setGoldHoldings(transformedHoldings);

      // Load recent transactions
      const transactionsResponse = await api.get('/api/wallet/transactions?limit=5');
      setRecentTransactions(transactionsResponse.data || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set fallback mock data if API fails
      setWalletBalances([
        { currency: 'BTC', balance: 0.001234, symbol: '₿', valueUsd: 45.67 },
        { currency: 'USDT', balance: 1250.50, symbol: '₮', valueUsd: 1250.50 },
        { currency: 'ETH', balance: 0.056789, symbol: 'Ξ', valueUsd: 123.45 }
      ]);
      
      setSkrReceipts([
        { id: '1', amount: '$002 $2420', description: 'Craygeritic Fartssing Traver Front.', status: 'active', checked: true, profitLoss: 125.50, currentValue: 2545.50 },
        { id: '2', amount: '$002 $2590', description: 'Tretionerlic Entiquing Serec Ttione', status: 'active', checked: true, profitLoss: 89.25, currentValue: 2679.25 },
        { id: '3', amount: '$DB $4/50', description: 'Convareriic Derlagjing Frieec Mone', status: 'pending', checked: false, profitLoss: -15.75, currentValue: 434.25 }
      ]);
      
      setRecentTransactions([
        { id: '1', type: 'deposit', amount: 1000, currency: 'USDT', description: 'USDT Deposit', timestamp: new Date().toISOString(), status: 'completed' },
        { id: '2', type: 'gold_purchase', amount: 0.5, currency: 'BTC', description: 'Gold Purchase', timestamp: new Date().toISOString(), status: 'completed' },
        { id: '3', type: 'withdrawal', amount: 500, currency: 'USDT', description: 'USDT Withdrawal', timestamp: new Date().toISOString(), status: 'pending' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pool address for selected currency
  const fetchPoolAddress = async (currency: 'ETH') => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found for pool address fetch');
        setPoolAddress('');
        return;
      }
      
      const res = await api.get(`/api/wallet/pool-address/${currency}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPoolAddress(res.data?.address || '');
    } catch (e: any) {
      console.error('Failed to fetch pool address:', e);
      // Set a fallback address for testing (this should be replaced with real pool address)
      if (currency === 'ETH') {
        setPoolAddress('0xB23D6c589961170fcD4Ae3A7d2291603dC469552'); // Fallback for testing
      } else {
        setPoolAddress('');
      }
    }
  };

  useEffect(() => {
    fetchPoolAddress(depositCurrency);
  }, [depositCurrency]);

  // Connect MetaMask
  const connectMetaMask = async () => {
    try {
      setDepositError('');
      setDepositSuccess('');
      
      // @ts-ignore
      const { ethereum } = window as any;
      if (!ethereum) {
        setDepositError('MetaMask not found. Please install MetaMask browser extension.');
        return;
      }

      // Check if MetaMask is locked
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        // Request account access
        const newAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (newAccounts && newAccounts.length > 0) {
          setMmConnected(true);
          setMmAddress(newAccounts[0]);
          setDepositSuccess('MetaMask connected successfully!');
        } else {
          setDepositError('Please unlock MetaMask and try again.');
        }
      } else {
        // Already connected
        setMmConnected(true);
        setMmAddress(accounts[0]);
        setDepositSuccess('MetaMask already connected!');
      }
    } catch (e: any) {
      console.error('MetaMask connection error:', e);
      if (e.code === 4001) {
        setDepositError('MetaMask connection was rejected. Please try again.');
      } else if (e.code === -32002) {
        setDepositError('MetaMask connection request is already pending. Please check your MetaMask.');
      } else {
        setDepositError(e?.message || 'Failed to connect MetaMask. Please try again.');
      }
    }
  };

  // Create deposit intent off-chain (for audit/UX)
  const createDepositIntent = async (currency: 'ETH', amountNum: number) => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.post('/api/wallet/deposit-intent', { currency, amount: amountNum }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      // Non-fatal for UX
      console.warn('Deposit intent failed (non-fatal):', e);
    }
  };

  // Send ETH to pool via MetaMask
  const submitDeposit = async () => {
    setDepositError('');
    setDepositSuccess('');
    
    if (!mmConnected || !mmAddress) {
      setDepositError('Please connect MetaMask first.');
      return;
    }
    if (!poolAddress) {
      setDepositError('Pool address unavailable. Please refresh the page.');
      return;
    }
    
    const amountNum = parseFloat(depositAmount);
    if (!amountNum || amountNum <= 0) {
      setDepositError('Please enter a valid amount greater than 0.');
      return;
    }

    // Check if user has enough balance (optional - MetaMask will also check)
    try {
      // @ts-ignore
      const { ethereum } = window as any;
      const balance = await ethereum.request({ 
        method: 'eth_getBalance', 
        params: [mmAddress, 'latest'] 
      });
      const balanceEth = parseInt(balance, 16) / 1e18;
      
      if (balanceEth < amountNum) {
        setDepositError(`Insufficient balance. You have ${balanceEth.toFixed(6)} ETH, trying to send ${amountNum} ETH.`);
        return;
      }
    } catch (e) {
      console.warn('Could not check balance:', e);
      // Continue anyway, MetaMask will handle it
    }

    try {
      // @ts-ignore
      const { ethereum } = window as any;
      const weiHex = '0x' + (BigInt(Math.floor(amountNum * 1e18))).toString(16);
      const txParams = {
        from: mmAddress,
        to: poolAddress,
        value: weiHex,
        gas: '0x5208', // 21000 gas for simple ETH transfer
      } as any;
      
      setDepositSuccess('Please confirm the transaction in MetaMask...');
      const txHash = await ethereum.request({ method: 'eth_sendTransaction', params: [txParams] });

      // Create deposit intent for tracking
      await createDepositIntent(depositCurrency, amountNum);
      
      setDepositSuccess(`✅ Transaction submitted successfully! Hash: ${txHash.substring(0, 10)}...`);
      setDepositAmount('');
      
      // Clear success message after 10 seconds
      setTimeout(() => setDepositSuccess(''), 10000);
      
    } catch (e: any) {
      console.error('Transaction error:', e);
      if (e.code === 4001) {
        setDepositError('Transaction was rejected by user.');
      } else if (e.code === -32603) {
        setDepositError('Transaction failed. Please check your balance and try again.');
      } else {
        setDepositError(e?.message || 'Transaction failed. Please try again.');
      }
    }
  };

  const logout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const toggleSKRCheck = async (id: string) => {
    const currentReceipt = skrReceipts.find(r => r.id === id);
    if (!currentReceipt) return;

    const newCheckedState = !currentReceipt.checked;

    // Optimistically update UI
    setSkrReceipts(prev => 
      prev.map(receipt => 
        receipt.id === id ? { ...receipt, checked: newCheckedState } : receipt
      )
    );

    try {
      // Update backend
      await api.post(`/api/skrs/${id}/toggle`, { checked: newCheckedState });
    } catch (error) {
      console.error('Error updating SKR status:', error);
      // Revert on error
      setSkrReceipts(prev => 
        prev.map(receipt => 
          receipt.id === id ? { ...receipt, checked: !newCheckedState } : receipt
        )
      );
    }
  };

  if (!user) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="crypto-dashboard">
      {/* Unified Sidebar */}
      <Sidebar userRole={user?.role} />

      {/* Main Content */}
      <div className="main-content">
        {/* Enhanced MetaMask Deposit Widget */}
        <div className="metamask-deposit-widget">
          <div className="widget-header">
            <div className="header-icon">🦊</div>
            <div className="header-content">
              <h3>MetaMask Deposit</h3>
              <p>Deposit crypto directly to our secure pool wallet</p>
            </div>
          </div>

          <div className="widget-body">
            {/* Connection Status */}
            <div className="connection-status">
              {mmConnected ? (
                <div className="connected-state">
                  <div className="status-indicator connected"></div>
                  <div className="connection-info">
                    <div className="status-text">Connected to MetaMask</div>
                    <div className="wallet-address">{mmAddress}</div>
                  </div>
                  <button className="btn-disconnect" onClick={() => {
                    setMmConnected(false);
                    setMmAddress('');
                    setDepositError('');
                  }}>Disconnect</button>
                </div>
              ) : (
                <div className="disconnected-state">
                  <div className="status-indicator disconnected"></div>
                  <div className="connection-info">
                    <div className="status-text">Not connected to MetaMask</div>
                    <div className="status-subtitle">Connect your wallet to deposit crypto</div>
                  </div>
                  <button 
                    className="btn-connect" 
                    onClick={connectMetaMask}
                    disabled={!window.ethereum}
                  >
                    <span className="btn-icon">🦊</span>
                    Connect MetaMask
                  </button>
                </div>
              )}
            </div>

            {/* Deposit Form */}
            {mmConnected && (
              <div className="deposit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Currency</label>
                    <select 
                      className="currency-select" 
                      value={depositCurrency} 
                      onChange={(e) => setDepositCurrency(e.target.value as 'ETH')}
                    >
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="USDT" disabled>USDT (Coming Soon)</option>
                      <option value="BTC" disabled>Bitcoin (Coming Soon)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Amount</label>
                    <div className="amount-input-group">
                      <input 
                        type="number" 
                        step="any" 
                        placeholder="0.00" 
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="amount-input"
                      />
                      <span className="currency-symbol">ETH</span>
                    </div>
                  </div>
                </div>

                {/* Pool Address Display */}
                <div className="pool-address-section">
                  <label>Deposit to Pool Address:</label>
                  <div className="address-display">
                    <code className="address-code">
                      {poolAddress || 'Loading pool address...'}
                    </code>
                    {poolAddress && (
                      <button 
                        className="btn-copy" 
                        onClick={() => {
                          navigator.clipboard.writeText(poolAddress);
                          setDepositSuccess('Address copied to clipboard!');
                          setTimeout(() => setDepositSuccess(''), 2000);
                        }}
                      >
                        📋 Copy
                      </button>
                    )}
                  </div>
                  <div className="address-note">
                    ⚠️ Only send {depositCurrency} to this address. Other assets will be lost.
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  className="btn-deposit-submit" 
                  onClick={submitDeposit}
                  disabled={!poolAddress || !depositAmount || parseFloat(depositAmount) <= 0}
                >
                  <span className="btn-icon">💸</span>
                  Send {depositAmount || '0'} {depositCurrency}
                </button>
              </div>
            )}

            {/* Status Messages */}
            {depositError && (
              <div className="status-message error">
                <span className="message-icon">❌</span>
                <span className="message-text">{depositError}</span>
              </div>
            )}
            {depositSuccess && (
              <div className="status-message success">
                <span className="message-icon">✅</span>
                <span className="message-text">{depositSuccess}</span>
              </div>
            )}
          </div>
        </div>
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <span className="user-id">#{user?.id} {user?.fullName}</span>
          </div>
          <div className="header-center">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search transactions, SKRs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-right">
            <div className="header-icons">
              <div className="icon" title="Notifications">🔔</div>
              <div className="icon" title="Messages">💬</div>
              <div className="icon" title="Settings">⚙️</div>
            </div>
            <div 
              className="user-profile"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-pic">{user?.fullName?.charAt(0) || '👤'}</div>
              <span>{user?.email?.split('@')[0] || 'User'}</span>
              <div className="dropdown">▼</div>
              
              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-item">
                    <span>👤</span> Profile
                  </div>
                  <div className="dropdown-item">
                    <span>⚙️</span> Settings
                  </div>
                  <div className="dropdown-item">
                    <span>📊</span> Analytics
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item" onClick={logout}>
                    <span>🚪</span> Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Top Row - Balance Cards */}
          <div className="cards-row">
            {/* Crypto Wallet Balance Card */}
            <div className="balance-card crypto-card">
              <h3 className="card-title">
                <span className="title-icon">💰</span>
                Crypto Wallet Balance
              </h3>
              <div className="balance-grid">
                {walletBalances.slice(0, 3).map((balance, index) => (
                  <div key={index} className="balance-item">
                    <div className="balance-header">
                      <span className="currency-symbol">{balance.symbol}</span>
                      <span className="currency-name">{balance.currency}</span>
                    </div>
                    <div className="balance-value">{balance.balance?.toFixed(6) || '0.000000'}</div>
                    <div className="balance-usd">${balance.valueUsd?.toFixed(2) || '0.00'} USD</div>
                  </div>
                ))}
              </div>
              <div className="balance-total">
                <span>Total Value:</span>
                <span className="total-amount">
                  ${walletBalances.reduce((sum, b) => sum + (b.valueUsd || 0), 0).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Gold Balance Card - Consolidated */}
            <div className="balance-card gold-card">
              <h3 className="card-title">
                <span className="title-icon">🏆</span>
                Gold Holdings
              </h3>
              <div className="gold-stats">
                <div className="stat-item">
                  <div className="stat-icon">📊</div>
                  <div className="stat-details">
                    <div className="stat-label">Total Holdings</div>
                    <div className="stat-value">{goldHoldings.length} SKRs</div>
                  </div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-icon">⚖️</div>
                  <div className="stat-details">
                    <div className="stat-label">Total Weight</div>
                    <div className="stat-value">{goldHoldings.reduce((sum, h) => sum + (h.weightGrams || 0), 0).toFixed(2)} g</div>
                  </div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-icon">💵</div>
                  <div className="stat-details">
                    <div className="stat-label">Total Value</div>
                    <div className="stat-value">
                      ${goldHoldings.reduce((sum, h) => sum + (h.currentValue || h.totalPaid || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-icon">📈</div>
                  <div className="stat-details">
                    <div className="stat-label">Total P&L</div>
                    <div className={`stat-value ${goldHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0) >= 0 ? 'profit' : 'loss'}`}>
                      {goldHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0) >= 0 ? '+' : ''}
                      ${goldHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <button className="view-all-btn" onClick={() => router.push('/skrs')}>
                View All Holdings →
              </button>
            </div>
          </div>

          {/* Bottom Row - SKRs and Transactions */}
          <div className="cards-row">
            {/* SKRs Receipts Card */}
            <div className="skrs-card">
              <div className="card-header">
                <h3 className="card-title">SKRs Safe Keeping Receipts</h3>
                <button className="status-btn" onClick={() => setActiveTab('skrs')}>
                  <span>💎</span>
                  Status
                </button>
              </div>
              <div className="skrs-list">
                {filteredData.skrs.map((receipt) => (
                  <div key={receipt.id} className="skr-item">
                    <input
                      type="checkbox"
                      checked={receipt.checked}
                      onChange={() => toggleSKRCheck(receipt.id)}
                      className="skr-checkbox"
                    />
                    <div className="skr-details">
                      <div className="skr-amount">{receipt.amount}</div>
                      <div className="skr-description">{receipt.description}</div>
                      {receipt.profitLoss !== undefined && (
                        <div className={`skr-profit ${receipt.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                          {receipt.profitLoss >= 0 ? '+' : ''}${receipt.profitLoss.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button 
                      className={`skr-status-btn ${receipt.status === 'active' ? 'active' : 'pending'}`}
                      onClick={() => {
                        // Navigate to SKR detail or perform action
                        console.log('SKR action clicked:', receipt.id);
                      }}
                    >
                      {receipt.status === 'active' ? 'Active' : 'Pending'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions Card */}
            <div className="transactions-card">
              <div className="card-header">
                <h3 className="card-title">Recent Transactions</h3>
                <div className="dropdown-icon" onClick={() => setActiveTab('history')}>▼</div>
              </div>
              <div className="transactions-list">
                {filteredData.transactions.length > 0 ? (
                  filteredData.transactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-item">
                      <div className={`transaction-icon ${transaction.type === 'deposit' ? 'deposit' : transaction.type === 'withdrawal' ? 'withdrawal' : 'gold'}`}>
                        {transaction.type === 'deposit' ? '⬆️' : transaction.type === 'withdrawal' ? '⬇️' : '₿'}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-title">
                          {transaction.type === 'deposit' ? 'Deposit' : 
                           transaction.type === 'withdrawal' ? 'Withdrawal' :
                           transaction.type === 'gold_purchase' ? 'Gold Purchase' : 'Transaction'}
                        </div>
                        <div className="transaction-desc">{transaction.description}</div>
                        <div className="transaction-amount">
                          {transaction.amount} {transaction.currency}
                        </div>
                      </div>
                      <div className="transaction-actions">
                        <div 
                          className={`action-icon ${transaction.status === 'completed' ? 'green' : 'yellow'}`}
                          title={transaction.status}
                        >
                          {transaction.status === 'completed' ? '✓' : '⏳'}
                        </div>
                        <div 
                          className="action-icon white"
                          onClick={() => {
                            // View transaction details
                            console.log('View transaction:', transaction.id);
                          }}
                        >
                          👁️
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-transactions">
                    <p>No transactions found</p>
                    <button className="primary-btn" onClick={() => setActiveTab('wallet')}>
                      Make First Transaction
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .crypto-dashboard {
          display: flex;
          min-height: 100vh;
          background: #1A1A1A;
          color: white;
          font-family: 'Arial', sans-serif;
        }

        .sidebar {
          width: 250px;
          background: #2C2C2C;
          padding: 2rem 0;
          border-right: 1px solid #444;
        }

        .sidebar-header {
          padding: 0 2rem 2rem;
          border-bottom: 1px solid #444;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(45deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          color: white;
        }

        .logo-text {
          font-size: 1.1rem;
          font-weight: bold;
          color: #FFD700;
        }

        .sidebar-nav {
          padding: 2rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .nav-item:hover {
          background: #3A3A3A;
        }

        .nav-item.active {
          background: linear-gradient(90deg, #00C853, #2C2C2C);
          border-left-color: #00C853;
          color: white;
        }

        .nav-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        .main-content {
          flex: 1;
          margin-left: 250px;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: #2C2C2C;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #444;
        }

        .header-left .user-id {
          color: #FFD700;
          font-weight: bold;
        }

        .search-input {
          background: #3A3A3A;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          color: white;
          width: 300px;
        }

        .search-input::placeholder {
          color: #888;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icons {
          display: flex;
          gap: 1rem;
        }

        .icon {
          width: 32px;
          height: 32px;
          background: #3A3A3A;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .icon:hover {
          background: #4A4A4A;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          position: relative; /* Required for dropdown positioning */
        }

        .profile-pic {
          width: 32px;
          height: 32px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .dropdown {
          color: #888;
          font-size: 0.8rem;
        }

        .dashboard-content {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .balance-card, .skrs-card, .transactions-card {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 1.5rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
          min-height: auto; /* Remove fixed heights for better space usage */
        }

        .balance-card:hover {
          border-color: #FFD700;
          box-shadow: 0 6px 25px rgba(255, 215, 0, 0.2);
          transform: translateY(-2px);
        }

        .card-title {
          color: #FFD700;
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent !important; /* Force no white background */
        }

        .title-icon {
          font-size: 1.4rem;
        }

        /* Crypto Card Styles */
        .crypto-card {
          border-left: 4px solid #00C853;
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .balance-item {
          background: #3A3A3A;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .balance-item:hover {
          background: #444;
          transform: translateY(-2px);
        }

        .balance-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .currency-symbol {
          font-size: 1.5rem;
        }

        .currency-name {
          font-size: 1rem;
          font-weight: bold;
          color: #FFD700;
        }

        .balance-value {
          font-size: 1.1rem;
          font-weight: bold;
          color: white;
          margin-bottom: 0.25rem;
        }

        .balance-usd {
          font-size: 0.85rem;
          color: #00C853;
          font-weight: 600;
        }

        .balance-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: linear-gradient(135deg, #00C853 0%, #00A843 100%);
          border-radius: 10px;
          font-weight: bold;
        }

        .total-amount {
          font-size: 1.2rem;
          color: white;
        }

        /* Gold Card Styles */
        .gold-card {
          border-left: 4px solid #FFD700;
        }

        .gold-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #3A3A3A;
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .stat-item:hover {
          background: #444;
          transform: translateX(5px);
        }

        .stat-icon {
          font-size: 2rem;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          border-radius: 12px;
        }

        .stat-details {
          flex: 1;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #888;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
          color: white;
        }

        .stat-value.profit {
          color: #00C853;
        }

        .stat-value.loss {
          color: #FF5722;
        }

        .stat-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #444 50%, transparent 100%);
          margin: 0.5rem 0;
        }

        .view-all-btn {
          width: 100%;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-all-btn:hover {
          background: linear-gradient(135deg, #FFE55C 0%, #FFB84D 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          background: transparent !important; /* Force no white background */
        }

        .status-btn {
          background: #FFD700;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dropdown-icon {
          color: #888;
          cursor: pointer;
        }

        .skrs-list, .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .skr-item, .transaction-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #3A3A3A;
          border-radius: 8px;
        }

        .skr-checkbox {
          width: 18px;
          height: 18px;
          accent-color: #FFD700;
        }

        .skr-details {
          flex: 1;
        }

        .skr-amount {
          font-weight: bold;
          color: #FFD700;
          margin-bottom: 0.25rem;
        }

        .skr-description {
          font-size: 0.9rem;
          color: #888;
        }

        .skr-status-btn {
          background: #00C853;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .transaction-icon {
          width: 32px;
          height: 32px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
        }

        .transaction-icon.dark {
          background: #666;
        }

        .transaction-details {
          flex: 1;
        }

        .transaction-title {
          font-weight: bold;
          margin-bottom: 0.25rem;
        }

        .transaction-desc {
          font-size: 0.9rem;
          color: #888;
        }

        .transaction-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .action-icon.green {
          background: #00C853;
          color: white;
        }

        .action-icon.white {
          background: white;
          color: #333;
        }

        .action-icon.yellow {
          background: #FFC107;
          color: white;
        }

        .transaction-icon.deposit {
          background: #00C853;
        }

        .transaction-icon.withdrawal {
          background: #FF5722;
        }

        .transaction-icon.gold {
          background: #FFD700;
        }

        .transaction-amount {
          font-size: 0.8rem;
          color: #FFD700;
          font-weight: bold;
        }

        .skr-profit {
          font-size: 0.8rem;
          font-weight: bold;
          margin-top: 0.25rem;
        }

        .skr-profit.positive {
          color: #00C853;
        }

        .skr-profit.negative {
          color: #FF5722;
        }

        .skr-status-btn.active {
          background: #00C853;
        }

        .skr-status-btn.pending {
          background: #FFC107;
          color: #333;
        }

        .no-transactions {
          text-align: center;
          padding: 2rem;
          color: #888;
        }

        .primary-btn {
          background: linear-gradient(180deg, #FFD700, #B8860B);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.3s ease;
        }

        .primary-btn:hover {
          background: linear-gradient(180deg, #FFE55C, #CD853F);
          transform: translateY(-2px);
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem; /* Add spacing between avatar and dropdown */
          background: #2C2C2C;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 0.5rem 0;
          min-width: 200px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .dropdown-item:hover {
          background: #3A3A3A;
        }

        .dropdown-item span {
          font-size: 1rem;
        }

        .dropdown-divider {
          height: 1px;
          background: #444;
          margin: 0.5rem 0;
        }

        .dashboard-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #1A1A1A;
        }

        /* Enhanced MetaMask Deposit Widget Styles */
        .metamask-deposit-widget {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #2d3748;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .widget-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .header-icon {
          font-size: 32px;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .header-content h3 {
          margin: 0;
          color: #f7fafc;
          font-size: 24px;
          font-weight: 600;
        }

        .header-content p {
          margin: 4px 0 0 0;
          color: #a0aec0;
          font-size: 14px;
        }

        .connection-status {
          margin-bottom: 24px;
        }

        .connected-state,
        .disconnected-state {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-indicator.connected {
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .status-indicator.disconnected {
          background: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }

        .connection-info {
          flex: 1;
        }

        .status-text {
          color: #f7fafc;
          font-weight: 500;
          font-size: 16px;
        }

        .status-subtitle {
          color: #a0aec0;
          font-size: 14px;
          margin-top: 2px;
        }

        .wallet-address {
          color: #f59e0b;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          margin-top: 4px;
          word-break: break-all;
        }

        .btn-connect,
        .btn-disconnect {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-connect {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .btn-connect:hover:not(:disabled) {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .btn-connect:disabled {
          background: #4a5568;
          color: #a0aec0;
          cursor: not-allowed;
        }

        .btn-disconnect {
          background: #ef4444;
          color: white;
        }

        .btn-disconnect:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .deposit-form {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: #e2e8f0;
          font-weight: 500;
          font-size: 14px;
        }

        .currency-select,
        .amount-input {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f7fafc;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .currency-select:focus,
        .amount-input:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .amount-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .amount-input {
          flex: 1;
          padding-right: 60px;
        }

        .currency-symbol {
          position: absolute;
          right: 16px;
          color: #a0aec0;
          font-weight: 500;
          font-size: 14px;
        }

        .pool-address-section {
          margin-bottom: 20px;
        }

        .pool-address-section label {
          display: block;
          color: #e2e8f0;
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .address-display {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px 16px;
        }

        .address-code {
          flex: 1;
          color: #f59e0b;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          word-break: break-all;
          background: none;
          border: none;
          padding: 0;
        }

        .btn-copy {
          padding: 8px 12px;
          background: #4a5568;
          color: #e2e8f0;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-copy:hover {
          background: #2d3748;
          transform: translateY(-1px);
        }

        .address-note {
          color: #fbbf24;
          font-size: 12px;
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(251, 191, 36, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(251, 191, 36, 0.2);
        }

        .btn-deposit-submit {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .btn-deposit-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }

        .btn-deposit-submit:disabled {
          background: #4a5568;
          color: #a0aec0;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
          font-weight: 500;
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .message-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .message-text {
          flex: 1;
        }

        @media (max-width: 768px) {
          .metamask-deposit-widget {
            padding: 16px;
          }
          
          .widget-header {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          
          .form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .connected-state,
          .disconnected-state {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          
          .address-display {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #333;
          border-top: 4px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile-First Responsive Design */
        @media (max-width: 768px) {
          .crypto-dashboard {
            flex-direction: column;
          }
          
          .sidebar {
            width: 100%;
            height: auto;
            padding: 1rem 0;
            border-right: none;
            border-bottom: 1px solid #444;
          }
          
          .sidebar-nav {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            padding: 1rem 0;
          }
          
          .nav-item {
            padding: 0.75rem 1rem;
            border-left: none;
            border-bottom: 3px solid transparent;
            min-width: 120px;
            justify-content: center;
          }
          
          .nav-item.active {
            background: transparent;
            border-bottom-color: #00C853;
            border-left: none;
          }
          
          .main-content {
            flex: 1;
            margin-left: 0;
          }
          
          .header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
          
          .header-left,
          .header-center,
          .header-right {
            width: 100%;
          }
          
          .search-input {
            width: 100%;
          }
          
          .header-icons {
            justify-content: center;
          }
          
          .user-profile {
            justify-content: center;
            margin-top: 1rem;
          }
          
          .dashboard-content {
            padding: 1rem;
          }
          
          .cards-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .balance-card,
          .skrs-card,
          .transactions-card {
            padding: 1.5rem;
          }
          
          .balance-grid {
            grid-template-columns: 1fr;
          }

          .gold-stats {
            gap: 0.75rem;
          }

          .stat-item {
            padding: 0.75rem;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }
          
          .skr-item,
          .transaction-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .transaction-actions {
            align-self: flex-end;
          }
        }
        
        @media (max-width: 480px) {
          .sidebar-nav {
            flex-direction: column;
            align-items: center;
          }
          
          .nav-item {
            width: 100%;
            max-width: 200px;
            border-left: 4px solid transparent;
            border-bottom: none;
          }
          
          .nav-item.active {
            border-left-color: #00C853;
            border-bottom: none;
          }
          
          .logo-text {
            font-size: 1rem;
          }
          
          .card-title {
            font-size: 1rem;
          }
          
          .balance-card,
          .skrs-card,
          .transactions-card {
            padding: 1rem;
          }

          .stat-value {
            font-size: 1rem;
          }

          .balance-value {
            font-size: 1rem;
          }

          .balance-total {
            padding: 0.75rem;
          }

          .total-amount {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

