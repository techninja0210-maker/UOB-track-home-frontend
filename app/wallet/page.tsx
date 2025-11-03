'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto, formatCompact } from '@/lib/formatters';
import Navbar from '@/components/Navbar';
import Image from 'next/image';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCurrency, setDepositCurrency] = useState<'BTC' | 'ETH' | 'USDT'>('BTC');
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalRequest>({
    currency: 'BTC',
    amount: '',
    destinationAddress: ''
  });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequestHistory[]>([]);
  const [depositAddresses, setDepositAddresses] = useState<{[key: string]: string}>({});
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadWalletData();
    loadWithdrawalHistory();
  }, []);

  useEffect(() => {
    if (walletBalances.length > 0 && Object.keys(cryptoPrices).length > 0) {
      getTotalBalance();
    }
  }, [walletBalances, cryptoPrices]);

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
      setLoading(true);
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');

      const walletResponse = await api.get('/api/wallet/balances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const balances = walletResponse.data || [];
      
      const transformedBalances = balances.map((balance: any) => ({
        currency: balance.currency,
        balance: parseFloat(balance.balance) || 0,
        symbol: balance.currency === 'BTC' ? '₿' : balance.currency === 'ETH' ? 'Ξ' : '₮',
        valueUsd: parseFloat(balance.valueUsd) || 0,
        address: balance.address || '',
        change24h: 0
      }));
      
      const currencyMap: {[key: string]: any} = {
        'BTC': { currency: 'BTC', balance: 0, symbol: '₿', valueUsd: 0, address: '', change24h: 0 },
        'ETH': { currency: 'ETH', balance: 0, symbol: 'Ξ', valueUsd: 0, address: '', change24h: 0 },
        'USDT': { currency: 'USDT', balance: 0, symbol: '₮', valueUsd: 0, address: '', change24h: 0 }
      };
      
      transformedBalances.forEach((b: WalletBalance) => {
        currencyMap[b.currency] = b;
      });
      
      setWalletBalances([currencyMap['BTC'], currencyMap['ETH'], currencyMap['USDT']]);

      const pricesResponse = await api.get('/api/prices/crypto');
      const cryptoPrices = pricesResponse.data || {};
      
      setCryptoPrices({
        BTC: cryptoPrices.BTC || 0,
        ETH: cryptoPrices.ETH || 0,
        USDT: cryptoPrices.USDT || 1
      });

      const transactionsResponse = await api.get('/api/wallet/transactions?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawTransactions = transactionsResponse.data || [];
      
      const formattedTransactions = rawTransactions.map((tx: any, index: number) => ({
        id: tx.id || index.toString(),
        date: new Date(tx.createdAt || Date.now()).toLocaleString(),
        type: tx.type || 'Transfer',
        amount: `${tx.amount ?? 0} ${tx.currency || ''}`,
        status: tx.status || 'pending',
        result: tx.status === 'completed' ? 'Success' : 'Pending',
        timestamp: tx.createdAt || new Date().toISOString()
      }));
      
      setTransactions(formattedTransactions);

      // Load deposit addresses
      await loadDepositAddresses();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepositAddresses = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const addresses: {[key: string]: string} = {};
      
      for (const currency of ['BTC', 'ETH', 'USDT']) {
        try {
          const response = await api.get(`/api/wallet/pool-address/${currency}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          addresses[currency] = response.data.address;
        } catch (error) {
          console.error(`Error loading ${currency} address:`, error);
        }
      }
      
      setDepositAddresses(addresses);
    } catch (error) {
      console.error('Error loading deposit addresses:', error);
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

  const handleDeposit = (currency: 'BTC' | 'ETH' | 'USDT') => {
    setDepositCurrency(currency);
    setShowDepositModal(true);
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
        text: response.data.message || 'Withdrawal request submitted successfully!'
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
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getTotalBalance = () => {
    return walletBalances.reduce((total, balance) => {
      const price = cryptoPrices[balance.currency] || 0;
      return total + (balance.balance * price);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Navbar Component */}
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section - Modern Design */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-lg text-gray-500">Manage your cryptocurrency assets</p>
        </div>

        {/* Total Portfolio Card - Prominent */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-blue-100 uppercase tracking-wide mb-2">Total Portfolio Value</p>
                <p className="text-5xl font-bold text-white mb-2">{formatCurrency(getTotalBalance())}</p>
                <p className="text-blue-100 text-sm">Live prices • Updated {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>

            {/* Quick Actions - Modern Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleDeposit('BTC');
                }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-sm">Deposit</p>
                  <p className="text-blue-100 text-xs">Add funds</p>
                </div>
              </Link>
              <button
                onClick={handleWithdraw}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-sm">Withdraw</p>
                  <p className="text-blue-100 text-xs">Send funds</p>
                </div>
              </button>
              <Link
                href="/exchange"
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-sm">Exchange</p>
                  <p className="text-blue-100 text-xs">Trade assets</p>
                </div>
              </Link>
              <Link
                href="/transactions"
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-sm">History</p>
                  <p className="text-blue-100 text-xs">View all</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Assets Section - Modern Card Design */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Assets</h2>
              <p className="text-gray-500 text-sm">Manage your cryptocurrency holdings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {walletBalances.map((balance) => {
              const usdValue = balance.balance * (cryptoPrices[balance.currency] || 0);
              const hasBalance = balance.balance > 0;
              
              return (
                <div
                  key={balance.currency}
                  className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${
                    hasBalance ? 'border-gray-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Currency Icon */}
                      <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${
                        balance.currency === 'BTC' ? 'bg-orange-50' :
                        balance.currency === 'ETH' ? 'bg-blue-50' :
                        'bg-green-50'
                      }`}>
                        <span className={`text-2xl font-bold ${
                          balance.currency === 'BTC' ? 'text-orange-600' :
                          balance.currency === 'ETH' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {balance.symbol}
                        </span>
                      </div>

                      {/* Currency Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{balance.currency}</h3>
                          <span className="text-sm text-gray-500">
                            {balance.currency === 'BTC' ? 'Bitcoin' :
                             balance.currency === 'ETH' ? 'Ethereum' :
                             'Tether'}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Balance</p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatCrypto(balance.balance)} {balance.currency}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">USD Value</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(usdValue)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeposit(balance.currency as 'BTC' | 'ETH' | 'USDT')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm hover:shadow-md"
                      >
                        Deposit
                      </button>
                      {hasBalance && (
                        <button
                          onClick={() => {
                            setWithdrawalForm({ ...withdrawalForm, currency: balance.currency });
                            handleWithdraw();
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-semibold"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transactions Section - Modern Table */}
        <div className="mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Transaction History</h2>
                  <p className="text-sm text-gray-500">All your deposits and withdrawals</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      activeTab === 'transactions'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Transactions
                  </button>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      activeTab === 'withdrawals'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Withdrawals
                  </button>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6">
              {activeTab === 'withdrawals' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Currency</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {withdrawalHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
                                </svg>
                              </div>
                              <p className="text-gray-500 font-medium">No withdrawal requests</p>
                              <p className="text-sm text-gray-400 mt-1">Your withdrawal history will appear here</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        withdrawalHistory.map((withdrawal) => (
                          <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(withdrawal.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-800">
                                {withdrawal.currency}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCrypto(withdrawal.amount)} {withdrawal.currency}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                              <code className="font-mono text-xs bg-gray-50 px-2 py-1 rounded break-all">
                                {withdrawal.destinationAddress}
                              </code>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                withdrawal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                withdrawal.status === 'rejected' || withdrawal.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {withdrawal.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {withdrawal.transactionHash ? (
                                <a 
                                  href={`https://sepolia.etherscan.io/tx/${withdrawal.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                                >
                                  View
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
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
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <p className="text-gray-500 font-medium">No transactions yet</p>
                              <p className="text-sm text-gray-400 mt-1">Your transaction history will appear here</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(transaction.timestamp).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${
                                transaction.type === 'deposit' ? 'bg-green-100 text-green-700' :
                                transaction.type === 'withdrawal' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {transaction.amount}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                transaction.result === 'Success' ? 'bg-green-100 text-green-700' : 
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {transaction.result}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal - Modern Design */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Deposit {depositCurrency}</h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {depositAddresses[depositCurrency] ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-block p-4 bg-gray-50 rounded-xl mb-4">
                      <img
                        alt={`${depositCurrency} Deposit QR`}
                        className="h-48 w-48 rounded-lg bg-white border mx-auto"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${
                          depositCurrency === 'BTC' ? 'bitcoin:' : ''
                        }${encodeURIComponent(depositAddresses[depositCurrency])}`}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Scan QR code or copy address below</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Deposit Address</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 break-all">
                        {depositAddresses[depositCurrency]}
                      </code>
                      <button
                        onClick={() => copyToClipboard(depositAddresses[depositCurrency])}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Important:</strong> Send only {depositCurrency} to this address. Sending other cryptocurrencies may result in permanent loss.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">Loading deposit address...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal - Modern Design */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Withdraw Cryptocurrency</h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                  <select 
                    value={withdrawalForm.currency}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, currency: e.target.value as 'BTC' | 'ETH' | 'USDT' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  >
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="USDT">Tether (USDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                  <input 
                    type="number"
                    step="any"
                    min="0"
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Available: <span className="font-semibold">
                      {formatCrypto(walletBalances.find(w => w.currency === withdrawalForm.currency)?.balance || 0)} {withdrawalForm.currency}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Destination Address</label>
                  <input 
                    type="text"
                    value={withdrawalForm.destinationAddress}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, destinationAddress: e.target.value })}
                    placeholder="Enter recipient wallet address"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>
                {withdrawalMessage && (
                  <div className={`p-4 rounded-xl border ${
                    withdrawalMessage.type === 'success' 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{withdrawalMessage.text}</p>
                  </div>
                )}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Withdrawals require admin approval. A 0.5% fee will be deducted.
                  </p>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submitWithdrawal}
                  disabled={withdrawalLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold shadow-sm hover:shadow-md"
                >
                  {withdrawalLoading ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
