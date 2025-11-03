'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatCrypto } from '@/lib/formatters';
import Navbar from '@/components/Navbar';

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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadTransactions();
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
      setLoading(true);
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
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_report_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('Transactions PDF downloaded successfully');
      } else {
        alert('Failed to download PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const downloadTransactionsCSV = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/exports/transactions/csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  // Filter and sort transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  // Calculate stats
  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter(tx => tx.status === 'completed').length;
  const pendingTransactions = transactions.filter(tx => tx.status === 'pending' || tx.status === 'processing').length;
  const failedTransactions = transactions.filter(tx => tx.status === 'failed').length;

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const getTransactionIcon = (type: string) => {
    const iconClass = "h-10 w-10 rounded-full flex items-center justify-center";
    switch (type) {
      case 'deposit':
        return (
          <div className={`${iconClass} bg-green-100`}>
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'withdrawal':
        return (
          <div className={`${iconClass} bg-red-100`}>
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'buy_gold':
        return (
          <div className={`${iconClass} bg-yellow-100`}>
            <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'sell_gold':
        return (
          <div className={`${iconClass} bg-orange-100`}>
            <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`${iconClass} bg-blue-100`}>
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400', label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400', label: 'Processing' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-400', label: 'Failed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${config.dot}`}></span>
        {config.label}
      </span>
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600';
      case 'withdrawal':
        return 'text-red-600';
      case 'buy_gold':
        return 'text-yellow-600';
      case 'sell_gold':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  };

  const getTypePrefix = (type: string) => {
    switch (type) {
      case 'deposit':
        return '+';
      case 'withdrawal':
        return '-';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Navbar Component */}
      <Navbar user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
              <p className="mt-2 text-gray-600">View and track all your transactions</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Export Buttons */}
              <button 
                onClick={downloadTransactionsCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                title="Download CSV"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button 
                onClick={downloadTransactionsPDF}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                title="Download PDF"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
              <Link
                href="/exchange"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Transaction
              </Link>
            </div>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Transactions */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-900">{totalTransactions}</p>
              </div>
              <div className="h-12 w-12 bg-blue-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-900">{completedTransactions}</p>
              </div>
              <div className="h-12 w-12 bg-green-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingTransactions}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-900">{failedTransactions}</p>
              </div>
              <div className="h-12 w-12 bg-red-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search transactions by description or ID..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="buy_gold">Buy Gold</option>
                <option value="sell_gold">Sell Gold</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="type">Type</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? (
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
                setSortBy('date');
                setSortOrder('desc');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading transactions...</p>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">You haven't made any transactions yet.</p>
            <Link
              href="/exchange"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Trading
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200">
              {paginatedTransactions.map((transaction) => {
                const isPositive = transaction.type === 'deposit' || transaction.type === 'buy_gold';
                return (
                  <div
                    key={transaction.id}
                    className="p-6 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Icon and Info */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {getTransactionIcon(transaction.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {transaction.description}
                            </h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getTypeColor(transaction.type)} bg-opacity-10`}>
                              {transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatRelativeTime(transaction.timestamp)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">ID: {transaction.id.slice(0, 8)}...</span>
                            {transaction.transactionHash && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${transaction.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hidden sm:inline text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  View on Explorer
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount and Status */}
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {getTypePrefix(transaction.type)}
                            {transaction.currency === 'USD' || transaction.currency === 'USDT' 
                              ? formatCurrency(transaction.amount)
                              : formatCrypto(transaction.amount, transaction.currency)
                            }
                          </div>
                          {transaction.fee && transaction.fee > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Fee: {formatCurrency(transaction.fee)}
                            </div>
                          )}
                        </div>
                        <div>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results Info */}
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, sortedTransactions.length)}</span> of{' '}
                <span className="font-medium">{sortedTransactions.length}</span> results
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium text-gray-700"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium text-gray-700"
                >
                  Next
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Items Per Page */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
