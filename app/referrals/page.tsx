'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  earnings: {
    total_commissions: number;
    total_bonuses: number;
    total_earnings: number;
    paid_earnings: number;
    pending_earnings: number;
  };
  recentCommissions: any[];
  recentBonuses: any[];
  referredBy?: {
    referrer_name: string;
    referrer_email: string;
    referral_code: string;
    referral_date: string;
  } | null;
}

interface ReferredUser {
  id: string;
  full_name: string;
  email: string;
  signup_date: string;
  referral_status: string;
  referral_date: string;
  total_earnings_from_user: number;
}

export default function ReferralsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const [statsRes, codeRes, usersRes] = await Promise.all([
        api.get('/api/referrals/stats'),
        api.get('/api/referrals/my-code'),
        api.get('/api/referrals/referred-users')
      ]);

      setStats(statsRes.data);
      setReferralCode(codeRes.data.referralCode);
      setReferredUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!referralCode) {
      alert('Referral code is not available yet. Please refresh the page or contact support.');
      return;
    }
    navigator.clipboard.writeText(referralCode);
    alert('Referral code copied to clipboard!');
  };

  const shareReferralLink = () => {
    if (!referralCode) {
      alert('Referral code is not available yet. Please refresh the page or contact support.');
      return;
    }
    const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Responsive */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Referral Program</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Earn commissions from your referrals and platform bonuses</p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => router.back()}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm sm:text-base"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Referral Code Section - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm sm:shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Your Referral Code</h2>
          
          {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
          <div className="space-y-4 sm:space-y-0 sm:flex sm:items-start sm:gap-4">
            {/* Code Input Section */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <input
                  type="text"
                  value={referralCode || "Generating..."}
                  readOnly
                  className="flex-1 px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-base sm:text-lg text-center sm:text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Generating referral code..."
                />
                <button
                  onClick={copyReferralCode}
                  disabled={!referralCode}
                  className={`w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg transition-colors font-medium text-sm sm:text-base min-h-[44px] ${
                    referralCode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Copy Code
                </button>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {referralCode 
                  ? "Share this code with friends to earn commissions from their transactions"
                  : "Referral code is being generated... Please refresh the page if it doesn't appear."
                }
              </p>
            </div>
            
            {/* Share Link Button - Mobile: Full width, Desktop: Side */}
            <div className="sm:flex-shrink-0">
              <button
                onClick={shareReferralLink}
                disabled={!referralCode}
                className={`w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg transition-colors font-medium text-sm sm:text-base min-h-[44px] ${
                  referralCode 
                    ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Share Link
              </button>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 text-center sm:text-left hidden sm:block">Copy referral link</p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Mobile Optimized Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm sm:shadow-md p-4 sm:p-6">
            <div className="flex items-center sm:items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Referrals</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{stats?.totalReferrals || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm sm:shadow-md p-4 sm:p-6">
            <div className="flex items-center sm:items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Referrals</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{stats?.activeReferrals || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm sm:shadow-md p-4 sm:p-6">
            <div className="flex items-center sm:items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Earnings</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 mt-1 truncate">
                  {formatCurrency(stats?.earnings?.total_earnings || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm sm:shadow-md p-4 sm:p-6">
            <div className="flex items-center sm:items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending Earnings</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 mt-1 truncate">
                  {formatCurrency(stats?.earnings?.pending_earnings || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm sm:shadow-md overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-0 sm:space-x-8 px-4 sm:px-6 min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 sm:py-4 px-3 sm:px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap min-w-[80px] sm:min-w-0 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 active:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`py-3 sm:py-4 px-3 sm:px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap min-w-[100px] sm:min-w-0 ${
                  activeTab === 'referrals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 active:text-gray-900'
                }`}
              >
                Referred Users
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`py-3 sm:py-4 px-3 sm:px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap min-w-[120px] sm:min-w-0 ${
                  activeTab === 'earnings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 active:text-gray-900'
                }`}
              >
                Earnings History
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Show who referred you */}
                {stats?.referredBy && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3 sm:ml-4 flex-1">
                        <h4 className="text-sm sm:text-base font-medium text-blue-900 mb-1">You were referred by</h4>
                        <p className="text-sm text-blue-700">
                          <span className="font-semibold">{stats.referredBy.referrer_name}</span>
                          {stats.referredBy.referrer_email && (
                            <span className="text-blue-600"> ({stats.referredBy.referrer_email})</span>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-blue-600 mt-1">
                          Referral date: {formatDate(stats.referredBy.referral_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Commission Breakdown</h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-center py-2 sm:py-0">
                        <span className="text-sm sm:text-base text-gray-600">Transaction Commissions</span>
                        <span className="text-sm sm:text-base font-medium text-gray-900">{formatCurrency(stats?.earnings?.total_commissions || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 sm:py-0">
                        <span className="text-sm sm:text-base text-gray-600">Platform Bonuses</span>
                        <span className="text-sm sm:text-base font-medium text-gray-900">{formatCurrency(stats?.earnings?.total_bonuses || 0)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3 mt-2 sm:mt-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm sm:text-base font-medium text-gray-900">Total Earnings</span>
                          <span className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(stats?.earnings?.total_earnings || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">How It Works</h3>
                    <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-start">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-blue-600">1</span>
                        </div>
                        <p className="pt-0.5">Share your referral code with friends</p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-blue-600">2</span>
                        </div>
                        <p className="pt-0.5">They sign up using your code</p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-blue-600">3</span>
                        </div>
                        <p className="pt-0.5">Earn 2.5% commission from their transactions</p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-blue-600">4</span>
                        </div>
                        <p className="pt-0.5">Get $10 bonus for each successful referral</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'referrals' && (
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Your Referred Users</h3>
                {referredUsers.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="mt-2 text-sm sm:text-base text-gray-500">No referrals yet</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Start sharing your referral code to earn commissions!</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: Card Layout */}
                    <div className="block sm:hidden space-y-3">
                      {referredUsers.map((user) => (
                        <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{user.full_name}</div>
                              <div className="text-xs text-gray-500 truncate mt-1">{user.email}</div>
                            </div>
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                              user.referral_status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.referral_status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Signup:</span>
                            <span className="text-gray-900 font-medium">{formatDate(user.signup_date)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Earnings:</span>
                            <span className="text-gray-900 font-semibold">{formatCurrency(user.total_earnings_from_user)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table Layout */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Signup Date
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Earnings From User
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {referredUsers.map((user) => (
                            <tr key={user.id}>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(user.signup_date)}
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.referral_status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {user.referral_status}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(user.total_earnings_from_user)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Earnings History</h3>
                <div className="space-y-3 sm:space-y-4">
                  {stats?.recentCommissions?.map((commission, index) => (
                    <div key={index} className="flex items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                      <div className="flex items-start sm:items-center flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3 sm:mr-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Commission from {commission.referred_user_name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            <span className="hidden sm:inline">{commission.transaction_type} • </span>
                            {formatDate(commission.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-green-600">
                          +{formatCurrency(commission.commission_amount)}
                        </p>
                        <p className="text-xs text-gray-500">{commission.currency}</p>
                      </div>
                    </div>
                  ))}

                  {stats?.recentBonuses?.map((bonus, index) => (
                    <div key={index} className="flex items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                      <div className="flex items-start sm:items-center flex-1 min-w-0">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3 sm:mr-4">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {bonus.bonus_type} bonus from {bonus.referred_user_name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                            {bonus.description} • {formatDate(bonus.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-green-600">
                          +{formatCurrency(bonus.bonus_amount)}
                        </p>
                        <p className="text-xs text-gray-500">{bonus.currency}</p>
                      </div>
                    </div>
                  ))}

                  {(!stats?.recentCommissions?.length && !stats?.recentBonuses?.length) && (
                    <div className="text-center py-8 sm:py-12">
                      <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <p className="mt-2 text-sm sm:text-base text-gray-500">No earnings yet</p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">Start referring users to earn commissions and bonuses!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
