'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  amount: number | string;
  destinationAddress: string;
}

interface WithdrawalRequestHistory {
  id: number;
  currency: string;
  amount: number;
  destinationAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  adminNotes?: string;
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState('external');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalRequest>({
    currency: 'BTC',
    amount: '',
    destinationAddress: ''
  });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequestHistory[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadWalletData();
    loadWithdrawalHistory();
  }, []);

  // Recalculate total balance when prices or balances change
  useEffect(() => {
    if (walletBalances.length > 0 && Object.keys(cryptoPrices).length > 0) {
      const total = getTotalBalance();
      console.log('Recalculated total balance:', total);
    }
  }, [walletBalances, cryptoPrices]);

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

      // Load wallet balances - use same endpoint as main dashboard
      const walletResponse = await api.get('/api/wallet/balances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Wallet API Response:', walletResponse.data);
      const balances = walletResponse.data || [];
      
      // If no balances from API, use sample data
      if (balances.length === 0) {
        console.log('No balances from API, using sample data');
        const sampleBalances = [
          {
            currency: 'BTC',
            balance: 0.001234,
            symbol: '₿',
            valueUsd: 55.50,
            address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            change24h: 2.5
          },
          {
            currency: 'ETH',
            balance: 0.025600,
            symbol: 'Ξ',
            valueUsd: 99.11,
            address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            change24h: -1.2
          },
          {
            currency: 'USDT',
            balance: 7.000000,
            symbol: '₮',
            valueUsd: 7.00,
            address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            change24h: 0.0
          }
        ];
        setWalletBalances(sampleBalances);
      } else {
        // Transform the data to match the expected format
        const transformedBalances = balances.map((balance: any) => ({
          currency: balance.currency,
          balance: parseFloat(balance.balance) || 0,
          symbol: balance.currency === 'BTC' ? '₿' : balance.currency === 'ETH' ? 'Ξ' : '₮',
          valueUsd: parseFloat(balance.valueUsd) || 0,
          address: balance.address || '',
          change24h: 0
        }));
        console.log('Transformed balances:', transformedBalances);
        setWalletBalances(transformedBalances);
      }

      // Load crypto prices for asset cards
      const pricesResponse = await api.get('/api/prices/crypto');
      console.log('Crypto Prices Response:', pricesResponse.data);
      const cryptoPrices = pricesResponse.data || {};
      
      // If no prices from API, use sample prices
      if (!cryptoPrices.BTC && !cryptoPrices.ETH && !cryptoPrices.USDT) {
        console.log('No crypto prices from API, using sample prices');
        const samplePrices = {
          BTC: 45000,
          ETH: 3000,
          USDT: 1
        };
        setCryptoPrices(samplePrices);
      } else {
        setCryptoPrices(cryptoPrices);
      }
      
      // Transform to asset format
      const assets = [
        {
          symbol: 'USDT',
          name: 'Tether',
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
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: cryptoPrices.ETH ?? 2000,
          change24h: 0,
          changePercent: 0,
          icon: 'Ξ'
        }
      ];
      setCryptoAssets(assets);

      // Load transactions
      const transactionsResponse = await api.get('/api/wallet/transactions?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawTransactions = transactionsResponse.data || [];
      
      // Transform transactions or use sample data
      let formattedTransactions;
      if (rawTransactions.length === 0) {
        // Sample transaction data for demo
        formattedTransactions = [
        {
          id: '1',
            date: new Date(Date.now() - 86400000).toLocaleString(),
            type: 'Deposit',
            amount: '0.001234 BTC',
            status: 'completed',
            result: 'Success',
            timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
            date: new Date(Date.now() - 172800000).toLocaleString(),
            type: 'Deposit',
            amount: '0.025600 ETH',
            status: 'completed',
            result: 'Success',
            timestamp: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: '3',
            date: new Date(Date.now() - 259200000).toLocaleString(),
            type: 'Deposit',
            amount: '7.000000 USDT',
            status: 'completed',
            result: 'Success',
            timestamp: new Date(Date.now() - 259200000).toISOString()
          }
        ];
      } else {
        formattedTransactions = rawTransactions.map((tx: any, index: number) => ({
          id: tx.id || index.toString(),
          date: new Date(tx.createdAt || Date.now()).toLocaleString(),
          type: tx.type || 'Transfer',
          amount: `${tx.amount ?? 0}`,
          status: tx.status || 'pending',
          result: tx.status === 'completed' ? 'Success' : 'Pending',
          timestamp: tx.createdAt || new Date().toISOString()
        }));
      }
      
      setTransactions(formattedTransactions);

    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawalHistory = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/withdrawals/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawalHistory(response.data.data || []);
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
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


  const handleWithdraw = () => {
    setShowWithdrawModal(true);
    setWithdrawalMessage(null);
  };

  const submitWithdrawal = async () => {
    setWithdrawalLoading(true);
    setWithdrawalMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/withdrawals/request', {
        currency: withdrawalForm.currency,
        amount: parseFloat(withdrawalForm.amount.toString()) || 0,
        destinationAddress: withdrawalForm.destinationAddress
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setWithdrawalMessage({
        type: 'success',
        text: response.data.message || 'Withdrawal request submitted successfully! Your request is pending admin approval.'
      });

      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawalForm({ currency: 'BTC', amount: '', destinationAddress: '' });
        loadWalletData();
        loadWithdrawalHistory();
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getTotalBalance = () => {
    return walletBalances.reduce((total, balance) => {
      const price = cryptoPrices[balance.currency] || 0;
      const usdValue = balance.balance * price;
      console.log(`${balance.currency}: ${balance.balance} * ${price} = ${usdValue}`);
      return total + usdValue;
    }, 0);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">UOB</span>
          </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">UOB Security House</h1>
                  <p className="text-xs text-gray-500">Track Platform</p>
                </div>
              </Link>
        </div>
        
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Dashboard
          </Link>
              <Link href="/wallet" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                Wallet
          </Link>
              <Link href="/skrs" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                SKRs
          </Link>
              <Link href="/transactions" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Transactions
          </Link>
              <Link href="/exchange" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Exchange
          </Link>
      </div>

            {/* User Profile */}
            <div className="relative user-profile">
              <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 text-sm"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{user?.fullName?.charAt(0) || 'U'}</span>
                </div>
                <span className="text-gray-700">{user?.fullName || 'User'}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
          <p className="text-gray-600 mt-2">Manage your cryptocurrency balances and transactions</p>
            </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Balance Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">${getTotalBalance().toFixed(2)}</p>
                  </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Individual Balances */}
          {walletBalances.map((balance) => (
            <div key={balance.currency} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{balance.currency}</p>
                  <p className="text-xl font-bold text-gray-900">{balance.balance.toFixed(6)}</p>
                  <p className="text-sm text-gray-500">${((balance.balance * (cryptoPrices[balance.currency] || 0))).toFixed(2)}</p>
            </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">{balance.symbol}</span>
                </div>
              </div>
            </div>
          ))}
          </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
                <button 
            onClick={handleWithdraw}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
            </svg>
            <span>Withdraw</span>
                </button>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <div className="flex space-x-1">
                <button 
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    activeTab === 'external' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('external')}
                >
                  External
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    activeTab === 'withdrawals' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('withdrawals')}
                >
                  Withdrawals
                </button>
              </div>
            </div>
            </div>
            
          <div className="p-6">
            {activeTab === 'withdrawals' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {withdrawalHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No withdrawal requests found
                        </td>
                      </tr>
                    ) : (
                      withdrawalHistory.map((withdrawal) => (
                        <tr key={withdrawal.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(withdrawal.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {withdrawal.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {withdrawal.amount}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {withdrawal.destinationAddress}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              withdrawal.status === 'completed' ? 'bg-green-100 text-green-800' :
                              withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              withdrawal.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {withdrawal.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {withdrawal.transactionHash ? (
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${withdrawal.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {withdrawal.transactionHash.slice(0, 10)}...
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {transaction.status}
                        </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.result === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {transaction.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
        </div>
      </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Withdraw Cryptocurrency</h3>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select 
                      value={withdrawalForm.currency}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, currency: e.target.value as 'BTC' | 'ETH' | 'USDT' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="USDT">Tether (USDT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      value={withdrawalForm.amount}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                      placeholder="Enter amount (e.g., 0.123)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {walletBalances.find(w => w.currency === withdrawalForm.currency)?.balance || 0} {withdrawalForm.currency}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination Address</label>
                    <input 
                      type="text"
                      value={withdrawalForm.destinationAddress}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, destinationAddress: e.target.value })}
                      placeholder="Enter recipient wallet address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {withdrawalMessage && (
                    <div className={`p-3 rounded-md ${
                      withdrawalMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {withdrawalMessage.text}
                    </div>
                  )}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Withdrawals require admin approval. A 0.5% fee will be deducted.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitWithdrawal}
                    disabled={withdrawalLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {withdrawalLoading ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}