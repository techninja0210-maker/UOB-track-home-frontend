'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/formatters';
// Coming soon modal not used

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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedSKR, setSelectedSKR] = useState<SKRRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadSKRData();
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

  const filteredRecords = skrRecords.filter(record =>
    record.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const totalGoldAmount = skrRecords.reduce((sum, record) => sum + record.goldAmount, 0);
  const totalProfitLoss = skrRecords.reduce((sum, record) => sum + record.profitLoss, 0);
  const totalValue = skrRecords.reduce((sum, record) => sum + (record.currentPrice * record.goldAmount), 0);


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
              <Link href="/wallet" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Wallet
          </Link>
              <Link href="/skrs" className="text-sm font-medium text-primary-600 border-b-2 border-primary-600 pb-1">
                SKRs
          </Link>
              <Link href="/transactions" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Transactions
          </Link>
              <Link href="/exchange" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Exchange
          </Link>
              <Link href="/ai-trading" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                AI Trading
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
                  </div>
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500">
                      User: {user?.role}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 py-1">
                    <Link
                      href="/referrals"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Referral Program
                      </div>
          </Link>
                    <Link
                      href="/account-settings"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </div>
          </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </div>
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
            <Link href="/wallet" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Wallet
          </Link>
            <Link href="/skrs" className="block px-3 py-2 text-sm font-medium bg-primary-50 text-primary-600 rounded-lg">
              SKRs
          </Link>
            <Link href="/transactions" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Transactions
            </Link>
            <Link href="/exchange" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              Exchange
            </Link>
            <Link href="/ai-trading" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200">
              AI Trading
            </Link>
          </div>
        </div>
        </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Gold Holdings (SKRs)</h2>
              <p className="mt-2 text-gray-600">Manage your Secure Key Receipts</p>
            </div>
            <Link
              href="/exchange"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200"
              style={{ color: 'white' }}
            >
              Buy More Gold
            </Link>
          </div>
      </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Gold</p>
                <p className="text-2xl font-bold text-yellow-600">{formatNumber(totalGoldAmount, 4)} g</p>
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
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
                  </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                  </div>
                  </div>
                  </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">P&L</p>
                <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalProfitLoss)}
                </p>
                </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search SKRs
              </label>
              <input 
                type="text" 
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search by reference number..."
              />
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
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gold Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
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
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.referenceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(record.goldAmount, 4)} g
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.currentPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          record.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(record.profitLoss)}
                        </span>
                        <span className={`ml-2 text-xs ${
                          record.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatPercentage(record.profitLossPercent)}
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
                      <div className="flex items-center space-x-2">
                      <button 
                          onClick={() => {
                            setSelectedSKR(record);
                            setShowModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                      </button>
                        <button
                          onClick={() => downloadIndividualSKRPDF(record.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          title="Download PDF"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        {record.status === 'holding' && (
                          <Link
                            href={`/exchange?action=sell&amount=${record.goldAmount}`}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sell
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {paginatedRecords.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No SKRs found</h3>
              <p className="text-gray-500 mb-4">You don't have any gold holdings yet.</p>
              <Link
                href="/exchange"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                Buy Gold
              </Link>
            </div>
          )}
          </div>

          {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredRecords.length)} of {filteredRecords.length} results
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

      {/* SKR Detail Modal */}
      {showModal && selectedSKR && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">SKR Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
            </button>
          </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                  <p className="text-sm text-gray-900">{selectedSKR.referenceNumber}</p>
        </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gold Amount</label>
                  <p className="text-sm text-gray-900">{formatNumber(selectedSKR.goldAmount, 4)} g</p>
      </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedSKR.purchaseDate).toLocaleDateString()}</p>
            </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedSKR.purchasePrice)}</p>
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Price</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedSKR.currentPrice)}</p>
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profit/Loss</label>
                  <p className={`text-sm font-medium ${selectedSKR.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedSKR.profitLoss)} ({formatPercentage(selectedSKR.profitLossPercent)})
                  </p>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
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
            </div>
          </div>
        </div>
      )}

    </div>
  );
}