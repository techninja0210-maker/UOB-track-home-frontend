'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto, formatCompact } from '@/lib/formatters';
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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
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
  
  const calculateBuy = async () => {
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

    setBuyCalculation({
      cryptoCurrency: buyCurrency,
      cryptoAmount: amount,
      cryptoPriceUsd,
      goldPricePerGram: goldPrice,
      goldGrams,
      goldValueUsd: cryptoValueUsd,
      fee: feeUsd,
      netAmount: cryptoValueUsd - feeUsd
    });
  };
  
  const calculateSell = async () => {
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
    
    setMessage(null);
    
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/gold-exchange/crypto-to-gold', {
        cryptoCurrency: buyCurrency,
        cryptoAmount: parseFloat(buyAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Gold purchase successful!' });
      setBuyAmount('');
      setBuyCalculation(null);
      loadPrices(); // Refresh prices
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Purchase failed' });
    }
  };
  
  const executeSell = async () => {
    if (!sellCalculation) return;
    
    setMessage(null);
    
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/gold-exchange/gold-to-crypto', {
        cryptoCurrency: sellCurrency,
        goldGrams: parseFloat(sellGoldAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Gold sale successful!' });
      setSellGoldAmount('');
      setSellCalculation(null);
      loadPrices(); // Refresh prices
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Sale failed' });
    }
  };

  const getBuyFeeUsd = () => {
    return buyCalculation?.fee || 0;
  };

  const getSellFeeUsd = () => {
    return sellCalculation?.fee || 0;
  };

  useEffect(() => {
    calculateBuy();
  }, [buyAmount, buyCurrency]);

  useEffect(() => {
    calculateSell();
  }, [sellGoldAmount, sellCurrency]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <Image
                  src="/UOB_logo.png"
                  alt="UOB Security House"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-contain"
                  priority
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">UOB Security House</h1>
                  <p className="text-xs text-gray-500">Secure Gold Trading</p>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
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
              <Link href="/exchange" className="text-sm font-medium text-primary-600 border-b-2 border-primary-600 pb-1">
                Exchange
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
                      onClick={logout}
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
            <Link href="/" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
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
            <Link href="/exchange" className="block px-3 py-2 text-sm font-medium bg-primary-50 text-primary-600 rounded-lg">
              Exchange
            </Link>
          </div>
        </div>
        </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Gold Exchange</h2>
          <p className="mt-2 text-gray-600">Trade cryptocurrency for gold and vice versa</p>
      </div>

        {/* Price Display */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gold Price</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(goldPrice)}/g</p>
              </div>
              <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-xl">🥇</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bitcoin</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(btcPrice)}</p>
              </div>
              <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-bold">₿</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ethereum</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(ethPrice)}</p>
                </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold">Ξ</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">USDT</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(usdtPrice)}</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">₮</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Buy Gold Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center space-x-2 mb-6">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Buy Gold</h3>
            </div>

            <div className="space-y-4">
              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pay with</label>
                <div className="grid grid-cols-3 gap-2">
                  {['BTC', 'ETH', 'USDT'].map((currency) => (
                    <button
                      key={currency}
                      onClick={() => setBuyCurrency(currency)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        buyCurrency === currency
                          ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount ({buyCurrency})</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00000000"
                />
              </div>

              {/* Calculation Preview */}
              {buyCalculation && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You pay:</span>
                    <span className="font-medium">{formatCrypto(buyCalculation.cryptoAmount || 0, buyCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gold received:</span>
                    <span className="font-medium">{formatNumber(buyCalculation.goldGrams || 0, 4)} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-medium">{formatCurrency(getBuyFeeUsd())}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total value:</span>
                    <span>{formatCurrency(buyCalculation.goldValueUsd || 0)}</span>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={executeBuy}
                disabled={!buyCalculation || loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Processing...' : 'Buy Gold'}
              </button>
            </div>
          </div>

          {/* Sell Gold Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center space-x-2 mb-6">
              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sell Gold</h3>
            </div>

            <div className="space-y-4">
              {/* Gold Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gold Amount (grams)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={sellGoldAmount}
                  onChange={(e) => setSellGoldAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.0000"
                />
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Receive in</label>
                <div className="grid grid-cols-3 gap-2">
                  {['BTC', 'ETH', 'USDT'].map((currency) => (
                    <button
                      key={currency}
                      onClick={() => setSellCurrency(currency)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        sellCurrency === currency
                          ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculation Preview */}
              {sellCalculation && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You sell:</span>
                    <span className="font-medium">{formatNumber(sellCalculation.goldGrams || 0, 4)} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You receive:</span>
                    <span className="font-medium">{formatCrypto(sellCalculation.netAmount || 0, sellCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-medium">{formatCurrency(getSellFeeUsd())}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total value:</span>
                    <span>{formatCurrency(sellCalculation.goldValueUsd || 0)}</span>
                  </div>
                </div>
              )}

              {/* Sell Button */}
              <button
                onClick={executeSell}
                disabled={!sellCalculation || loading}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Processing...' : 'Sell Gold'}
              </button>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}