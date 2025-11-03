'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto } from '@/lib/formatters';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';

interface User {
  id: number;
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

interface WalletBalance {
  currency: string;
  balance: number;
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
  
  // Wallet Balances
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    checkAuth();
    loadPrices();
    loadBalances();
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

  const logout = () => {
    Cookies.remove('authToken');
    sessionStorage.removeItem('authToken');
    router.push('/login');
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

  const loadBalances = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/wallet/balances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const balances = (response.data || []).map((b: any) => ({
        currency: b.currency,
        balance: parseFloat(b.balance || 0)
      }));
      
      setWalletBalances(balances);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };
  
  const getBalance = (currency: string) => {
    const balance = walletBalances.find(b => b.currency === currency);
    return balance?.balance || 0;
  };

  const getGoldBalance = () => {
    return walletBalances.reduce((sum, b) => sum + (b.currency === 'GOLD' ? b.balance : 0), 0);
  };

  const calculateBuy = () => {
    const amount = parseFloat(buyAmount || '0');
    if (!amount || amount <= 0 || goldPrice <= 0) {
      setBuyCalculation(null);
      return;
    }

    // Resolve crypto price based on selected currency
    const cryptoPriceUsd = buyCurrency === 'BTC' ? btcPrice : buyCurrency === 'ETH' ? ethPrice : usdtPrice;
    if (!cryptoPriceUsd || cryptoPriceUsd <= 0) {
      setBuyCalculation(null);
      return;
    }

    // Calculate USD value and gold grams
    const cryptoValueUsd = amount * cryptoPriceUsd;
    const goldGrams = cryptoValueUsd / goldPrice;

    // Fee (0.5%) displayed in USD
    const feeRate = 0.005;
    const feeUsd = cryptoValueUsd * feeRate;
    const netGoldGrams = goldGrams * (1 - feeRate);

    setBuyCalculation({
      cryptoCurrency: buyCurrency,
      cryptoAmount: amount,
      cryptoPriceUsd,
      goldPricePerGram: goldPrice,
      goldGrams: netGoldGrams,
      goldValueUsd: cryptoValueUsd,
      fee: feeUsd,
      netAmount: netGoldGrams
    });
  };
  
  const calculateSell = () => {
    const grams = parseFloat(sellGoldAmount || '0');
    if (!grams || grams <= 0 || goldPrice <= 0) {
      setSellCalculation(null);
      return;
    }

    // Resolve crypto price based on selected currency
    const cryptoPriceUsd = sellCurrency === 'BTC' ? btcPrice : sellCurrency === 'ETH' ? ethPrice : usdtPrice;
    if (!cryptoPriceUsd || cryptoPriceUsd <= 0) {
      setSellCalculation(null);
      return;
    }

    // Calculate USD value and crypto received
    const goldValueUsd = grams * goldPrice;
    const cryptoAmount = goldValueUsd / cryptoPriceUsd;

    // Fee (0.5%) displayed in USD and deducted in crypto
    const feeRate = 0.005;
    const feeUsd = goldValueUsd * feeRate;
    const netCryptoAmount = cryptoAmount * (1 - feeRate);

    setSellCalculation({
      cryptoCurrency: sellCurrency,
      cryptoAmount: netCryptoAmount,
      cryptoPriceUsd,
      goldPricePerGram: goldPrice,
      goldGrams: grams,
      goldValueUsd,
      fee: feeUsd,
      netAmount: netCryptoAmount
    });
  };
  
  const executeBuy = async () => {
    if (!buyCalculation) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.post('/api/gold-exchange/crypto-to-gold', {
        cryptoCurrency: buyCurrency,
        cryptoAmount: parseFloat(buyAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Gold purchase successful! Your gold has been added to your holdings.' });
      setBuyAmount('');
      setBuyCalculation(null);
      loadPrices();
      loadBalances();
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Purchase failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  const executeSell = async () => {
    if (!sellCalculation) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.post('/api/gold-exchange/gold-to-crypto', {
        cryptoCurrency: sellCurrency,
        goldGrams: parseFloat(sellGoldAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Gold sale successful! Your crypto has been added to your wallet.' });
      setSellGoldAmount('');
      setSellCalculation(null);
      loadPrices();
      loadBalances();
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Sale failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateBuy();
  }, [buyAmount, buyCurrency, goldPrice, btcPrice, ethPrice, usdtPrice]);

  useEffect(() => {
    calculateSell();
  }, [sellGoldAmount, sellCurrency, goldPrice, btcPrice, ethPrice, usdtPrice]);

  const currencyOptions = [
    { symbol: 'BTC', name: 'Bitcoin', color: 'orange', icon: '₿', price: btcPrice },
    { symbol: 'ETH', name: 'Ethereum', color: 'blue', icon: 'Ξ', price: ethPrice },
    { symbol: 'USDT', name: 'Tether', color: 'green', icon: '₮', price: usdtPrice }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Navbar Component */}
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gold Exchange</h1>
              <p className="mt-2 text-gray-600">Trade cryptocurrency for gold and vice versa</p>
            </div>
          </div>
        </div>

        {/* Price Display */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Gold Price */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 mb-1">Gold Price</p>
                <p className="text-2xl font-bold text-yellow-900">{formatCurrency(goldPrice)}/g</p>
              </div>
              <div className="h-12 w-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Crypto Prices */}
          {currencyOptions.map((currency) => {
            const getColorClasses = (color: string) => {
              switch (color) {
                case 'orange':
                  return {
                    gradient: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
                    text: 'text-orange-900',
                    bg: 'bg-orange-200',
                    icon: 'text-orange-700'
                  };
                case 'blue':
                  return {
                    gradient: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
                    text: 'text-blue-900',
                    bg: 'bg-blue-200',
                    icon: 'text-blue-700'
                  };
                case 'green':
                  return {
                    gradient: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
                    text: 'text-green-900',
                    bg: 'bg-green-200',
                    icon: 'text-green-700'
                  };
                default:
                  return {
                    gradient: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
                    text: 'text-gray-900',
                    bg: 'bg-gray-200',
                    icon: 'text-gray-700'
                  };
              }
            };
            const colors = getColorClasses(currency.color);
            return (
              <div key={currency.symbol} className={`${colors.gradient} border rounded-xl p-6 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">{currency.name}</p>
                    <p className={`text-2xl font-bold ${colors.text}`}>
                      {formatCurrency(currency.price)}
                    </p>
                  </div>
                  <div className={`h-12 w-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
                    <span className={`${colors.icon} font-bold text-xl`}>{currency.icon}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 rounded-xl p-4 border shadow-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Gold Card */}
          <div className={`bg-white border-2 rounded-2xl shadow-lg overflow-hidden transition-all ${
            activeTab === 'buy' ? 'border-green-300 shadow-green-100' : 'border-gray-200'
          }`}>
            {/* Card Header */}
            <div className={`bg-gradient-to-r ${activeTab === 'buy' ? 'from-green-500 to-green-600' : 'from-gray-100 to-gray-200'} px-6 py-5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${activeTab === 'buy' ? 'bg-white/20' : 'bg-gray-300'}`}>
                    <svg className={`h-6 w-6 ${activeTab === 'buy' ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${activeTab === 'buy' ? 'text-white' : 'text-gray-900'}`}>Buy Gold</h2>
                    <p className={`text-sm ${activeTab === 'buy' ? 'text-green-50' : 'text-gray-600'}`}>Trade crypto for gold</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('buy')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'buy'
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Select
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-6">
              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Pay with</label>
                <div className="grid grid-cols-3 gap-3">
                  {currencyOptions.map((currency) => {
                    const balance = getBalance(currency.symbol);
                    const isSelected = buyCurrency === currency.symbol;
                    const getCurrencyClasses = (color: string, isSelected: boolean) => {
                      if (!isSelected) {
                        return 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300';
                      }
                      switch (color) {
                        case 'orange':
                          return 'bg-orange-100 text-orange-700 border-2 border-orange-500 shadow-sm';
                        case 'blue':
                          return 'bg-blue-100 text-blue-700 border-2 border-blue-500 shadow-sm';
                        case 'green':
                          return 'bg-green-100 text-green-700 border-2 border-green-500 shadow-sm';
                        default:
                          return 'bg-gray-100 text-gray-700 border-2 border-gray-500 shadow-sm';
                      }
                    };
                    return (
                      <button
                        key={currency.symbol}
                        onClick={() => setBuyCurrency(currency.symbol)}
                        className={`relative px-4 py-4 rounded-xl font-medium transition-all ${getCurrencyClasses(currency.color, isSelected)}`}
                      >
                        <div className="text-lg font-bold">{currency.symbol}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCrypto(balance, currency.symbol)}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Amount ({buyCurrency})</label>
                  <button
                    onClick={() => {
                      const balance = getBalance(buyCurrency);
                      setBuyAmount(balance.toString());
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Use Max
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00000001"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-full px-4 py-4 text-lg font-semibold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="0.00000000"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 font-medium">
                    {buyCurrency}
                  </div>
                </div>
              </div>

              {/* Calculation Preview */}
              {buyCalculation && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-xs font-medium text-green-700 mb-1">You will receive</p>
                    <p className="text-3xl font-bold text-green-900">
                      {formatNumber(buyCalculation.goldGrams || 0, 6)} g
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      ≈ {formatCurrency(buyCalculation.goldValueUsd || 0)}
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">You pay</span>
                      <span className="text-sm font-semibold text-green-900">
                        {formatCrypto(buyCalculation.cryptoAmount || 0, buyCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Exchange rate</span>
                      <span className="text-sm font-semibold text-green-900">
                        {formatCurrency(buyCalculation.cryptoPriceUsd || 0)}/{buyCurrency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Fee (0.5%)</span>
                      <span className="text-sm font-semibold text-green-900">
                        {formatCurrency(buyCalculation.fee || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={executeBuy}
                disabled={!buyCalculation || loading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all shadow-lg ${
                  buyCalculation && !loading
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:scale-[1.02]'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Buy Gold'
                )}
              </button>
            </div>
          </div>

          {/* Sell Gold Card */}
          <div className={`bg-white border-2 rounded-2xl shadow-lg overflow-hidden transition-all ${
            activeTab === 'sell' ? 'border-red-300 shadow-red-100' : 'border-gray-200'
          }`}>
            {/* Card Header */}
            <div className={`bg-gradient-to-r ${activeTab === 'sell' ? 'from-red-500 to-red-600' : 'from-gray-100 to-gray-200'} px-6 py-5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${activeTab === 'sell' ? 'bg-white/20' : 'bg-gray-300'}`}>
                    <svg className={`h-6 w-6 ${activeTab === 'sell' ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${activeTab === 'sell' ? 'text-white' : 'text-gray-900'}`}>Sell Gold</h2>
                    <p className={`text-sm ${activeTab === 'sell' ? 'text-red-50' : 'text-gray-600'}`}>Trade gold for crypto</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('sell')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'sell'
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Select
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-6">
              {/* Gold Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Gold Amount (grams)</label>
                  <span className="text-xs text-gray-500">
                    Balance: {formatNumber(getGoldBalance(), 4)} g
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    value={sellGoldAmount}
                    onChange={(e) => setSellGoldAmount(e.target.value)}
                    className="w-full px-4 py-4 text-lg font-semibold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    placeholder="0.0000"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 font-medium">
                    g
                  </div>
                </div>
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Receive in</label>
                <div className="grid grid-cols-3 gap-3">
                  {currencyOptions.map((currency) => {
                    const isSelected = sellCurrency === currency.symbol;
                    const getCurrencyClasses = (color: string, isSelected: boolean) => {
                      if (!isSelected) {
                        return 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300';
                      }
                      switch (color) {
                        case 'orange':
                          return 'bg-orange-100 text-orange-700 border-2 border-orange-500 shadow-sm';
                        case 'blue':
                          return 'bg-blue-100 text-blue-700 border-2 border-blue-500 shadow-sm';
                        case 'green':
                          return 'bg-green-100 text-green-700 border-2 border-green-500 shadow-sm';
                        default:
                          return 'bg-gray-100 text-gray-700 border-2 border-gray-500 shadow-sm';
                      }
                    };
                    return (
                      <button
                        key={currency.symbol}
                        onClick={() => setSellCurrency(currency.symbol)}
                        className={`relative px-4 py-4 rounded-xl font-medium transition-all ${getCurrencyClasses(currency.color, isSelected)}`}
                      >
                        <div className="text-lg font-bold">{currency.symbol}</div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculation Preview */}
              {sellCalculation && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6 space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-xs font-medium text-red-700 mb-1">You will receive</p>
                    <p className="text-3xl font-bold text-red-900">
                      {formatCrypto(sellCalculation.netAmount || 0, sellCurrency)}
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      ≈ {formatCurrency(sellCalculation.goldValueUsd || 0)}
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-red-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-700">You sell</span>
                      <span className="text-sm font-semibold text-red-900">
                        {formatNumber(sellCalculation.goldGrams || 0, 6)} g
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-700">Exchange rate</span>
                      <span className="text-sm font-semibold text-red-900">
                        {formatCurrency(sellCalculation.cryptoPriceUsd || 0)}/{sellCurrency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-700">Fee (0.5%)</span>
                      <span className="text-sm font-semibold text-red-900">
                        {formatCurrency(sellCalculation.fee || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sell Button */}
              <button
                onClick={executeSell}
                disabled={!sellCalculation || loading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all shadow-lg ${
                  sellCalculation && !loading
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-xl transform hover:scale-[1.02]'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Sell Gold'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
