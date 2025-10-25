'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { formatCurrency, formatCrypto, formatNumber } from '@/lib/formatters';

interface Transaction {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_hash?: string;
  description?: string;
  from_address?: string;
  to_address?: string;
  gold_grams?: number;
  gold_price_per_gram?: number;
}

interface Withdrawal {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  currency: string;
  amount: number;
  destination_address: string;
  status: string;
  created_at: string;
  fee: number;
  net_amount: number;
  transaction_hash?: string;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | Withdrawal | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTransactions(),
        loadWithdrawals()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.get('/api/admin/transactions');
      const transactions = response.data || [];
      setTransactions(transactions);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await api.get('/api/withdrawals/admin');
      const withdrawals = response.data.data || [];
      setWithdrawals(withdrawals);
      
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      setWithdrawals([]);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = (transaction.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.user_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.transaction_hash || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (transaction.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || (transaction.type || '').toLowerCase() === typeFilter.toLowerCase();
    
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = (withdrawal.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (withdrawal.user_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (withdrawal.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (withdrawal.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (withdrawal.destination_address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (withdrawal.status || '').toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });


  // Pagination logic
  const currentData = activeTab === 'transactions' ? filteredTransactions : filteredWithdrawals;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, activeTab]);

  const handleViewTransaction = (transaction: Transaction | Withdrawal) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedTransaction(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

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

  const processWithdrawal = async (withdrawalId: string) => {
    try {
      setProcessingId(withdrawalId);
      await api.post(`/api/admin/process-withdrawal/${withdrawalId}`);
      await loadWithdrawals(); // Reload data
    } catch (error) {
      console.error('Error processing withdrawal:', error);
    } finally {
      setProcessingId(null);
    }
  };


  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>
          <p className="mt-2 text-gray-600">Monitor and manage all platform transactions</p>
        </div>

        {/* Stats Cards */}
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
                <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {withdrawals.filter(w => w.status === 'pending').length}
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
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {transactions.filter(t => {
                    const today = new Date();
                    const transactionDate = new Date(t.created_at);
                    return t.status === 'completed' && 
                           transactionDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(
                    transactions.reduce((sum, t) => sum + t.amount, 0) +
                    withdrawals.reduce((sum, w) => sum + w.amount, 0), 
                    2
                  )}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'withdrawals'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Withdrawals
              </button>
            </nav>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            {activeTab === 'transactions' && (
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
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
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
            <table className="min-w-full divide-y divide-gray-200 table-fixed" style={{ minWidth: '800px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-2/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="w-1/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {activeTab === 'withdrawals' && (
                    <th className="w-1/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee
                    </th>
                  )}
                  <th className="w-1/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === 'transactions' && paginatedData.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        {getTransactionIcon((transaction as Transaction).type)}
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {(transaction as Transaction).description || (transaction as Transaction).type.replace('_', ' ')}
                            {(transaction as Transaction).gold_grams && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({(transaction as Transaction).gold_grams}g)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {transaction.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {transaction.user_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {transaction.user_email ? transaction.user_email.split('@')[0] + '@...' : transaction.user_id?.substring(0, 8) + '...'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {transaction.currency === 'USD' || transaction.currency === 'USDT' 
                          ? formatCurrency(transaction.amount)
                          : formatCrypto(transaction.amount, transaction.currency)
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <button 
                          onClick={() => handleViewTransaction(transaction)}
                          className="text-primary-600 hover:text-primary-900 text-left text-sm"
                        >
                          View
                        </button>
                        {transaction.transaction_hash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${transaction.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 text-left text-xs"
                            title={`View transaction on Etherscan: ${transaction.transaction_hash}`}
                          >
                            Explorer
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {activeTab === 'withdrawals' && paginatedData.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        {getTransactionIcon('withdrawal')}
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Withdrawal
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {withdrawal.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {withdrawal.user_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {withdrawal.user_email ? withdrawal.user_email.split('@')[0] + '@...' : withdrawal.user_id?.substring(0, 8) + '...'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {formatCrypto((withdrawal as Withdrawal).amount, (withdrawal as Withdrawal).currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Net: {formatCrypto((withdrawal as Withdrawal).net_amount, (withdrawal as Withdrawal).currency)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge((withdrawal as Withdrawal).status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date((withdrawal as Withdrawal).created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date((withdrawal as Withdrawal).created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {formatCrypto((withdrawal as Withdrawal).fee, (withdrawal as Withdrawal).currency)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <button 
                          onClick={() => handleViewTransaction(withdrawal)}
                          className="text-primary-600 hover:text-primary-900 text-left text-sm"
                        >
                          View
                        </button>
                        {(withdrawal as Withdrawal).status === 'pending' && (
                          <button
                            onClick={() => processWithdrawal(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 text-left text-xs"
                          >
                            {processingId === withdrawal.id ? 'Processing...' : 'Process'}
                          </button>
                        )}
                        {(withdrawal as Withdrawal).transaction_hash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${(withdrawal as Withdrawal).transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 text-left text-xs"
                            title={`View transaction on Etherscan: ${(withdrawal as Withdrawal).transaction_hash}`}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, currentData.length)}</span> of{' '}
                    <span className="font-medium">{currentData.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === currentPage
                              ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(activeTab === 'transactions' && filteredTransactions.length === 0) || 
           (activeTab === 'withdrawals' && filteredWithdrawals.length === 0) ? (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500">No transactions match your current filters.</p>
            </div>
          ) : null}
        </div>

        {/* Transaction Detail Modal */}
        {showTransactionModal && selectedTransaction && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
                  <button
                    onClick={closeTransactionModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedTransaction.id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">
                      {(selectedTransaction as any).user_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedTransaction as any).user_email || (selectedTransaction as any).user_id}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="text-sm text-gray-900">
                      {(selectedTransaction as any).currency === 'USD' || (selectedTransaction as any).currency === 'USDT' 
                        ? formatCurrency((selectedTransaction as any).amount)
                        : formatCrypto((selectedTransaction as any).amount, (selectedTransaction as any).currency)
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge((selectedTransaction as any).status)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="text-sm text-gray-900">{formatDate((selectedTransaction as any).created_at)}</p>
                  </div>
                  
                  {(selectedTransaction as any).transaction_hash && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Transaction Hash</label>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {(selectedTransaction as any).transaction_hash}
                      </p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${(selectedTransaction as any).transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        View on Etherscan →
                      </a>
                    </div>
                  )}
                  
                  {(selectedTransaction as any).description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="text-sm text-gray-900">{(selectedTransaction as any).description}</p>
                    </div>
                  )}
                  
                  {(selectedTransaction as any).destination_address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Destination Address</label>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {(selectedTransaction as any).destination_address}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={closeTransactionModal}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}