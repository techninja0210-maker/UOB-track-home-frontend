'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface Investment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  created_at: string;
  contract_title: string;
  contract_description: string;
  contract_status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  target_amount: number;
  current_amount: number;
  end_date: string;
  progress_percentage: number;
  contract_type: 'gold' | 'oil';
  profit_percentage: number;
  is_target_reached: boolean;
  profit_distributed: boolean;
  calculated_profit: number;
  total_return: number;
  profit_amount: number;
  profit_paid: boolean;
}

export default function MyInvestmentsPage() {
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all');

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await api.get('/api/crowdfunding/my-investments');

      if (response.data) {
        setInvestments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Validate and normalize currency code
    let validCurrency = 'USD'; // Default fallback
    if (currency) {
      if (currency === 'USDT') {
        validCurrency = 'USD';
      } else if (currency.length === 3) {
        validCurrency = currency.toUpperCase();
      }
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(numAmount);
    } catch (error) {
      // Fallback to simple formatting if currency is invalid
      return `$${numAmount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvestments = investments.filter(investment => {
    if (filter === 'all') return true;
    return investment.status === filter;
  });

  const totalInvested = investments
    .filter(inv => inv.status === 'confirmed')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPending = investments
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/crowdfunding" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Crowdfunding
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">My Investments</h1>
              <p className="text-gray-600 mt-1">Track your crowdfunding investments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invested</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(totalInvested, 'USDT')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(totalPending, 'USDT')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {investments.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Investments' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'pending', label: 'Pending' },
              { key: 'failed', label: 'Failed' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Investments List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvestments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No investments found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't made any investments yet." 
                : `No ${filter} investments found.`}
            </p>
            <Link
              href="/crowdfunding"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Projects
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvestments.map((investment) => (
              <div key={investment.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {investment.contract_title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(investment.status)}`}>
                        {investment.status ? investment.status.charAt(0).toUpperCase() + investment.status.slice(1) : 'Unknown'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContractStatusColor(investment.contract_status)}`}>
                        {investment.contract_status ? investment.contract_status.charAt(0).toUpperCase() + investment.contract_status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {investment.contract_description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>Invested: {formatDate(investment.created_at)}</span>
                      {investment.contract_status === 'ongoing' && (
                        <span>Ends: {formatDate(investment.end_date)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-6">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {formatCurrency(investment.amount, investment.currency)}
                    </div>
                    
                    {/* Profit Information */}
                    <div className="text-sm text-gray-600 mb-2">
                      {investment.is_target_reached ? (
                        <div className="space-y-1">
                          <div className="text-green-600 font-medium">
                            Profit: {formatCurrency(investment.calculated_profit, investment.currency)}
                          </div>
                          <div className="text-green-700 font-bold">
                            Total: {formatCurrency(investment.total_return, investment.currency)}
                          </div>
                          {investment.profit_paid && (
                            <div className="text-green-500 text-xs">✅ Profit Paid</div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-blue-600">
                            Expected: {formatCurrency(investment.calculated_profit, investment.currency)}
                          </div>
                          <div className="text-blue-700 font-medium">
                            Total: {formatCurrency(investment.total_return, investment.currency)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {investment.contract_status === 'ongoing' && (
                      <div className="text-xs text-gray-500 mb-2">
                        Progress: {Number(investment.progress_percentage).toFixed(1)}%
                      </div>
                    )}
                    
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          investment.is_target_reached ? 'bg-green-600' : 'bg-primary-600'
                        }`}
                        style={{ width: `${Math.min(investment.progress_percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
