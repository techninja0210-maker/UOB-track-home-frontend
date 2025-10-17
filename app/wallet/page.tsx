'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto, formatCompact } from '@/lib/formatters';

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
  address: string;
  change24h?: number;
}

interface DepositAddress {
  currency: string;
  address: string;
  qrCode: string;
  message: string;
}

interface WithdrawalRequest {
  currency: string;
  amount: number;
  destinationAddress: string;
}

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent: number;
  icon: string;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: string;
  status: string;
  result: string;
  timestamp: string;
}

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('$0.00');
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState('external');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'BTC' | 'ETH' | 'USDT'>('BTC');
  const [depositAddresses, setDepositAddresses] = useState<{ [key: string]: DepositAddress }>({});
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalRequest>({
    currency: 'BTC',
    amount: 0,
    destinationAddress: ''
  });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadWalletData();
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

  const loadWalletData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');

      // Load wallet balances (protected)
      const walletResponse = await api.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const balances = walletResponse.data.balances || [];
      setWalletBalances(balances);
      
      // Calculate total balance for display
      const totalValue = (walletResponse.data.totalValueUsd ?? balances.reduce((sum: number, balance: WalletBalance) => sum + (balance.valueUsd || 0), 0));
      setWalletBalance(`$${(totalValue || 0).toFixed(2)}`);

      // Load crypto prices for asset cards (public)
      const pricesResponse = await api.get('/api/prices/crypto');
      const cryptoPrices = pricesResponse.data || {};
      
      // Transform to asset format
      const assets = [
        {
          symbol: 'USDT',
          name: 'USDT',
          price: cryptoPrices.USDT ?? 1.0,
          change24h: 0,
          changePercent: 0,
          icon: '₮'
        },
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: cryptoPrices.BTC ?? 45000,
          change24h: 0,
          changePercent: 0,
          icon: '₿'
        }
      ];
      setCryptoAssets(assets);

      // Load transactions (protected)
      const transactionsResponse = await api.get('/api/wallet/transactions?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawTransactions = transactionsResponse.data || [];
      
      // Transform transactions
      const formattedTransactions = rawTransactions.map((tx: any, index: number) => ({
        id: tx.id || index.toString(),
        date: new Date(tx.createdAt || Date.now()).toLocaleString(),
        type: tx.type || '-',
        amount: `${tx.toAmount ?? 0}`,
        status: tx.status || 'pending',
        result: tx.status === 'completed' ? 'Success' : 'Pending',
        timestamp: tx.createdAt || new Date().toISOString()
      }));
      
      setTransactions(formattedTransactions);

    } catch (error) {
      console.error('Error loading wallet data:', error);
      // Set fallback data
      setWalletBalance('#114112');
      
      setCryptoAssets([
        {
          symbol: 'USDT',
          name: 'USDT',
          price: 1.00,
          change24h: 510.761,
          changePercent: 25,
          icon: '₮'
        },
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 45000,
          change24h: -34.80,
          changePercent: 70,
          icon: '₿'
        }
      ]);
      
      setTransactions([
        {
          id: '1',
          date: 'B Jetrasain Mono',
          type: '1534',
          amount: '1680777',
          status: 'Ferdille',
          result: 'Filll',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          date: 'B Jetblsmain Mono',
          type: '1924',
          amount: '339 95,586',
          status: 'Foru',
          result: 'Filll',
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          date: 'Jetirsin Mono',
          type: '33.4',
          amount: '16.9931.230',
          status: 'Furulet',
          result: 'Fall',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
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

  const getDepositAddress = async (currency: 'BTC' | 'ETH' | 'USDT') => {
    try {
      // Check if we already have this address cached
      if (depositAddresses[currency]) {
        return depositAddresses[currency];
      }

      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get(`/api/wallet/deposit-address/${currency}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const addressData: DepositAddress = response.data;
      setDepositAddresses(prev => ({ ...prev, [currency]: addressData }));
      return addressData;
    } catch (error) {
      console.error('Error fetching deposit address:', error);
      throw error;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    alert('Address copied to clipboard!');
  };

  const handleDeposit = async () => {
    setShowDepositModal(true);
    // Preload all addresses
    try {
      await Promise.all([
        getDepositAddress('BTC'),
        getDepositAddress('ETH'),
        getDepositAddress('USDT')
      ]);
    } catch (error) {
      console.error('Error loading deposit addresses:', error);
    }
  };

  const handleWithdraw = () => {
    setShowWithdrawModal(true);
    setWithdrawalMessage(null);
  };

  const submitWithdrawal = async () => {
    setWithdrawalLoading(true);
    setWithdrawalMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/wallet/withdrawal', withdrawalForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setWithdrawalMessage({
        type: 'success',
        text: response.data.message || 'Withdrawal request submitted successfully!'
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawalForm({ currency: 'BTC', amount: 0, destinationAddress: '' });
        loadWalletData(); // Refresh balances
      }, 3000);
    } catch (error: any) {
      setWithdrawalMessage({
        type: 'error',
        text: error.response?.data?.message || 'Withdrawal request failed. Please try again.'
      });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="wallet-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="crypto-wallet">
      {/* Sidebar Navigation */}
      <Sidebar userRole={user?.role} />

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="logo-small">
              <div className="logo-shield">GC</div>
            </div>
          </div>
          <div className="header-center">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Colotinainee Esen Wold" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-right">
            <div className="header-icons">
              <div className="icon">🔔</div>
              <div className="icon notification">🔔</div>
            </div>
            <div 
              className="user-profile"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-pic">{user.fullName.charAt(0)}</div>
              <span>Timle Fant</span>
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

        {/* Wallet Content */}
        <div className="wallet-content">
          {/* Top Row - Balance and Assets */}
          <div className="cards-row">
            {/* Crypto Balance Card */}
            <div className="balance-card">
              <h3 className="card-title">Cryptio Balance</h3>
              <div className="balance-display">
                <div className="balance-amount">{walletBalance}</div>
              </div>
              <div className="chart-container">
                <svg viewBox="0 0 300 120" className="balance-chart">
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <polyline
                    points="0,100 50,90 100,80 150,70 200,60 250,55 300,50"
                    fill="none"
                    stroke="#00C853"
                    strokeWidth="3"
                    filter="url(#glow)"
                  />
                  <circle cx="200" cy="60" r="8" fill="#00C853" filter="url(#glow)">
                    <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <text x="0" y="20" fill="#888" fontSize="10">700</text>
                  <text x="0" y="120" fill="#888" fontSize="10">700</text>
                  <text x="50" y="130" fill="#888" fontSize="10">0</text>
                  <text x="100" y="130" fill="#888" fontSize="10">22</text>
                  <text x="150" y="130" fill="#888" fontSize="10">20</text>
                  <text x="200" y="130" fill="#888" fontSize="10">19</text>
                  <text x="250" y="130" fill="#888" fontSize="10">73</text>
                  <text x="300" y="130" fill="#888" fontSize="10">770</text>
                </svg>
              </div>
              <div className="balance-actions">
                <button className="btn-deposit" onClick={handleDeposit}>Deposit</button>
                <button className="btn-withdraw" onClick={handleWithdraw}>Withdraw</button>
              </div>
              <div className="balance-identifiers">
                <div className="identifier">##D4AF37</div>
                <div className="identifier">2AB7CA</div>
              </div>
            </div>

            {/* Crypto Assets Cards */}
            <div className="assets-container">
              {/* USDT Card */}
              <div className="asset-card">
                <div className="asset-icon">₮</div>
                <div className="asset-info">
                  <div className="asset-name">USDT</div>
                  <div className="asset-value">#{cryptoAssets[0]?.change24h?.toFixed(0) || '0453'} 24h</div>
                  <div className="asset-changes">
                    <span className="change-positive">{cryptoAssets[0]?.change24h?.toFixed(3) || '510.761'}%</span>
                    <span className="change-label">25% Changs</span>
                  </div>
                </div>
              </div>

              {/* Bitcoin Card */}
              <div className="asset-card">
                <div className="asset-icon">₿</div>
                <div className="asset-info">
                  <div className="asset-name">Bitcoin</div>
                  <div className="asset-value">#{cryptoAssets[1]?.changePercent?.toFixed(0) || '250'}% 24h</div>
                  <div className="asset-changes">
                    <span className="change-negative">{cryptoAssets[1]?.change24h || '34-80'}%</span>
                    <span className="change-label">70% Change</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row - Wallet Address with Currency Selector */}
          <div className="wallet-address-card">
            <div className="card-header-flex">
              <h3 className="card-title">Deposit Address</h3>
              <div className="currency-selector">
                <button 
                  className={`currency-btn ${selectedCurrency === 'BTC' ? 'active' : ''}`}
                  onClick={() => { setSelectedCurrency('BTC'); getDepositAddress('BTC'); }}
                >
                  ₿ BTC
                </button>
                <button 
                  className={`currency-btn ${selectedCurrency === 'ETH' ? 'active' : ''}`}
                  onClick={() => { setSelectedCurrency('ETH'); getDepositAddress('ETH'); }}
                >
                  Ξ ETH
                </button>
                <button 
                  className={`currency-btn ${selectedCurrency === 'USDT' ? 'active' : ''}`}
                  onClick={() => { setSelectedCurrency('USDT'); getDepositAddress('USDT'); }}
                >
                  ₮ USDT
                </button>
              </div>
            </div>
            <div className="address-display-box">
              <div className="address-label">Your {selectedCurrency} Address:</div>
              {depositAddresses[selectedCurrency] ? (
                <>
                  <div className="address-text">
                    {depositAddresses[selectedCurrency].address}
                  </div>
                  <div className="qr-code">
                    <img 
                      src={depositAddresses[selectedCurrency].qrCode} 
                      alt={`${selectedCurrency} QR Code`}
                      className="qr-image"
                    />
                  </div>
                  <div className="address-warning">
                    ⚠️ Only send {selectedCurrency} to this address. Sending other assets may result in permanent loss.
                  </div>
                  <div className="address-actions">
                    <button 
                      className="btn-copy" 
                      onClick={() => copyToClipboard(depositAddresses[selectedCurrency].address)}
                    >
                      📋 Copy Address
                    </button>
                  </div>
                </>
              ) : (
                <div className="address-loading">
                  <button 
                    className="btn-load-address"
                    onClick={() => getDepositAddress(selectedCurrency)}
                  >
                    🔑 Generate {selectedCurrency} Address
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row - Transactions */}
          <div className="transactions-card">
            <div className="transactions-header">
              <h3 className="card-title">Transacttion</h3>
              <div className="transaction-tabs">
                <button 
                  className={`tab ${activeTab === 'internal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('internal')}
                >
                  Intert
                </button>
                <button 
                  className={`tab ${activeTab === 'external' ? 'active' : ''}`}
                  onClick={() => setActiveTab('external')}
                >
                  Interry
                </button>
              </div>
              <button className="filter-btn">Inter Fant</button>
            </div>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Fallus</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>
                      <td>{transaction.type}</td>
                      <td>{transaction.amount}</td>
                      <td>
                        <span className={`status-pill ${transaction.status === 'Ferdille' || transaction.status === 'Foru' || transaction.status === 'Furulet' ? 'success' : 'pending'}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td>
                        <span className={`result-pill ${transaction.result === 'Success' ? 'success' : 'failed'}`}>
                          {transaction.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Withdraw Cryptocurrency</h2>
                <button className="modal-close" onClick={() => setShowWithdrawModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Currency</label>
                  <select 
                    value={withdrawalForm.currency}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, currency: e.target.value })}
                    className="form-input"
                  >
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="USDT">Tether (USDT)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input 
                    type="number"
                    step="any"
                    value={withdrawalForm.amount || ''}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount"
                    className="form-input"
                  />
                  <div className="form-hint">
                    Available Balance: {walletBalances.find(w => w.currency === withdrawalForm.currency)?.balance || 0} {withdrawalForm.currency}
                  </div>
                </div>
                <div className="form-group">
                  <label>Destination Address</label>
                  <input 
                    type="text"
                    value={withdrawalForm.destinationAddress}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, destinationAddress: e.target.value })}
                    placeholder="Enter recipient wallet address"
                    className="form-input"
                  />
                </div>
                {withdrawalMessage && (
                  <div className={`alert ${withdrawalMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {withdrawalMessage.text}
                  </div>
                )}
                <button 
                  className="btn-submit"
                  onClick={submitWithdrawal}
                  disabled={withdrawalLoading}
                >
                  {withdrawalLoading ? 'Processing...' : 'Submit Withdrawal Request'}
                </button>
                <div className="withdrawal-note">
                  ⚠️ Withdrawals require admin approval. A 0.5% fee will be deducted.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .crypto-wallet {
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

        .header-left {
          display: flex;
          align-items: center;
        }

        .logo-small {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-shield {
          width: 32px;
          height: 32px;
          background: linear-gradient(45deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          color: white;
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
          position: relative;
        }

        .icon.notification::after {
          content: '';
          position: absolute;
          top: 5px;
          right: 5px;
          width: 8px;
          height: 8px;
          background: #FF0000;
          border-radius: 50%;
        }

        .icon:hover {
          background: #4A4A4A;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          position: relative;
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
          color: white;
          font-weight: bold;
        }

        .dropdown {
          color: #888;
          font-size: 0.8rem;
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
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

        .wallet-content {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .cards-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .balance-card {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .card-title {
          color: #FFD700;
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
        }

        .balance-display {
          margin-bottom: 1.5rem;
        }

        .balance-amount {
          font-size: 3rem;
          font-weight: bold;
          color: white;
          margin-bottom: 1rem;
        }

        .chart-container {
          height: 150px;
          margin-bottom: 1.5rem;
        }

        .balance-chart {
          width: 100%;
          height: 100%;
        }

        .balance-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .btn-deposit {
          background: #FFD700;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-deposit:hover {
          background: #FFE55C;
          transform: translateY(-2px);
        }

        .btn-withdraw {
          background: #00C853;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-withdraw:hover {
          background: #00E676;
          transform: translateY(-2px);
        }

        .balance-identifiers {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .identifier {
          color: #888;
          font-size: 0.9rem;
          font-family: 'Courier New', monospace;
        }

        .assets-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .asset-card {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 1.5rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .asset-icon {
          width: 50px;
          height: 50px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
        }

        .asset-info {
          flex: 1;
        }

        .asset-name {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .asset-value {
          font-size: 1rem;
          color: #888;
          margin-bottom: 0.25rem;
        }

        .asset-changes {
          display: flex;
          gap: 1rem;
        }

        .change-positive {
          color: #00C853;
          font-weight: bold;
        }

        .change-negative {
          color: #FF5722;
          font-weight: bold;
        }

        .change-label {
          color: #888;
          font-size: 0.9rem;
        }

        .wallet-address-card {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .address-input-container {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .address-input {
          width: 100%;
          padding: 1rem;
          background: #3A3A3A;
          border: 1px solid #555;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          padding-right: 3rem;
        }

        .dropdown-arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #888;
          cursor: pointer;
        }

        .qr-code {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .qr-placeholder {
          width: 150px;
          height: 150px;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-pattern {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          width: 120px;
          height: 120px;
        }

        .qr-square {
          background: #000;
          border-radius: 2px;
        }

        .qr-square:nth-child(2n) {
          background: #000;
        }

        .address-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-copy {
          background: #3A3A3A;
          color: white;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-copy:hover {
          background: #4A4A4A;
        }

        .btn-deposit-small {
          background: #00C853;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-deposit-small:hover {
          background: #00E676;
        }

        .transactions-card {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .transactions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .transaction-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .tab {
          background: #3A3A3A;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab.active {
          background: #00C853;
        }

        .tab:hover {
          background: #4A4A4A;
        }

        .filter-btn {
          background: #3A3A3A;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-btn:hover {
          background: #4A4A4A;
        }

        .transactions-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #444;
        }

        th {
          color: #FFD700;
          font-weight: bold;
        }

        .status-pill {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .status-pill.success {
          background: #00C853;
          color: white;
        }

        .status-pill.pending {
          background: #FFC107;
          color: #333;
        }

        .result-pill {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .result-pill.success {
          background: #00C853;
          color: white;
        }

        .result-pill.failed {
          background: #FF5722;
          color: white;
        }

        .wallet-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #1A1A1A;
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
          .crypto-wallet {
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
          
          .wallet-content {
            padding: 1rem;
          }
          
          .cards-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .wallet-card,
          .crypto-assets-card,
          .transactions-card {
            padding: 1.5rem;
          }
          
          .balance-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .balance-amount {
            font-size: 2rem;
          }
          
          .crypto-assets {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
          
          .asset-item {
            padding: 1rem;
          }
          
          .transactions-table {
            font-size: 0.8rem;
          }
          
          table {
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }
          
          th, td {
            padding: 0.5rem;
          }
          
          .transaction-tabs {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .tab {
            width: 100%;
            text-align: center;
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
          
          .balance-amount {
            font-size: 1.5rem;
          }
          
          .card-title {
            font-size: 1rem;
          }
          
          .wallet-card,
          .crypto-assets-card,
          .transactions-card {
            padding: 1rem;
          }
          
          .crypto-assets {
            grid-template-columns: 1fr;
          }
          
          .address-container {
            flex-direction: column;
            gap: 1rem;
          }
          
          .wallet-address {
            word-break: break-all;
            font-size: 0.8rem;
          }
        }

        /* New Styles for Blockchain Wallet Features */
        .card-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .currency-selector {
          display: flex;
          gap: 0.5rem;
        }

        .currency-btn {
          background: #3A3A3A;
          color: white;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .currency-btn:hover {
          background: #4A4A4A;
        }

        .currency-btn.active {
          background: #FFD700;
          color: #1A1A1A;
          border-color: #FFD700;
        }

        .address-display-box {
          background: #3A3A3A;
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .address-label {
          color: #FFD700;
          font-weight: bold;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .address-text {
          background: #2C2C2C;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 1rem;
          color: white;
          font-family: 'Courier New', monospace;
          word-break: break-all;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .qr-image {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
        }

        .address-warning {
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid #FFA500;
          border-radius: 8px;
          padding: 1rem;
          color: #FFA500;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .address-loading {
          text-align: center;
          padding: 2rem;
        }

        .btn-load-address {
          background: #FFD700;
          color: #1A1A1A;
          border: none;
          border-radius: 8px;
          padding: 1rem 2rem;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-load-address:hover {
          background: #FFE55C;
          transform: translateY(-2px);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          padding: 1rem;
        }

        .modal-content {
          background: #2C2C2C;
          border-radius: 15px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #444;
        }

        .modal-header h2 {
          color: #FFD700;
          font-size: 1.5rem;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.3s ease;
        }

        .modal-close:hover {
          background: #3A3A3A;
        }

        .modal-body {
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          color: #FFD700;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          background: #3A3A3A;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 1rem;
        }

        .form-input:focus {
          outline: none;
          border-color: #FFD700;
        }

        .form-hint {
          color: #888;
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .btn-submit {
          width: 100%;
          background: #00C853;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 1rem;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-submit:hover {
          background: #00E676;
          transform: translateY(-2px);
        }

        .btn-submit:disabled {
          background: #555;
          cursor: not-allowed;
          transform: none;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .alert-success {
          background: rgba(0, 200, 83, 0.2);
          border: 1px solid #00C853;
          color: #00C853;
        }

        .alert-error {
          background: rgba(255, 87, 34, 0.2);
          border: 1px solid #FF5722;
          color: #FF5722;
        }

        .withdrawal-note {
          text-align: center;
          color: #FFA500;
          font-size: 0.85rem;
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(255, 165, 0, 0.1);
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

