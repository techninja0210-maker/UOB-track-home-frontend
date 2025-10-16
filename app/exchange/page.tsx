'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface ExchangeCalculation {
  cryptoCurrency?: string;
  cryptoAmount?: number;
  cryptoPriceUsd?: number;
  goldPricePerGram: number;
  goldGrams?: number;
  goldValueUsd?: number;
  fee: number;
  netAmount: number;
}

export default function ExchangePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  
  // Prices
  const [goldPrice, setGoldPrice] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [usdtPrice, setUsdtPrice] = useState(1);
  
  // Buy Gold Form
  const [buyCurrency, setBuyCurrency] = useState('BTC');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyCalculation, setBuyCalculation] = useState<ExchangeCalculation | null>(null);
  
  // Sell Gold Form
  const [sellCurrency, setSellCurrency] = useState('BTC');
  const [sellGoldAmount, setSellGoldAmount] = useState('');
  const [sellCalculation, setSellCalculation] = useState<ExchangeCalculation | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    checkAuth();
    loadPrices();
    const interval = setInterval(loadPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
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
      router.push('/login');
    }
  };

  const loadPrices = async () => {
    try {
      const [cryptoRes, goldRes] = await Promise.all([
        api.get('/api/prices/crypto'),
        api.get('/api/prices/gold/current')
      ]);
      
      setBtcPrice(cryptoRes.data.BTC || 0);
      setEthPrice(cryptoRes.data.ETH || 0);
      setUsdtPrice(cryptoRes.data.USDT || 1);
      setGoldPrice(goldRes.data.pricePerGram || 0);
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  };
  
  const calculateBuy = async () => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      setBuyCalculation(null);
      return;
    }
    
    try {
      const response = await api.get('/api/prices/exchange/crypto-to-gold', {
        params: {
          crypto: buyCurrency,
          amount: parseFloat(buyAmount)
        }
      });
      
      setBuyCalculation({
        cryptoCurrency: buyCurrency,
        cryptoAmount: parseFloat(buyAmount),
        cryptoPriceUsd: response.data.cryptoPriceUSD,
        goldPricePerGram: response.data.goldPricePerGram,
        goldGrams: response.data.goldGrams,
        fee: response.data.feeUSD,
        netAmount: response.data.goldGrams
      });
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };
  
  const calculateSell = async () => {
    if (!sellGoldAmount || parseFloat(sellGoldAmount) <= 0) {
      setSellCalculation(null);
      return;
    }
    
    try {
      const response = await api.get('/api/prices/exchange/gold-to-crypto', {
        params: {
          crypto: sellCurrency,
          goldGrams: parseFloat(sellGoldAmount)
        }
      });
      
      setSellCalculation({
        cryptoCurrency: sellCurrency,
        goldGrams: parseFloat(sellGoldAmount),
        goldPricePerGram: response.data.goldPricePerGram,
        cryptoPriceUsd: response.data.cryptoPriceUSD,
        goldValueUsd: response.data.goldValueUSD,
        fee: response.data.feeUSD,
        netAmount: response.data.cryptoAmount
      });
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };
  
  const executeBuy = async () => {
    if (!buyCalculation || !buyAmount) return;
    
    if (!confirm(`Confirm: Buy ${buyCalculation.goldGrams?.toFixed(4)}g gold with ${buyAmount} ${buyCurrency}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      await api.post('/api/gold-exchange/crypto-to-gold', {
        cryptoCurrency: buyCurrency,
        cryptoAmount: parseFloat(buyAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: `Successfully purchased ${buyCalculation.goldGrams?.toFixed(4)}g of gold!` });
      setBuyAmount('');
      setBuyCalculation(null);
      loadPrices();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Exchange failed' });
    } finally {
      setLoading(false);
    }
  };
  
  const executeSell = async () => {
    if (!sellCalculation || !sellGoldAmount) return;
    
    if (!confirm(`Confirm: Sell ${sellGoldAmount}g gold for ${sellCalculation.netAmount?.toFixed(8)} ${sellCurrency}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      await api.post('/api/gold-exchange/gold-to-crypto', {
        cryptoCurrency: sellCurrency,
        goldGrams: parseFloat(sellGoldAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: `Successfully sold ${sellGoldAmount}g gold for ${sellCalculation.netAmount?.toFixed(8)} ${sellCurrency}!` });
      setSellGoldAmount('');
      setSellCalculation(null);
      loadPrices();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Exchange failed' });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (buyAmount) {
      const timer = setTimeout(calculateBuy, 500);
      return () => clearTimeout(timer);
    }
  }, [buyAmount, buyCurrency]);
  
  useEffect(() => {
    if (sellGoldAmount) {
      const timer = setTimeout(calculateSell, 500);
      return () => clearTimeout(timer);
    }
  }, [sellGoldAmount, sellCurrency]);
  
  if (!user) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  const getCurrentPrice = () => {
    if (activeTab === 'buy') {
      return buyCurrency === 'BTC' ? btcPrice : buyCurrency === 'ETH' ? ethPrice : usdtPrice;
    }
    return sellCurrency === 'BTC' ? btcPrice : sellCurrency === 'ETH' ? ethPrice : usdtPrice;
  };

  // Safely compute fees in USD when backend doesn't return them
  const getBuyFeeUsd = () => {
    if (!buyCalculation) return 0;
    const usdValue = (buyCalculation.cryptoAmount || 0) * (buyCalculation.cryptoPriceUsd || 0);
    return (typeof buyCalculation.fee === 'number' && !Number.isNaN(buyCalculation.fee))
      ? buyCalculation.fee
      : usdValue * 0.005; // 0.5% platform fee fallback
  };

  const getSellFeeUsd = () => {
    if (!sellCalculation) return 0;
    const usdValue = (sellCalculation.goldValueUsd || 0);
    return (typeof sellCalculation.fee === 'number' && !Number.isNaN(sellCalculation.fee))
      ? sellCalculation.fee
      : usdValue * 0.005; // 0.5% platform fee fallback
  };

  return (
    <div className="exchange-page">
      {/* Unified Sidebar */}
      <Sidebar userRole={user?.role} />

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h1>Gold Exchange</h1>
            <p className="subtitle">Trade crypto for digital gold</p>
          </div>
          <div className="header-right">
            <div className="price-display">
              <div className="price-item">
                <span className="price-label">Gold:</span>
                <span className="price-value">${goldPrice.toFixed(2)}/g</span>
              </div>
              <div className="price-item">
                <span className="price-label">BTC:</span>
                <span className="price-value">${btcPrice.toLocaleString()}</span>
        </div>
              <div className="price-item">
                <span className="price-label">ETH:</span>
                <span className="price-value">${ethPrice.toLocaleString()}</span>
      </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
            <button className="alert-close" onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        <div className="content">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'buy' ? 'active' : ''}`}
              onClick={() => setActiveTab('buy')}
            >
              🛒 Buy Gold
            </button>
            <button
              className={`tab ${activeTab === 'sell' ? 'active' : ''}`}
              onClick={() => setActiveTab('sell')}
            >
              💰 Sell Gold
            </button>
          </div>

          {/* Buy Gold Form */}
          {activeTab === 'buy' && (
            <div className="exchange-form">
              <div className="form-card">
                <h2>Buy Digital Gold</h2>
                <p className="form-subtitle">Exchange crypto for gold credits</p>

                <div className="form-group">
                  <label>Pay With</label>
                  <div className="currency-selector">
                    <button
                      className={`currency-btn ${buyCurrency === 'BTC' ? 'active' : ''}`}
                      onClick={() => setBuyCurrency('BTC')}
                    >
                      ₿ BTC
                    </button>
                    <button
                      className={`currency-btn ${buyCurrency === 'ETH' ? 'active' : ''}`}
                      onClick={() => setBuyCurrency('ETH')}
                    >
                      Ξ ETH
                    </button>
                    <button
                      className={`currency-btn ${buyCurrency === 'USDT' ? 'active' : ''}`}
                      onClick={() => setBuyCurrency('USDT')}
                    >
                      ₮ USDT
                    </button>
              </div>
            </div>

                <div className="form-group">
                  <label>Amount ({buyCurrency})</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder={`Enter ${buyCurrency} amount`}
                  />
                  <div className="form-hint">
                    Current {buyCurrency} price: ${getCurrentPrice().toLocaleString()}
                  </div>
                </div>

                {buyCalculation && (
                  <div className="calculation-box">
                    <h3>Exchange Summary</h3>
                    <div className="calc-row">
                      <span>You Pay:</span>
                      <span className="calc-value">{buyCalculation.cryptoAmount} {buyCurrency}</span>
                    </div>
                    <div className="calc-row">
                      <span>≈ USD Value:</span>
                      <span className="calc-value">${(buyCalculation.cryptoAmount! * buyCalculation.cryptoPriceUsd!).toFixed(2)}</span>
                    </div>
                    <div className="calc-row">
                      <span>Gold Price:</span>
                      <span className="calc-value">${buyCalculation.goldPricePerGram.toFixed(2)}/g</span>
                    </div>
                    <div className="calc-row">
                      <span>Platform Fee (0.5%):</span>
                      <span className="calc-value">${getBuyFeeUsd().toFixed(2)}</span>
                    </div>
                    <div className="calc-row highlight">
                      <span>You Receive:</span>
                      <span className="calc-value">{(buyCalculation.netAmount ?? 0).toFixed(4)} grams gold</span>
                    </div>
                  </div>
                )}

                <button
                  className="btn-execute"
                  onClick={executeBuy}
                  disabled={loading || !buyCalculation || !buyAmount}
                >
                  {loading ? 'Processing...' : `Buy ${buyCalculation?.netAmount?.toFixed(4) || '0'} g Gold`}
                </button>
              </div>
            </div>
          )}

          {/* Sell Gold Form */}
          {activeTab === 'sell' && (
            <div className="exchange-form">
              <div className="form-card">
                <h2>Sell Digital Gold</h2>
                <p className="form-subtitle">Exchange gold credits for crypto</p>

                <div className="form-group">
                  <label>Receive</label>
                  <div className="currency-selector">
                    <button
                      className={`currency-btn ${sellCurrency === 'BTC' ? 'active' : ''}`}
                      onClick={() => setSellCurrency('BTC')}
                    >
                      ₿ BTC
                    </button>
                    <button
                      className={`currency-btn ${sellCurrency === 'ETH' ? 'active' : ''}`}
                      onClick={() => setSellCurrency('ETH')}
                    >
                      Ξ ETH
                    </button>
                    <button
                      className={`currency-btn ${sellCurrency === 'USDT' ? 'active' : ''}`}
                      onClick={() => setSellCurrency('USDT')}
                    >
                      ₮ USDT
            </button>
          </div>
            </div>

                <div className="form-group">
                  <label>Gold Amount (grams)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={sellGoldAmount}
                    onChange={(e) => setSellGoldAmount(e.target.value)}
                    placeholder="Enter gold amount in grams"
                  />
                  <div className="form-hint">
                    Current gold price: ${goldPrice.toFixed(2)}/gram
          </div>
        </div>

                {sellCalculation && (
                  <div className="calculation-box">
                    <h3>Exchange Summary</h3>
                    <div className="calc-row">
                      <span>You Sell:</span>
                      <span className="calc-value">{sellCalculation.goldGrams} grams gold</span>
                    </div>
                    <div className="calc-row">
                      <span>≈ USD Value:</span>
                      <span className="calc-value">${sellCalculation.goldValueUsd?.toFixed(2)}</span>
                    </div>
                    <div className="calc-row">
                      <span>{sellCurrency} Price:</span>
                      <span className="calc-value">${sellCalculation.cryptoPriceUsd?.toLocaleString()}</span>
                    </div>
                    <div className="calc-row">
                      <span>Platform Fee (0.5%):</span>
                      <span className="calc-value">${getSellFeeUsd().toFixed(2)}</span>
                    </div>
                    <div className="calc-row highlight">
                      <span>You Receive:</span>
                      <span className="calc-value">{(sellCalculation.netAmount ?? 0).toFixed(8)} {sellCurrency}</span>
            </div>
          </div>
                )}

                <button
                  className="btn-execute"
                  onClick={executeSell}
                  disabled={loading || !sellCalculation || !sellGoldAmount}
                >
                  {loading ? 'Processing...' : `Sell for ${sellCalculation?.netAmount?.toFixed(8) || '0'} ${sellCurrency}`}
                </button>
              </div>
          </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .exchange-page {
          display: flex;
          min-height: 100vh;
          background: #1A1A1A;
          color: white;
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
        }

        .logo-text {
          font-size: 1.1rem;
          font-weight: bold;
          color: #FFD700;
        }

        .sidebar-nav {
          padding: 2rem 0;
        }

        .main-content {
          flex: 1;
          margin-left: 250px;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: #2C2C2C;
          padding: 2rem;
          border-bottom: 1px solid #444;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header h1 {
          margin: 0;
          font-size: 1.8rem;
          color: #FFD700;
        }

        .subtitle {
          margin: 0.5rem 0 0;
          color: #999;
        }

        .price-display {
          display: flex;
          gap: 2rem;
        }

        .price-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .price-label {
          font-size: 0.85rem;
          color: #999;
        }

        .price-value {
          font-weight: 700;
          color: #FFD700;
          font-size: 1.1rem;
        }

        .alert {
          margin: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-success {
          background: rgba(0, 200, 83, 0.2);
          border: 1px solid #00C853;
          color: #00C853;
        }

        .alert-error {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid #dc3545;
          color: #dc3545;
        }

        .alert-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .content {
          flex: 1;
          padding: 2rem;
        }

        .tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .tab {
          flex: 1;
          padding: 1rem;
          background: #2C2C2C;
          border: 2px solid #444;
          border-radius: 12px;
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .tab:hover {
          border-color: #FFD700;
        }

        .tab.active {
          background: linear-gradient(135deg, #FFD700, #B8860B);
          color: #000;
          border-color: #FFD700;
        }

        .exchange-form {
          display: flex;
          justify-content: center;
        }

        .form-card {
          background: #2C2C2C;
          border: 1px solid #444;
          border-radius: 16px;
          padding: 2.5rem;
          width: 100%;
          max-width: 600px;
        }

        .form-card h2 {
          margin: 0 0 0.5rem;
          color: #FFD700;
        }

        .form-subtitle {
          color: #999;
          margin: 0 0 2rem;
        }

        .form-group {
          margin-bottom: 2rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 1rem;
          font-weight: 600;
          color: #FFD700;
        }

        .currency-selector {
          display: flex;
          gap: 1rem;
        }

        .currency-btn {
          flex: 1;
          padding: 1rem;
          background: #1A1A1A;
          border: 2px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .currency-btn:hover {
          border-color: #FFD700;
        }

        .currency-btn.active {
          background: #FFD700;
          color: #000;
          border-color: #FFD700;
        }

        .form-input {
          width: 100%;
          padding: 1rem;
          background: #1A1A1A;
          border: 2px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1.1rem;
        }

        .form-input:focus {
          outline: none;
          border-color: #FFD700;
        }

        .form-hint {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: #999;
        }

        .calculation-box {
          background: #1A1A1A;
          border: 1px solid #FFD700;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 2rem 0;
        }

        .calculation-box h3 {
          margin: 0 0 1rem;
          color: #FFD700;
          font-size: 1.1rem;
        }

        .calc-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #333;
        }

        .calc-row:last-child {
          border-bottom: none;
        }

        .calc-row.highlight {
          background: rgba(255, 215, 0, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          margin-top: 0.5rem;
        }

        .calc-row.highlight span {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .calc-value {
          color: #00C853;
          font-weight: 600;
        }

        .btn-execute {
          width: 100%;
          padding: 1.25rem;
          background: linear-gradient(135deg, #00C853, #00A844);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-execute:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 200, 83, 0.4);
        }

        .btn-execute:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #1A1A1A;
          color: white;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #444;
          border-top-color: #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .exchange-page {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
          }

          .main-content {
            margin-left: 0;
          }

          .header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .price-display {
            width: 100%;
            justify-content: space-between;
          }

          .form-card {
            padding: 1.5rem;
          }

          .tabs {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
