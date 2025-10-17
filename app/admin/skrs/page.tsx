'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface SKR {
  id: string;
  user_id: string;
  skr_number: string;
  gold_weight: number;
  gold_purity: number;
  storage_location: string;
  status: string;
  created_at: string;
  expiry_date: string;
  current_value?: number;
  profit_loss?: number;
}

export default function AdminSKRs() {
  const [skrs, setSkrs] = useState<SKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSKR, setSelectedSKR] = useState<SKR | null>(null);
  const [showSKRModal, setShowSKRModal] = useState(false);

  useEffect(() => {
    loadSKRs();
  }, []);

  const loadSKRs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/skrs');
      setSkrs(response.data || []);
    } catch (error) {
      console.error('Error loading SKRs:', error);
      // Mock data for development
      setSkrs([
        {
          id: '1',
          user_id: 'user-1',
          skr_number: 'SKR-000001',
          gold_weight: 1.5,
          gold_purity: 99.9,
          storage_location: 'Vault A-1',
          status: 'active',
          created_at: new Date().toISOString(),
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          current_value: 3000,
          profit_loss: 150
        },
        {
          id: '2',
          user_id: 'user-2',
          skr_number: 'SKR-000002',
          gold_weight: 2.0,
          gold_purity: 99.5,
          storage_location: 'Vault B-2',
          status: 'active',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          expiry_date: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
          current_value: 4000,
          profit_loss: -50
        },
        {
          id: '3',
          user_id: 'user-3',
          skr_number: 'SKR-000003',
          gold_weight: 0.5,
          gold_purity: 99.9,
          storage_location: 'Vault C-1',
          status: 'expired',
          created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
          expiry_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          current_value: 1000,
          profit_loss: 25
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSKRs = skrs.filter(skr => {
    const skrNumber = skr.skr_number || '';
    const userId = skr.user_id || '';
    const storageLocation = skr.storage_location || '';
    const matchesSearch = skrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         storageLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (skr.status || 'pending') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatWeight = (weight: number) => {
    return `${formatNumber(weight, 4)} oz`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      redeemed: { color: 'bg-purple-100 text-purple-800', label: 'Redeemed' },
      suspended: { color: 'bg-yellow-100 text-yellow-800', label: 'Suspended' },
      pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPurityBadge = (purity: number) => {
    let colorClass = 'bg-gray-100 text-gray-800';
    if (purity >= 99.9) {
      colorClass = 'bg-yellow-100 text-yellow-800';
    } else if (purity >= 99.0) {
      colorClass = 'bg-orange-100 text-orange-800';
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
        {purity}%
      </span>
    );
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    } catch (error) {
      return false;
    }
  };

  const openSKRModal = (skr: SKR) => {
    setSelectedSKR(skr);
    setShowSKRModal(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SKR Management</h1>
          <p className="mt-2 text-gray-600">Manage Secure Key Receipts and gold holdings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total SKRs</p>
                <p className="text-2xl font-bold text-gray-900">{skrs.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active SKRs</p>
                <p className="text-2xl font-bold text-green-600">
                  {skrs.filter(skr => skr.status === 'active').length}
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
                <p className="text-sm font-medium text-gray-600">Total Gold</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(skrs.reduce((sum, skr) => sum + skr.gold_weight, 0), 2)} oz
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-xl">🥇</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(skrs.reduce((sum, skr) => sum + (skr.current_value || 0), 0))}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search SKRs
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search by SKR number, user ID, or location..."
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
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="redeemed">Redeemed</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* SKRs Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKR Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gold Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSKRs.map((skr) => (
                  <tr key={skr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{skr.skr_number}</div>
                        <div className="text-sm text-gray-500">User: {skr.user_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatWeight(skr.gold_weight)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPurityBadge(skr.gold_purity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {skr.storage_location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(skr.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(skr.expiry_date)}</div>
                      {isExpiringSoon(skr.expiry_date) && (
                        <div className="text-xs text-orange-600 font-medium">Expiring Soon</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(skr.current_value || 0)}
                      </div>
                      {skr.profit_loss !== undefined && (
                        <div className={`text-xs ${skr.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {skr.profit_loss >= 0 ? '+' : ''}{formatCurrency(skr.profit_loss)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openSKRModal(skr)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        View
                      </button>
                      <button className="text-blue-600 hover:text-blue-900 mr-4">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredSKRs.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No SKRs found</h3>
              <p className="text-gray-500">No SKRs match your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* SKR Detail Modal */}
      {showSKRModal && selectedSKR && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">SKR Details</h3>
                <button
                  onClick={() => setShowSKRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKR Number</label>
                  <p className="text-sm text-gray-900">{selectedSKR.skr_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-sm text-gray-900">{selectedSKR.user_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gold Weight</label>
                  <p className="text-sm text-gray-900">{formatWeight(selectedSKR.gold_weight)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gold Purity</label>
                  <div className="mt-1">
                    {getPurityBadge(selectedSKR.gold_purity)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Location</label>
                  <p className="text-sm text-gray-900">{selectedSKR.storage_location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedSKR.status)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSKR.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSKR.expiry_date)}</p>
                </div>
                {selectedSKR.current_value && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Value</label>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedSKR.current_value)}</p>
                  </div>
                )}
                {selectedSKR.profit_loss !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Profit/Loss</label>
                    <p className={`text-sm font-medium ${selectedSKR.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedSKR.profit_loss >= 0 ? '+' : ''}{formatCurrency(selectedSKR.profit_loss)}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200">
                  Edit SKR
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200">
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}