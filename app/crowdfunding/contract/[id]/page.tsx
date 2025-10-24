'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface Contract {
  id: string;
  title: string;
  description: string;
  target_amount: number | string;
  current_amount: number | string;
  minimum_investment: number | string;
  maximum_investment?: number | string;
  currency: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  created_by_name: string;
  total_investors: number | string;
  progress_percentage: number | string;
  image_url?: string;
  contract_type: 'gold' | 'oil';
  profit_percentage: number | string;
  contract_duration_months: number | string;
  is_target_reached: boolean;
  profit_distributed: boolean;
}

interface Investment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  investor_name: string;
}

interface Update {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_name: string;
}

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [investAmount, setInvestAmount] = useState('');
  const [investing, setInvesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'updates'>('overview');
  const [authenticated, setAuthenticated] = useState(false);

  const checkAuth = useCallback(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;
    
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  const loadContractDetails = useCallback(async () => {
    try {
      setLoading(true);
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      const response = await api.get(`/api/crowdfunding/contracts/${contractId}`);
      
      if (response.data && response.data.success && response.data.data) {
        console.log('Contract data:', response.data.data.contract);
        setContract(response.data.data.contract);
        // Set empty arrays for investments and updates if not provided
        setInvestments(response.data.data.recent_investments || []);
        setUpdates(response.data.data.updates || []);
      } else {
        throw new Error(response.data?.message || 'Failed to load contract');
      }
    } catch (error) {
      console.error('Error loading contract details:', error);
      alert('Failed to load contract details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [contractId, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (contractId && authenticated) {
      loadContractDetails();
    }
  }, [contractId, authenticated, loadContractDetails]);

  const handleInvestment = async () => {
    if (!contract || !investAmount) return;
    
    const amount = parseFloat(investAmount);
    if (amount < 100) {
      alert('Minimum investment is $100');
      return;
    }
    
    if (!confirm(`Are you sure you want to invest $${amount} in this ${contract.contract_type} contract?`)) {
      return;
    }
    
    try {
      setInvesting(true);
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      const response = await api.post('/api/crowdfunding/invest', {
        contract_id: contractId,
        amount: amount
      });

      if (response.data && response.data.success) {
        alert('Investment successful! Your funds have been invested in the contract.');
        setInvestAmount('');
        loadContractDetails(); // Refresh contract details
      } else {
        alert(response.data?.message || 'Failed to submit investment');
      }
    } catch (error) {
      console.error('Investment error:', error);
      alert('Failed to submit investment');
    } finally {
      setInvesting(false);
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
      month: 'long',
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

  if (loading || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Debug logging
  console.log('Contract data for display:', {
    progress_percentage: contract.progress_percentage,
    target_amount: contract.target_amount,
    current_amount: contract.current_amount,
    minimum_investment: contract.minimum_investment,
    profit_percentage: contract.profit_percentage,
    contract_duration_months: contract.contract_duration_months,
    total_investors: contract.total_investors
  });


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
              <h1 className="text-3xl font-bold text-gray-900">{contract.title}</h1>
              <p className="text-gray-600 mt-1">by {contract.created_by_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(contract.status)}`}>
                {contract.status ? contract.status.charAt(0).toUpperCase() + contract.status.slice(1) : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contract Image */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-64 bg-gradient-to-br from-primary-50 to-primary-100">
                {contract.image_url ? (
                  <Image
                    src={contract.image_url}
                    alt={contract.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-8xl opacity-20">
                      {getContractTypeIcon(contract.contract_type)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'investments', label: 'Recent Investments' },
                    { key: 'updates', label: 'Updates' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.key
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="prose max-w-none">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Description</h3>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {contract.description}
                    </div>
                  </div>
                )}

                {activeTab === 'investments' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Investments</h3>
                    {investments.length === 0 ? (
                      <p className="text-gray-500">No investments yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {investments.map((investment) => (
                          <div key={investment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{investment.investor_name}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(investment.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(investment.amount, investment.currency)}
                              </p>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                investment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {investment.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'updates' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Updates</h3>
                    {updates.length === 0 ? (
                      <p className="text-gray-500">No updates yet.</p>
                    ) : (
                      <div className="space-y-6">
                        {updates.map((update) => (
                          <div key={update.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                            <h4 className="font-semibold text-gray-900 mb-2">{update.title}</h4>
                            <p className="text-gray-700 mb-3 whitespace-pre-wrap">{update.content}</p>
                            <div className="flex items-center text-sm text-gray-500">
                              <span>By {update.author_name}</span>
                              <span className="mx-2">•</span>
                              <span>{formatDate(update.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investment Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Details</h3>
              
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Number(contract.progress_percentage || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(Number(contract.progress_percentage || 0), 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Amounts */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Raised</span>
                  <span className="font-semibold">
                    {formatCurrency(contract.current_amount, contract.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target</span>
                  <span className="font-semibold">
                    {formatCurrency(contract.target_amount, contract.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investors</span>
                  <span className="font-semibold">{contract.total_investors}</span>
                </div>
              </div>

              {/* Investment Form */}
              {contract.status === 'ongoing' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Amount (USD)
                    </label>
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      min="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Minimum: $100"
                    />
                  </div>
                  
                  {/* Profit Calculation Display */}
                  {investAmount && parseFloat(investAmount) >= 100 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Profit Calculation</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Your Investment:</span>
                          <span className="font-medium text-green-800">${parseFloat(investAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Expected Profit ({Number(contract.profit_percentage)}%):</span>
                          <span className="font-medium text-green-800">${(Number(investAmount) * Number(contract.profit_percentage) / 100).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-green-200 pt-1 mt-2">
                          <div className="flex justify-between">
                            <span className="text-green-700 font-medium">Total Return:</span>
                            <span className="font-bold text-green-800">${(Number(investAmount) + (Number(investAmount) * Number(contract.profit_percentage) / 100)).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleInvestment}
                    disabled={!investAmount || investing || parseFloat(investAmount) < 100}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ color: 'white' }}
                  >
                    {investing ? 'Processing...' : 'Invest Now'}
                  </button>
                </div>
              )}

              {/* Contract Info */}
              <div className="border-t pt-4 mt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min Investment</span>
                    <span>{formatCurrency(contract.minimum_investment, contract.currency)}</span>
                  </div>
                  {contract.maximum_investment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Investment</span>
                      <span>{formatCurrency(contract.maximum_investment, contract.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Percentage</span>
                    <span className="text-green-600">
                      {contract.profit_percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract Duration</span>
                    <span className="text-blue-600">
                      {contract.contract_duration_months} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type</span>
                    <span>{contract.contract_type ? contract.contract_type.charAt(0).toUpperCase() + contract.contract_type.slice(1) : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t pt-4 mt-4">
                <div className="text-sm text-gray-600">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
