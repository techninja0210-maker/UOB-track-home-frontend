'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface DepositForm {
  amount: string;
  walletAddress: string;
  shippingInfo: string;
}

interface WithdrawalForm {
  amount: string;
  walletAddress: string;
  shippingAddress: string;
}

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Deposit state
  const [depositTab, setDepositTab] = useState<'crypto' | 'gold'>('crypto');
  const [depositForm, setDepositForm] = useState<DepositForm>({
    amount: '',
    walletAddress: '',
    shippingInfo: ''
  });
  const [depositLoading, setDepositLoading] = useState(false);
  
  // Withdrawal state
  const [withdrawalTab, setWithdrawalTab] = useState<'crypto' | 'gold'>('crypto');
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalForm>({
    amount: '',
    walletAddress: '',
    shippingAddress: ''
  });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  
  // Status filters
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processing' | 'completed'>('pending');
  
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
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

  const handleDepositChange = (field: keyof DepositForm, value: string) => {
    setDepositForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWithdrawalChange = (field: keyof WithdrawalForm, value: string) => {
    setWithdrawalForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeposit = async () => {
    if (!depositForm.amount || !depositForm.walletAddress) {
      alert('Please fill in all required fields');
      return;
    }

    setDepositLoading(true);
    try {
      const response = await api.post('/api/wallet/deposit', {
        currency: depositTab === 'crypto' ? 'USDT' : 'GOLD',
        amount: parseFloat(depositForm.amount),
        walletAddress: depositForm.walletAddress,
        shippingInfo: depositForm.shippingInfo
      });

      alert('Deposit request submitted successfully!');
      setDepositForm({ amount: '', walletAddress: '', shippingInfo: '' });
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Failed to submit deposit request');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalForm.amount || !withdrawalForm.walletAddress) {
      alert('Please fill in all required fields');
      return;
    }

    setWithdrawalLoading(true);
    try {
      const response = await api.post('/api/wallet/withdrawal', {
        currency: withdrawalTab === 'crypto' ? 'USDT' : 'GOLD',
        amount: parseFloat(withdrawalForm.amount),
        destinationAddress: withdrawalForm.walletAddress,
        shippingAddress: withdrawalForm.shippingAddress
      });

      alert('Withdrawal request submitted successfully!');
      setWithdrawalForm({ amount: '', walletAddress: '', shippingAddress: '' });
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Failed to submit withdrawal request');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="transactions-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="transactions-page">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">GC</div>
            <span className="logo-text">UOB Security House</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/" className="nav-item">
            <div className="nav-icon">🏠</div>
            <span>Dashboard</span>
          </Link>
          <Link href="/wallet" className="nav-item">
            <div className="nav-icon">💰</div>
            <span>Wallet</span>
          </Link>
          <Link href="/exchange" className="nav-item">
            <div className="nav-icon">🔁</div>
            <span>Exchange</span>
          </Link>
          <Link href="/skrs" className="nav-item">
            <div className="nav-icon">📄</div>
            <span>SKRs</span>
          </Link>
          <Link href="/transactions" className="nav-item active">
            <div className="nav-icon">📊</div>
            <span>Transactions</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="logo-small">
              <div className="logo-shield">GC</div>
            </div>
          </div>
          <div className="header-right">
            <div className="status-filters">
              <button 
                className={`status-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </button>
              <button 
                className={`status-btn ${statusFilter === 'processing' ? 'active' : ''}`}
                onClick={() => setStatusFilter('processing')}
              >
                Processing
              </button>
              <button 
                className={`status-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </button>
            </div>
            <div 
              className="user-profile"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-pic">{user.fullName.charAt(0)}</div>
              <span>{user.fullName}</span>
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

        {/* Transactions Content */}
        <div className="transactions-content">
          <div className="panels-container">
            {/* Deposits Panel */}
            <div className="deposits-panel">
              <h2 className="panel-title">Deposits</h2>
              
              {/* Tabs */}
              <div className="tabs">
                <button 
                  className={`tab ${depositTab === 'crypto' ? 'active' : ''}`}
                  onClick={() => setDepositTab('crypto')}
                >
                  Crypto
                </button>
                <button 
                  className={`tab ${depositTab === 'gold' ? 'active' : ''}`}
                  onClick={() => setDepositTab('gold')}
                >
                  Gold
                </button>
              </div>

              {/* Form Fields */}
              <div className="form-fields">
                <div className="field-group">
                  <label className="field-label">Deposit Monib</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="121355443444#@/00no"
                      value={depositForm.amount}
                      onChange={(e) => handleDepositChange('amount', e.target.value)}
                    />
                    <span className="field-tag">#121112</span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Wallet address</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Crypoto"
                      value={depositForm.walletAddress}
                      onChange={(e) => handleDepositChange('walletAddress', e.target.value)}
                    />
                    <span className="field-tag">Cryptto</span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Shipping Informe Insput</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Shipping information"
                      value={depositForm.shippingInfo}
                      onChange={(e) => handleDepositChange('shippingInfo', e.target.value)}
                    />
                    <span className="field-tag">Gold</span>
                  </div>
                </div>
              </div>

              {/* Deposit Button */}
              <button 
                className="deposit-btn"
                onClick={handleDeposit}
                disabled={depositLoading}
              >
                {depositLoading ? 'Processing...' : 'Deposit'}
              </button>
            </div>

            {/* Withdrawals Panel */}
            <div className="withdrawals-panel">
              {/* Tabs */}
              <div className="tabs">
                <button 
                  className={`tab ${withdrawalTab === 'crypto' ? 'active' : ''}`}
                  onClick={() => setWithdrawalTab('crypto')}
                >
                  Crypto
                </button>
                <button 
                  className={`tab ${withdrawalTab === 'gold' ? 'active' : ''}`}
                  onClick={() => setWithdrawalTab('gold')}
                >
                  Gold
                </button>
              </div>

              {/* Form Fields */}
              <div className="form-fields">
                <div className="field-group">
                  <label className="field-label">Jetabain Mono</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Jet3535434ant/@Mono"
                      value={withdrawalForm.amount}
                      onChange={(e) => handleWithdrawalChange('amount', e.target.value)}
                    />
                    <span className="field-tag">#12112</span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Wallet address</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="12335434444@00no"
                      value={withdrawalForm.walletAddress}
                      onChange={(e) => handleWithdrawalChange('walletAddress', e.target.value)}
                    />
                    <span className="field-tag">#12112</span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Shipping address</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Shipping address"
                      value={withdrawalForm.shippingAddress}
                      onChange={(e) => handleWithdrawalChange('shippingAddress', e.target.value)}
                    />
                    <span className="field-tag">#DA73</span>
                  </div>
                </div>
              </div>

              {/* Withdraw Button */}
              <button 
                className="withdraw-btn"
                onClick={handleWithdrawal}
                disabled={withdrawalLoading}
              >
                {withdrawalLoading ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .transactions-page {
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

        .header-right {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .status-filters {
          display: flex;
          gap: 0.5rem;
        }

        .status-btn {
          background: #3A3A3A;
          color: white;
          border: none;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .status-btn.active {
          background: #FFD700;
          color: #1A1A1A;
        }

        .status-btn:hover:not(.active) {
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

        .transactions-content {
          flex: 1;
          padding: 2rem;
        }

        .panels-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .deposits-panel,
        .withdrawals-panel {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .panel-title {
          font-size: 1.8rem;
          font-weight: bold;
          color: #D6DEE2;
          margin-bottom: 1.5rem;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .tab {
          background: transparent;
          color: #888;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab.active {
          color: #FFD700;
          border-bottom-color: #FFD700;
        }

        .tab:hover:not(.active) {
          color: white;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          color: #D6DEE2;
          font-weight: bold;
          font-size: 1rem;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          flex: 1;
          background: #3A3A3A;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 1rem;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s ease;
        }

        .form-input:focus {
          border-color: #FFD700;
        }

        .form-input::placeholder {
          color: #888;
        }

        .field-tag {
          position: absolute;
          right: 1rem;
          color: #FFD700;
          font-weight: bold;
          font-size: 0.9rem;
          background: rgba(255, 215, 0, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .deposit-btn {
          width: 100%;
          background: linear-gradient(180deg, #FFD700, #B8860B);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1.25rem;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }

        .deposit-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #FFE55C, #D4AF37);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
        }

        .deposit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .withdraw-btn {
          width: 100%;
          background: linear-gradient(180deg, #00C853, #00A047);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1.25rem;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 200, 83, 0.3);
        }

        .withdraw-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #00E676, #00C853);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 200, 83, 0.4);
        }

        .withdraw-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .transactions-loading {
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

        @media (max-width: 1024px) {
          .panels-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .transactions-page {
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
          
          .transactions-content {
            padding: 1rem;
          }
          
          .status-filters {
            justify-content: center;
          }

          .transactions-content {
            padding: 1rem;
          }

          .deposits-panel,
          .withdrawals-panel {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
