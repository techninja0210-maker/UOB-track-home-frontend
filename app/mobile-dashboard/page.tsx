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

interface WalletBalance {
  currency: string;
  balance: number;
  symbol: string;
  valueUsd: number;
  chartData: number[];
}

interface Transaction {
  id: string;
  type: string;
  description: string;
  subDescription: string;
  amount: string;
  timestamp: string;
  status: string;
}

export default function MobileDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [goldBalance, setGoldBalance] = useState(20000);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState('crypto');
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadDashboardData();
  }, []);

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

  const loadDashboardData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      // Load REAL balances from API only - no fake data
      const walletResponse = await api.get('/api/wallet/balances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const balances = walletResponse.data || [];
      
      // Transform to expected format - ONLY real balances
      const transformedBalances = balances.map((balance: any) => ({
        currency: balance.currency,
        balance: parseFloat(balance.balance) || 0,
        symbol: balance.currency === 'BTC' ? '₿' : balance.currency === 'ETH' ? 'Ξ' : '₮',
        valueUsd: parseFloat(balance.valueUsd) || 0,
        chartData: []
      }));
      
      setWalletBalances(transformedBalances);

      // Load REAL transactions from API only - no fake data
      const transactionsResponse = await api.get('/api/wallet/transactions?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawTransactions = transactionsResponse.data || [];
      
      const formattedTransactions = rawTransactions.map((tx: any) => ({
        id: tx.id || tx.transactionId || `tx-${Date.now()}`,
        type: tx.type || 'transaction',
        description: tx.description || 'Transaction',
        subDescription: tx.meta?.description || '',
        amount: `${tx.amount || 0} ${tx.currency || ''}`,
        timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
        status: tx.status || 'pending'
      }));
      
      setRecentTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty arrays on error - no fake data
      setWalletBalances([]);
      setRecentTransactions([]);
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


  return (
    <div className="mobile-dashboard">
      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-left">#111112</span>
        <div className="status-right">
          <span className="signal">📶</span>
          <span className="wifi">📶</span>
          <span className="battery">🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <button className="menu-btn">☰</button>
        <h1 className="app-title">GoldCrypto</h1>
        <button className="notification-btn">🔔</button>
      </div>

      {/* Crypto Wallet Balance Card */}
      <div className="wallet-card">
        <div className="card-header">
          <h3 className="card-title">Crypto Wallet Balance</h3>
          <button className="expand-btn">▼</button>
        </div>
        
        <div className="wallet-grid">
          {walletBalances.map((balance, index) => (
            <div key={balance.currency} className="wallet-item">
              <h4 className="currency-name">{balance.currency}</h4>
              <div className="chart-container">
                <div className="currency-icon">₿</div>
                <svg viewBox="0 0 100 30" className="mini-chart">
                  <polyline
                    fill="none"
                    stroke={index === 0 ? "#00C853" : "#FFD700"}
                    strokeWidth="2"
                    points={balance.chartData.map((value, i) => 
                      `${(i / (balance.chartData.length - 1)) * 100},${30 - (value / 20200) * 25}`
                    ).join(' ')}
                  />
                </svg>
              </div>
              <div className="chart-labels">
                {balance.chartData.map((value, i) => (
                  <span key={i} className="chart-label">{value}</span>
                ))}
              </div>
              {index === 1 && (
                <div className="chart-highlight">
                  <div className="highlight-circle"></div>
                  <span className="highlight-value">791</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gold Balance Card */}
      <div className="gold-card">
        <div className="card-header">
          <h3 className="card-title">Gold Balance</h3>
        </div>
        
        <div className="gold-content">
          <div className="gold-info">
            <div className="gold-amount">$20.0.00</div>
            <div className="gold-unit">Gras/qounce</div>
          </div>
          <div className="gold-coin">$</div>
        </div>

        <div className="action-buttons">
          <button className="action-btn buy-btn">Buy</button>
          <button className="action-btn deposit-btn">Deposit</button>
          <button className="action-btn withdraw-btn">Withdraw</button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="transactions-section">
        <h3 className="section-title">Recent Transactions</h3>
        <div className="transactions-list">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-icon">
                <div className="check-icon">✓</div>
              </div>
              <div className="transaction-details">
                <div className="transaction-desc">{transaction.description}</div>
                <div className="transaction-sub">{transaction.subDescription}</div>
              </div>
              <div className="transaction-amount">{transaction.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <Link href="/mobile-dashboard" className="nav-item active">
          <div className="nav-icon">💰</div>
          <span>Dashboard</span>
        </Link>
        <Link href="/mobile-wallet" className="nav-item">
          <div className="nav-icon">💼</div>
          <span>Wallet</span>
        </Link>
        <Link href="/mobile-skrs" className="nav-item">
          <div className="nav-icon">🏠</div>
          <span>SKRs</span>
        </Link>
        <Link href="/mobile-history" className="nav-item">
          <div className="nav-icon">⊞</div>
          <span>History</span>
        </Link>
        <Link href="/mobile-profile" className="nav-item">
          <div className="nav-icon">👤</div>
          <span>Profile</span>
        </Link>
      </div>

      <style jsx>{`
        .mobile-dashboard {
          width: 375px;
          height: 812px;
          background: #1A1A1A;
          color: white;
          font-family: 'Arial', sans-serif;
          margin: 0 auto;
          position: relative;
          overflow-x: hidden;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background: #1A1A1A;
          font-size: 12px;
        }

        .status-left {
          color: #888;
        }

        .status-right {
          display: flex;
          gap: 4px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #1A1A1A;
        }

        .menu-btn {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        }

        .app-title {
          color: #FFD700;
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }

        .notification-btn {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        }

        .wallet-card {
          background: #2C2C2C;
          margin: 16px;
          border-radius: 12px;
          padding: 16px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-title {
          color: white;
          font-size: 16px;
          font-weight: bold;
          margin: 0;
        }

        .expand-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 14px;
          cursor: pointer;
        }

        .wallet-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .wallet-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }

        .currency-name {
          color: white;
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }

        .chart-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .currency-icon {
          width: 16px;
          height: 16px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          font-weight: bold;
        }

        .mini-chart {
          flex: 1;
          height: 20px;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #888;
        }

        .chart-highlight {
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
        }

        .highlight-circle {
          width: 8px;
          height: 8px;
          background: #FFD700;
          border-radius: 50%;
          margin-bottom: 2px;
        }

        .highlight-value {
          font-size: 10px;
          color: #FFD700;
          font-weight: bold;
        }

        .gold-card {
          background: #2C2C2C;
          margin: 16px;
          border-radius: 12px;
          padding: 16px;
          background: linear-gradient(135deg, #2C2C2C 0%, #3A3A3A 100%);
        }

        .gold-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .gold-info {
          display: flex;
          flex-direction: column;
        }

        .gold-amount {
          color: white;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }

        .gold-unit {
          color: #888;
          font-size: 12px;
        }

        .gold-coin {
          width: 60px;
          height: 60px;
          background: linear-gradient(45deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .buy-btn,
        .deposit-btn {
          background: #FFD700;
          color: #1A1A1A;
        }

        .buy-btn:hover,
        .deposit-btn:hover {
          background: #FFE55C;
        }

        .withdraw-btn {
          background: #00C853;
          color: white;
        }

        .withdraw-btn:hover {
          background: #00E676;
        }

        .transactions-section {
          margin: 16px;
        }

        .section-title {
          color: white;
          font-size: 16px;
          font-weight: bold;
          margin: 0 0 16px 0;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #2C2C2C;
          border-radius: 8px;
        }

        .transaction-icon {
          width: 24px;
          height: 24px;
          background: #00C853;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check-icon {
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .transaction-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .transaction-desc {
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .transaction-sub {
          color: #888;
          font-size: 12px;
        }

        .transaction-amount {
          color: #00C853;
          font-size: 14px;
          font-weight: bold;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 375px;
          background: #2C2C2C;
          padding: 12px 16px;
          display: flex;
          justify-content: space-around;
          border-top: 1px solid #444;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }

        .nav-item.active {
          color: #FFD700;
        }

        .nav-icon {
          font-size: 20px;
        }

        .nav-item span {
          font-size: 10px;
          font-weight: bold;
        }


        @media (max-width: 375px) {
          .mobile-dashboard {
            width: 100%;
            height: 100vh;
          }
          
          .bottom-nav {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

