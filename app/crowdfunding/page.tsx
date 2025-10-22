'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Cookies from 'js-cookie';

interface Contract {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  minimum_investment: number;
  maximum_investment?: number;
  currency: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  created_by_name: string;
  total_investors: number;
  progress_percentage: number;
  image_url?: string;
  contract_type: 'gold' | 'oil';
  profit_percentage: number;
  contract_duration_months: number;
  is_target_reached: boolean;
  profit_distributed: boolean;
}

export default function CrowdfundingPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'completed'>('ongoing');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadContracts();
    }
  }, [activeTab, selectedType, currentPage, authenticated]);

  const checkAuth = () => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;
    
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    setAuthenticated(true);
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const params = new URLSearchParams({
        status: activeTab,
        page: currentPage.toString(),
        limit: '12'
      });
      
      if (selectedType !== 'all') {
        params.append('contract_type', selectedType);
      }

      const response = await fetch(`http://localhost:5000/api/crowdfunding/contracts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }

      const data = await response.json();
      setContracts(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading contracts:', error);
      setContracts([]);
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
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractTypeIcon = (type: string) => {
    switch (type) {
      case 'gold': return '🥇';
      case 'oil': return '🛢️';
      default: return '📊';
    }
  };

  const getContractTypeColor = (type: string) => {
    switch (type) {
      case 'gold': return 'from-yellow-50 to-yellow-100';
      case 'oil': return 'from-gray-50 to-gray-100';
      default: return 'from-primary-50 to-primary-100';
    }
  };

  const contractTypes = ['all', 'gold', 'oil'];

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Crowdfunding</h1>
              <p className="text-gray-600 mt-1">Invest in promising projects and opportunities</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <Link
                href="/crowdfunding/my-investments"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                style={{ color: 'white !important' }}
              >
                My Investments
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Status Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'ongoing', label: 'Ongoing' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contract Type Filter */}
            <div className="flex-1">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {contractTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contracts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600">There are no {activeTab} contracts at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.map((contract) => (
              <div key={contract.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* Contract Image */}
                <div className={`relative h-48 bg-gradient-to-br ${getContractTypeColor(contract.contract_type)} rounded-t-lg overflow-hidden`}>
                  {contract.image_url ? (
                    <Image
                      src={contract.image_url}
                      alt={contract.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-6xl opacity-30">
                        {getContractTypeIcon(contract.contract_type)}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                      {contract.status ? contract.status.charAt(0).toUpperCase() + contract.status.slice(1) : 'Unknown'}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full bg-white/80 text-gray-700 capitalize`}>
                      {contract.contract_type}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Contract Title and Type */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {contract.title}
                    </h3>
                    <span className="text-2xl ml-2">
                      {getContractTypeIcon(contract.contract_type)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {contract.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Number(contract.progress_percentage).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(Number(contract.progress_percentage), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Raised</span>
                      <span className="font-medium">
                        {formatCurrency(contract.current_amount, contract.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Target</span>
                      <span className="font-medium">
                        {formatCurrency(contract.target_amount, contract.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Investors</span>
                      <span className="font-medium">{contract.total_investors}</span>
                    </div>
                  </div>

                  {/* Investment Info */}
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Min Investment</span>
                      <span className="font-medium">
                        {formatCurrency(contract.minimum_investment, contract.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Profit Rate</span>
                      <span className="font-medium text-green-600">
                        {Number(contract.profit_percentage)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium">
                        {contract.contract_duration_months} months
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-gray-500 mb-4">
                    {contract.status === 'upcoming' && (
                      <div>Starts: {formatDate(contract.start_date)}</div>
                    )}
                    {contract.status === 'ongoing' && (
                      <div>Ends: {formatDate(contract.end_date)}</div>
                    )}
                    {contract.status === 'completed' && (
                      <div>Completed: {formatDate(contract.end_date)}</div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/crowdfunding/contract/${contract.id}`}
                    className={`w-full py-2 px-4 rounded-lg text-center font-medium transition-colors ${
                      contract.status === 'ongoing'
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : contract.status === 'upcoming'
                        ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    style={contract.status === 'ongoing' ? { color: 'white !important' } : {}}
                  >
                    {contract.status === 'ongoing' ? 'Invest Now' : 
                     contract.status === 'upcoming' ? 'Coming Soon' : 
                     'View Details'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-2 border rounded-md text-sm font-medium ${
                    currentPage === i + 1
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                  style={currentPage === i + 1 ? { color: 'white !important' } : {}}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
