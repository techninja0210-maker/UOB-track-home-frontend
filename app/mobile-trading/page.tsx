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

interface AssetCard {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  price: string;
  change: string;
  isHighlighted?: boolean;
}

interface TradingItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  icon: string;
  button?: string;
}

export default function MobileTradingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('crypto');
  const [assetCards, setAssetCards] = useState<AssetCard[]>([]);
  const [tradingItems, setTradingItems] = useState<TradingItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadTradingData();
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

  const loadTradingData = async () => {
    try {
      setAssetCards([
        {
          id: '1',
          name: 'USDT',
          symbol: 'USDT',
          icon: '₮',
          price: '247Y',
          change: '24.245%'
        },
        {
          id: '2',
          name: 'Bifuoin',
          symbol: 'Bitcoin',
          icon: '₿',
          price: '24.24%',
          change: '24.24%'
        },
        {
          id: '3',
          name: 'Hirtain',
          symbol: 'Bitcoin',
          icon: '₿',
          price: '24.3.27%',
          change: '24.9.95%',
          isHighlighted: true
        },
        {
          id: '4',
          name: 'Nenen',
          symbol: 'NEN',
          icon: '🏢',
          price: '3086-20',
          change: '24.45%'
        },
        {
          id: '5',
          name: 'Intermarr',
          symbol: 'INM',
          icon: '💼',
          price: '264,55',
          change: '24h 35%'
        }
      ]);

      setTradingItems([
        {
          id: '1',
          title: 'Total Brains Mono',
          subtitle: 'JetBrains Mono',
          value: '248%',
          unit: 'Grams/Zouce',
          icon: '¥'
        },
        {
          id: '2',
          title: 'Current Gold',
          subtitle: 'Golo Price',
          value: '13.4%',
          unit: 'Chrange',
          icon: '🥇'
        },
        {
          id: '3',
          title: 'Buy Gold',
          subtitle: 'DetBranstion',
          value: '',
          unit: '',
          icon: '⬇️',
          button: 'Buy Gold'
        },
        {
          id: '4',
          title: 'Recemt',
          subtitle: 'Tettransction',
          value: '2AB7A',
          unit: '2AB7A',
          icon: '4'
        }
      ]);
    } catch (error) {
      console.error('Error loading trading data:', error);
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
    <div className="mobile-trading">
      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-left">#11112</span>
        <div className="status-right">
          <span className="signal">📶</span>
          <span className="wifi">📶</span>
          <span className="battery">🔋</span>
        </div>
      </div>

      {/* Header with Tabs */}
      <div className="header">
        <div className="tab-container">
          <button 
            className={`tab ${activeTab === 'crypto' ? 'active' : ''}`}
            onClick={() => setActiveTab('crypto')}
          >
            Crypto
          </button>
          <button 
            className={`tab ${activeTab === 'gold' ? 'active' : ''}`}
            onClick={() => setActiveTab('gold')}
          >
            Gold
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Graph Section */}
        <div className="graph-section">
          <div className="graph-header">
            <h3 className="graph-title">Corypto</h3>
            <div className="graph-controls">
              <span className="trend-text">Treen</span>
              <span className="trend-arrow">→</span>
            </div>
          </div>
          
          <div className="chart-container">
            <svg viewBox="0 0 200 100" className="trading-chart">
              {/* Y-axis labels */}
              <text x="10" y="15" fill="#DAA520" fontSize="8">7001</text>
              <text x="10" y="50" fill="#DAA520" fontSize="8">100</text>
              <text x="10" y="95" fill="#DAA520" fontSize="8">0</text>
              
              {/* X-axis labels */}
              <text x="30" y="100" fill="#DAA520" fontSize="6">0</text>
              <text x="50" y="100" fill="#DAA520" fontSize="6">20</text>
              <text x="70" y="100" fill="#DAA520" fontSize="6">26</text>
              <text x="90" y="100" fill="#DAA520" fontSize="6">46</text>
              <text x="110" y="100" fill="#DAA520" fontSize="6">55</text>
              <text x="130" y="100" fill="#DAA520" fontSize="6">160</text>
              <text x="150" y="100" fill="#DAA520" fontSize="6">100</text>
              <text x="170" y="100" fill="#DAA520" fontSize="6">125</text>
              <text x="190" y="100" fill="#DAA520" fontSize="6">120</text>
              
              {/* Chart line */}
              <polyline
                fill="none"
                stroke="#00C853"
                strokeWidth="2"
                points="30,80 50,75 70,70 90,65 110,40 130,60 150,70 170,75 190,80"
              />
              
              {/* Peak highlight */}
              <circle cx="110" cy="40" r="4" fill="#FFD700" />
              <line x1="110" y1="40" x2="110" y2="100" stroke="#FFD700" strokeWidth="1" strokeDasharray="2,2" />
              <text x="115" y="35" fill="#FFD700" fontSize="8">⭐</text>
            </svg>
          </div>
        </div>

        {/* Asset Cards */}
        <div className="asset-cards">
          {assetCards.map((asset) => (
            <div 
              key={asset.id} 
              className={`asset-card ${asset.isHighlighted ? 'highlighted' : ''}`}
            >
              <div className="asset-icon">{asset.icon}</div>
              <div className="asset-info">
                <div className="asset-name">{asset.name}</div>
                <div className="asset-symbol">{asset.symbol}</div>
              </div>
              <div className="asset-price">{asset.price}</div>
              <div className="asset-change">{asset.change}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="deposit-btn">Deposit</button>
          <button className="withdraw-btn">Withdraw</button>
        </div>

        {/* Recent Transactions / Gold Section */}
        <div className="trading-section">
          <div className="section-header">
            <h3 className="section-title">Recent Trans Gold</h3>
            <span className="section-arrow">→</span>
          </div>
          
          <div className="trading-items">
            {tradingItems.map((item) => (
              <div key={item.id} className="trading-item">
                <div className="item-icon">{item.icon}</div>
                <div className="item-details">
                  <div className="item-title">{item.title}</div>
                  <div className="item-subtitle">{item.subtitle}</div>
                </div>
                <div className="item-values">
                  {item.button ? (
                    <button className="item-button">{item.button}</button>
                  ) : (
                    <>
                      <div className="item-value">{item.value}</div>
                      <div className="item-unit">{item.unit}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fab">
        <span className="fab-icon">+</span>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <Link href="/mobile-dashboard" className="nav-item active">
          <div className="nav-icon">🏠</div>
          <span>Dashboard</span>
        </Link>
        <Link href="/mobile-wallet" className="nav-item">
          <div className="nav-icon">💰</div>
          <span>Wallet</span>
        </Link>
        <Link href="/mobile-skrs" className="nav-item">
          <div className="nav-icon">⊞</div>
          <span>SKRs</span>
        </Link>
        <Link href="/mobile-history" className="nav-item">
          <div className="nav-icon">🛡️</div>
          <span>History</span>
        </Link>
        <Link href="/mobile-profile" className="nav-item">
          <div className="nav-icon">👤</div>
          <span>Profile</span>
        </Link>
      </div>

      <style jsx>{`
        .mobile-trading {
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
          padding: 16px;
          background: #1A1A1A;
        }

        .tab-container {
          display: flex;
          gap: 2px;
        }

        .tab {
          flex: 1;
          padding: 12px;
          background: transparent;
          border: none;
          color: #00C853;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }

        .tab.active {
          color: #FFD700;
        }

        .tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #FFD700;
        }

        .main-content {
          padding: 16px;
          padding-bottom: 100px;
        }

        .graph-section {
          background: #2C2C2C;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .graph-title {
          color: white;
          font-size: 16px;
          font-weight: bold;
          margin: 0;
        }

        .graph-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .trend-text {
          color: #888;
          font-size: 12px;
        }

        .trend-arrow {
          color: #00C853;
          font-size: 12px;
        }

        .chart-container {
          width: 100%;
          height: 80px;
        }

        .trading-chart {
          width: 100%;
          height: 100%;
        }

        .asset-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .asset-card {
          background: #2C2C2C;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .asset-card.highlighted {
          background: linear-gradient(135deg, #FFD700, #B8860B);
          color: #1A1A1A;
        }

        .asset-icon {
          font-size: 20px;
          text-align: center;
        }

        .asset-info {
          text-align: center;
        }

        .asset-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
        }

        .asset-symbol {
          font-size: 10px;
          opacity: 0.8;
        }

        .asset-price {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .asset-change {
          font-size: 10px;
          opacity: 0.8;
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .deposit-btn,
        .withdraw-btn {
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .deposit-btn {
          background: #FFD700;
          color: #1A1A1A;
        }

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

        .trading-section {
          background: #2C2C2C;
          border-radius: 12px;
          padding: 16px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-title {
          color: white;
          font-size: 16px;
          font-weight: bold;
          margin: 0;
        }

        .section-arrow {
          color: #00C853;
          font-size: 16px;
        }

        .trading-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trading-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #3A3A3A;
          border-radius: 8px;
        }

        .item-icon {
          width: 32px;
          height: 32px;
          background: #00C853;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .item-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-title {
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .item-subtitle {
          color: #888;
          font-size: 12px;
        }

        .item-values {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .item-value {
          color: #00C853;
          font-size: 14px;
          font-weight: bold;
        }

        .item-unit {
          color: #888;
          font-size: 12px;
        }

        .item-button {
          background: #00C853;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .item-button:hover {
          background: #00E676;
        }

        .fab {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 56px;
          height: 56px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .fab-icon {
          color: #1A1A1A;
          font-size: 24px;
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
          border-radius: 12px 12px 0 0;
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

        .nav-item.active::before {
          content: '';
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #FFD700;
          border-radius: 50%;
        }

        .nav-icon {
          font-size: 20px;
        }

        .nav-item span {
          font-size: 10px;
          font-weight: bold;
        }


        @media (max-width: 375px) {
          .mobile-trading {
            width: 100%;
            height: 100vh;
          }
          
          .bottom-nav {
            width: 100%;
          }
          
          .fab {
            left: calc(50% - 28px);
          }
        }
      `}</style>
    </div>
  );
}

