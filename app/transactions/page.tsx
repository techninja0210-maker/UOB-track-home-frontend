'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto } from '@/lib/formatters';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'buy_gold' | 'sell_gold' | 'exchange';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  description: string;
  transactionHash?: string;
  fee?: number;
}

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadTransactions();
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

  const loadTransactions = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📋 Raw transaction data:', response.data);
      
      // Transform the data to match our interface
      const transformedTransactions: Transaction[] = (response.data || []).map((tx: any) => ({
        id: tx.id || `tx-${Math.random().toString(36).substr(2, 9)}`,
        type: tx.type || 'deposit',
        amount: tx.amount || 0,
        currency: tx.currency || 'ETH',
        status: tx.status || 'completed',
        timestamp: tx.timestamp || new Date().toISOString(),
        description: tx.description || (tx.type === 'buy_gold' && tx.goldGrams ? `Bought ${tx.goldGrams} g gold` : (tx.type === 'sell_gold' && tx.goldGrams ? `Sold ${tx.goldGrams} g gold` : `${tx.type} transaction`)),
        transactionHash: tx.transactionHash,
        fee: 0 // No fee data in current system
      }));
      
      console.log('📋 Transformed transactions:', transformedTransactions);
      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Set empty array if API fails - no more mock data
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      if (token) {
      await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const downloadTransactionsPDF = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/exports/transactions/pdf', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Create blob from response data
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_report_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const downloadTransactionsCSV = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/exports/transactions/csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Create blob from response data
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download CSV');
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return (
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'withdrawal':
        return (
          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'buy_gold':
        return (
          <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-yellow-600 text-sm">🥇</span>
          </div>
        );
      case 'sell_gold':
        return (
          <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-orange-600 text-sm">💰</span>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
              <Link href="/skrs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                SKRs
          </Link>
              <Link href="/transactions" className="text-sm font-medium text-primary-600 border-b-2 border-primary-600 pb-1">
                Transactions
          </Link>
              <Link href="/exchange" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
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
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/profile" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Profile Settings
                    </Link>
                    <Link href="/settings" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Account Settings
                    </Link>
                  </div>
                  <div className="border-t border-gray-200 py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign out
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
            <Link href="/skrs" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              SKRs
            </Link>
            <Link href="/transactions" className="block px-3 py-2 text-sm font-medium bg-primary-50 text-primary-600 rounded-lg">
              Transactions
            </Link>
            <Link href="/exchange" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Exchange
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Transaction History</h2>
              <p className="mt-2 text-gray-600">View and track all your transactions</p>
            </div>
            <div className="flex items-center space-x-3">
                <button 
                onClick={downloadTransactionsPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>PDF</span>
                </button>
                <button 
                onClick={downloadTransactionsCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>CSV</span>
                </button>
              <Link
                href="/exchange"
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200"
                style={{ color: 'white' }}
              >
                New Transaction
              </Link>
            </div>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
                  </div>
                </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {transactions.filter(tx => tx.status === 'completed').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
                  </div>
                </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {transactions.filter(tx => tx.status === 'pending').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                  </div>
                </div>
              </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {transactions.filter(tx => tx.status === 'failed').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search transactions..."
              />
            </div>
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="buy_gold">Buy Gold</option>
                <option value="sell_gold">Sell Gold</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
                  </div>
                </div>

        {/* Transactions Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.type)}
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {transaction.description}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            ID: {transaction.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {transaction.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.currency === 'USD' || transaction.currency === 'USDT' 
                          ? formatCurrency(transaction.amount)
                          : formatCrypto(transaction.amount, transaction.currency)
                        }
                      </div>
                      {transaction.fee && transaction.fee > 0 && (
                        <div className="text-xs text-gray-500">
                          Fee: {formatCurrency(transaction.fee)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.timestamp).toLocaleTimeString()}
                  </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium w-32">
                      <div className="flex flex-col space-y-1">
                        <button className="text-primary-600 hover:text-primary-900 text-left">
                          View
                        </button>
                        {transaction.transactionHash && (
                          <a
                            href={`https://etherscan.io/tx/${transaction.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 text-left text-xs"
                          >
                            Explorer
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>

          {/* Empty State */}
          {paginatedTransactions.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500 mb-4">You haven't made any transactions yet.</p>
              <Link
                href="/exchange"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                Start Trading
              </Link>
            </div>
          )}
              </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}