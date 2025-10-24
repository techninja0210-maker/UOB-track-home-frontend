'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import Cookies from 'js-cookie';

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
  contract_type: 'gold' | 'oil';
  profit_percentage: number | string;
  contract_duration_months: number | string;
  is_target_reached: boolean;
  profit_distributed: boolean;
  created_at: string;
}

interface Investment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  created_at: string;
  investor_name: string;
  investor_email: string;
  contract_title: string;
  admin_notes?: string;
}

export default function AdminCrowdfundingPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contracts' | 'investments'>('contracts');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Form state for creating/editing contracts
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_amount: '',
    minimum_investment: '100',
    maximum_investment: '',
    currency: 'USDT',
    start_date: '',
    end_date: '',
    contract_type: 'gold',
    profit_percentage: '1.00',
    contract_duration_months: '12'
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      // Use API client for authentication check
      const response = await api.get('/api/auth/me');
      
      if (response.data && response.data.role !== 'admin') {
        alert('Admin access required');
        router.push('/');
        return;
      }

      // User is authenticated and is admin, load data
      loadData();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      // Load contracts
      const contractsResponse = await fetch('http://localhost:5000/api/crowdfunding/contracts?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (contractsResponse.ok) {
        const contractsData = await contractsResponse.json();
        setContracts(contractsData.data);
      }

      // Load investments
      const investmentsResponse = await fetch('http://localhost:5000/api/crowdfunding/admin/investments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json();
        setInvestments(investmentsData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('http://localhost:5000/api/crowdfunding/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          target_amount: parseFloat(formData.target_amount),
          minimum_investment: parseFloat(formData.minimum_investment),
          maximum_investment: formData.maximum_investment ? parseFloat(formData.maximum_investment) : null,
          profit_percentage: parseFloat(formData.profit_percentage),
          contract_duration_months: parseInt(formData.contract_duration_months)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowCreateModal(false);
        resetForm();
        loadData();
        alert('Contract created successfully!');
      } else {
        if (response.status === 401 || response.status === 403) {
          alert('Authentication error. Please login as admin.');
          localStorage.removeItem('authToken');
          router.push('/login');
        } else {
          alert(data.message || 'Failed to create contract');
        }
      }
    } catch (error) {
      console.error('Create contract error:', error);
      alert('Failed to create contract');
    }
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:5000/api/crowdfunding/contracts/${editingContract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          target_amount: parseFloat(formData.target_amount),
          minimum_investment: parseFloat(formData.minimum_investment),
          maximum_investment: formData.maximum_investment ? parseFloat(formData.maximum_investment) : null,
          profit_percentage: parseFloat(formData.profit_percentage),
          contract_duration_months: parseInt(formData.contract_duration_months)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEditingContract(null);
        resetForm();
        loadData();
        alert('Contract updated successfully!');
      } else {
        alert(data.message || 'Failed to update contract');
      }
    } catch (error) {
      console.error('Update contract error:', error);
      alert('Failed to update contract');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:5000/api/crowdfunding/contracts/${contractId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        loadData();
        alert('Contract deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete contract');
      }
    } catch (error) {
      console.error('Delete contract error:', error);
      alert('Failed to delete contract');
    }
  };

  const handleUpdateInvestmentStatus = async (investmentId: string, status: string) => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:5000/api/crowdfunding/admin/investments/${investmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      
      if (data.success) {
        loadData();
        alert('Investment status updated successfully!');
      } else {
        alert(data.message || 'Failed to update investment status');
      }
    } catch (error) {
      console.error('Update investment status error:', error);
      alert('Failed to update investment status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_amount: '',
      minimum_investment: '100',
      maximum_investment: '',
      currency: 'USDT',
      start_date: '',
      end_date: '',
      contract_type: 'gold',
      profit_percentage: '1.00',
      contract_duration_months: '12'
    });
  };

  const openEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      title: contract.title,
      description: contract.description,
      target_amount: contract.target_amount.toString(),
      minimum_investment: contract.minimum_investment.toString(),
      maximum_investment: contract.maximum_investment?.toString() || '',
      currency: contract.currency,
      start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
      end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
      contract_type: contract.contract_type,
      profit_percentage: contract.profit_percentage?.toString() || '1.00',
      contract_duration_months: contract.contract_duration_months?.toString() || '12'
    });
    setShowCreateModal(true);
  };

  const formatCurrency = (amount: number | string, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numAmount);
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

  const getInvestmentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crowdfunding Management</h1>
            <p className="text-gray-600">Manage contracts and investments</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setEditingContract(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              style={{ color: 'white' }}
            >
              Create Contract
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'contracts', label: 'Contracts' },
                { key: 'investments', label: 'Investments' }
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
            {activeTab === 'contracts' && (
              <div>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No contracts found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{contract.title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{contract.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Type:</span>
                                <span className="ml-1 font-medium capitalize">{contract.contract_type}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Target:</span>
                                <span className="ml-1 font-medium">{formatCurrency(contract.target_amount, contract.currency)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Raised:</span>
                                <span className="ml-1 font-medium">{formatCurrency(contract.current_amount, contract.currency)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Profit:</span>
                                <span className="ml-1 font-medium">{Number(contract.profit_percentage || 0)}%</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
                              <div>
                                <span className="text-gray-500">Investors:</span>
                                <span className="ml-1 font-medium">{Number(contract.total_investors || 0)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Progress:</span>
                                <span className="ml-1 font-medium">{Number(contract.progress_percentage || 0).toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Duration:</span>
                                <span className="ml-1 font-medium">{Number(contract.contract_duration_months || 0)} months</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-6">
                            <button
                              onClick={() => openEditModal(contract)}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'investments' && (
              <div>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : investments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No investments found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {investments.map((investment) => (
                      <div key={investment.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{investment.contract_title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getInvestmentStatusColor(investment.status)}`}>
                                {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-500">Investor:</span>
                                <span className="ml-1 font-medium">{investment.investor_name}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Email:</span>
                                <span className="ml-1 font-medium">{investment.investor_email}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Amount:</span>
                                <span className="ml-1 font-medium">{formatCurrency(investment.amount, investment.currency)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-1 font-medium">{formatDate(investment.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-6">
                            {investment.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateInvestmentStatus(investment.id, 'confirmed')}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateInvestmentStatus(investment.id, 'failed')}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Contract Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingContract ? 'Edit Contract' : 'Create New Contract'}
              </h2>
              
              <form onSubmit={editingContract ? handleUpdateContract : handleCreateContract} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Gold Mining Project 2024"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({...formData, contract_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="gold">Gold</option>
                      <option value="oil">Oil</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Contract Value (USD)</label>
                    <input
                      type="number"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 100000"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Investment (USD)</label>
                    <input
                      type="number"
                      value={formData.minimum_investment}
                      onChange={(e) => setFormData({...formData, minimum_investment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="100"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profit Percentage (%)</label>
                    <input
                      type="number"
                      value={formData.profit_percentage}
                      onChange={(e) => setFormData({...formData, profit_percentage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="1.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="USDT">USDT</option>
                      <option value="ETH">ETH</option>
                      <option value="BTC">BTC</option>
                    </select>
                  </div>
                  
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({...formData, contract_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="equity">Equity</option>
                      <option value="debt">Debt</option>
                      <option value="revenue_share">Revenue Share</option>
                      <option value="token">Token</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration (Months)</label>
                    <input
                      type="number"
                      value={formData.contract_duration_months}
                      onChange={(e) => setFormData({...formData, contract_duration_months: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="12"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingContract(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-800 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    style={{ color: 'white' }}
                  >
                    {editingContract ? 'Update Contract' : 'Create Contract'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
