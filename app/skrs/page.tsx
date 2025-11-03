'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/formatters';
import Navbar from '@/components/Navbar';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface SKRRecord {
  id: string;
  referenceNumber: string;
  goldAmount: number;
  purchaseDate: string;
  purchasePrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  status: 'holding' | 'sold' | 'pending';
  checked: boolean;
}

export default function SKRsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [skrRecords, setSkrRecords] = useState<SKRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSKR, setSelectedSKR] = useState<SKRRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'holding' | 'sold' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'profit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // 9 for grid (3x3), or 10 for list
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadSKRData();
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

  const loadSKRData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      // Pull user gold holdings and current gold price
      const [holdingsRes, priceRes] = await Promise.all([
        api.get('/api/gold-exchange/holdings', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/api/prices/gold/current')
      ]);

      const holdings = holdingsRes.data?.holdings || [];
      const pricePerGram = parseFloat(priceRes.data?.pricePerGram || 0);

      console.log('SKR Holdings data:', holdings);

      const transformedRecords: SKRRecord[] = holdings.map((h: any, index: number) => {
        const grams = parseFloat(h.weight_grams || h.weightGrams || h.grams || 0);
        const purchasePrice = parseFloat(h.purchase_price_per_gram || h.purchasePricePerGram || 0);
        const currentPrice = pricePerGram;
        const profitLoss = (currentPrice - purchasePrice) * grams;
        const profitLossPercent = purchasePrice > 0 ? (profitLoss / (purchasePrice * grams)) : 0;
        return {
          id: h.id || `skr-${index}`,
          referenceNumber: h.skr_reference || h.referenceNumber || `SKR-${String(index + 1).padStart(6, '0')}`,
          goldAmount: grams,
          purchaseDate: h.created_at || h.purchaseDate || new Date().toISOString(),
          purchasePrice,
          currentPrice,
          profitLoss,
          profitLossPercent,
          status: (h.status || 'holding') as 'holding' | 'sold' | 'pending',
        checked: false
        };
      });

      setSkrRecords(transformedRecords);
    } catch (error) {
      console.error('Error loading SKR data:', error);
      setSkrRecords([]);
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


  const downloadIndividualSKRPDF = async (skrId: string) => {
    try {
      console.log('Downloading SKR PDF for ID:', skrId);
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get(`/api/exports/skrs/${skrId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // This is crucial for binary data
      });
      
      if (response.data) {
        // Create blob from response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skr_${skrId}_${Date.now()}.pdf`;
        a.click();
      window.URL.revokeObjectURL(url);
        console.log('PDF downloaded successfully');
      } else {
        console.error('Failed to download individual SKR PDF:', response.status, response.data);
        alert(`Failed to download PDF: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error downloading individual SKR PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Filter and sort records
  const filteredRecords = skrRecords.filter(record => {
    const matchesSearch = record.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        break;
      case 'amount':
        comparison = a.goldAmount - b.goldAmount;
        break;
      case 'profit':
        comparison = a.profitLoss - b.profitLoss;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy, sortOrder]);

  const totalGoldAmount = skrRecords.reduce((sum, record) => sum + record.goldAmount, 0);
  const totalProfitLoss = skrRecords.reduce((sum, record) => sum + record.profitLoss, 0);
  const totalValue = skrRecords.reduce((sum, record) => sum + (record.currentPrice * record.goldAmount), 0);
  const totalCost = skrRecords.reduce((sum, record) => sum + (record.purchasePrice * record.goldAmount), 0);


    return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Navbar Component */}
      <Navbar user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Safe Keeping Receipts</h1>
              <p className="mt-2 text-gray-600">Manage and track your gold holdings</p>
            </div>
            <Link
              href="/exchange"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Buy More Gold
            </Link>
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Gold */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 mb-1">Total Gold Holdings</p>
                <p className="text-2xl font-bold text-yellow-900">{formatNumber(totalGoldAmount, 4)} g</p>
              </div>
              <div className="h-12 w-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 mb-1">Current Value</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalValue)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className={`bg-gradient-to-br ${totalProfitLoss >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'} border rounded-xl p-6 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium mb-1 ${totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Total P&L
                </p>
                <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
                </p>
                {totalCost > 0 && (
                  <p className={`text-xs mt-1 ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage((totalProfitLoss / totalCost) * 100)}
                  </p>
                )}
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${totalProfitLoss >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                {totalProfitLoss >= 0 ? (
                  <svg className={`h-6 w-6 ${totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className={`h-6 w-6 ${totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
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
                  placeholder="Search by reference number..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="holding">Holding</option>
                <option value="sold">Sold</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="profit">Profit/Loss</option>
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

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => {
                  setViewMode('grid');
                  setItemsPerPage(9);
                  setCurrentPage(1);
                }}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Grid View"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setViewMode('list');
                  setItemsPerPage(10);
                  setCurrentPage(1);
                }}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                title="List View"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
                <option value="6">6</option>
                <option value="9">9</option>
                <option value="12">12</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </div>
          </div>
        </div>

        {/* SKRs Display - Grid or List View */}
        {sortedRecords.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SKRs found</h3>
            <p className="text-gray-500 mb-4">You don't have any gold holdings yet.</p>
            <Link
              href="/exchange"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Buy Gold
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {paginatedRecords.map((record) => {
              const currentValue = record.currentPrice * record.goldAmount;
              const purchaseValue = record.purchasePrice * record.goldAmount;
              const daysHeld = Math.floor((new Date().getTime() - new Date(record.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div
                  key={record.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-6 py-4 border-b border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-yellow-700 mb-1">SKR Reference</p>
                        <p className="text-lg font-bold text-yellow-900">{record.referenceNumber}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        record.status === 'holding' 
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'sold'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Gold Amount */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Gold Amount</span>
                        <span className="text-2xl font-bold text-gray-900">{formatNumber(record.goldAmount, 4)} g</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((record.goldAmount / totalGoldAmount) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Values */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Purchase Value</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(purchaseValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Value</span>
                        <span className="text-sm font-medium text-blue-600">{formatCurrency(currentValue)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Profit/Loss</span>
                        <div className="text-right">
                          <span className={`text-base font-bold ${record.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {record.profitLoss >= 0 ? '+' : ''}{formatCurrency(record.profitLoss)}
                          </span>
                          <span className={`ml-2 text-sm ${record.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({formatPercentage(record.profitLossPercent)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Purchase Date */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Purchased {new Date(record.purchaseDate).toLocaleDateString()}</span>
                        {daysHeld > 0 && <span>{daysHeld} days ago</span>}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedSKR(record);
                        setShowModal(true);
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadIndividualSKRPDF(record.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {record.status === 'holding' && (
                        <Link
                          href={`/exchange?action=sell&amount=${record.goldAmount}`}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Sell
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gold Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record) => {
                    const currentValue = record.currentPrice * record.goldAmount;
                    const purchaseValue = record.purchasePrice * record.goldAmount;
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{record.referenceNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatNumber(record.goldAmount, 4)} g</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(record.purchaseDate).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(purchaseValue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600">{formatCurrency(currentValue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${
                              record.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {record.profitLoss >= 0 ? '+' : ''}{formatCurrency(record.profitLoss)}
                            </span>
                            <span className={`ml-2 text-xs ${
                              record.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              ({formatPercentage(record.profitLossPercent)})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'holding' 
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'sold'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => {
                                setSelectedSKR(record);
                                setShowModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => downloadIndividualSKRPDF(record.id)}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Download PDF"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            {record.status === 'holding' && (
                              <Link
                                href={`/exchange?action=sell&amount=${record.goldAmount}`}
                                className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Sell
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                <span className="font-medium">{Math.min(endIndex, sortedRecords.length)}</span> of{' '}
                <span className="font-medium">{sortedRecords.length}</span> results
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
            </div>
          </div>
        )}
      </div>

      {/* SKR Detail Modal */}
      {showModal && selectedSKR && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-6 py-5 border-b border-yellow-200 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">SKR Details</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedSKR.referenceNumber}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Gold Amount Section */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Gold Amount</span>
                  <span className="text-2xl font-bold text-yellow-700">{formatNumber(selectedSKR.goldAmount, 4)} g</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full" 
                    style={{ width: `${Math.min((selectedSKR.goldAmount / totalGoldAmount) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Purchase Date</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date(selectedSKR.purchaseDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedSKR.status === 'holding' 
                      ? 'bg-green-100 text-green-800'
                      : selectedSKR.status === 'sold'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedSKR.status.charAt(0).toUpperCase() + selectedSKR.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Price Information */}
              <div className="space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Price Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Purchase Price per Gram</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedSKR.purchasePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Current Price per Gram</span>
                      <span className="text-sm font-medium text-blue-600">{formatCurrency(selectedSKR.currentPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Purchase Value</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedSKR.purchasePrice * selectedSKR.goldAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Current Value</span>
                      <span className="text-sm font-medium text-blue-600">{formatCurrency(selectedSKR.currentPrice * selectedSKR.goldAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Profit/Loss Section */}
                <div className={`bg-gradient-to-r ${selectedSKR.profitLoss >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'} border rounded-xl p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 ${selectedSKR.profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        Profit/Loss
                      </p>
                      <p className={`text-2xl font-bold ${selectedSKR.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {selectedSKR.profitLoss >= 0 ? '+' : ''}{formatCurrency(selectedSKR.profitLoss)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${selectedSKR.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(selectedSKR.profitLossPercent)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  downloadIndividualSKRPDF(selectedSKR.id);
                  setShowModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}