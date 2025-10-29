'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { formatCurrency, formatNumber, formatCompact } from '@/lib/formatters';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface KPIData {
  totalUsers: number;
  activeUsers: number;
  totalGold: number;
  totalCryptoVolume: number;
  totalTransactions: number;
  systemStatus: string;
}

interface ChartData {
  date: string;
  volume: number;
  transactions: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  value: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 0,
    activeUsers: 0,
    totalGold: 0,
    totalCryptoVolume: 0,
    totalTransactions: 0,
    systemStatus: 'Active'
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [selectedChartPeriod, setSelectedChartPeriod] = useState('30 Days');
  const [loading, setLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedChartPeriod]);

  const loadChartData = async () => {
    try {
      setChartLoading(true);
      const days = selectedChartPeriod === '7 Days' ? 7 : selectedChartPeriod === '30 Days' ? 30 : 90;
      const chartResponse = await api.get(`/api/admin/chart-data?days=${days}`);
      if (chartResponse.data && Array.isArray(chartResponse.data)) {
        // Process and validate chart data
        const processedData = chartResponse.data.map(item => ({
          date: item.date,
          volume: parseFloat(item.volume) || 0,
          transactions: parseInt(item.transactions) || 0
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setChartData(processedData);
      }
    } catch (chartError) {
      console.error('Error loading chart data:', chartError);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load KPI data
      const kpiResponse = await api.get('/api/admin/kpis');
      if (kpiResponse.data) {
      setKpiData(kpiResponse.data);
      }

      // Load initial chart data
      await loadChartData();

      // Load recent activities
      setActivitiesLoading(true);
      try {
      const activitiesResponse = await api.get('/api/admin/recent-activities');
        if (activitiesResponse.data && Array.isArray(activitiesResponse.data)) {
          // Validate and sanitize activity data
          const validActivities = activitiesResponse.data.filter(activity => 
            activity && 
            activity.id && 
            activity.type && 
            activity.description && 
            activity.timestamp
          ).map(activity => ({
            id: String(activity.id),
            type: String(activity.type),
            description: String(activity.description),
            value: activity.value ? String(activity.value) : '',
            timestamp: String(activity.timestamp)
          }));
          setRecentActivities(validActivities);
        }
      } catch (activitiesError) {
        console.error('Error loading recent activities:', activitiesError);
        // Keep existing activities or set empty array
        setRecentActivities([]);
      } finally {
        setActivitiesLoading(false);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set mock data if API fails
      setKpiData({
        totalUsers: 1,
        activeUsers: 1,
        totalGold: 0,
        totalCryptoVolume: 0,
        totalTransactions: 0,
        systemStatus: 'Active'
      });
      setRecentActivities([
        {
          id: '1',
          type: 'user',
          description: 'Admin user logged in',
          value: '',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
      case 'user_registered':
        return (
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case 'transaction':
        return (
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
      case 'receipt_created':
        return (
          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'crowdfunding':
        return (
          <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        );
      case 'system':
        return (
          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'gold':
        return (
          <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-yellow-600 text-sm">🥇</span>
          </div>
        );
      default:
    return (
          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
      </div>
    );
  }
  };


  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor and manage the platform</p>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(kpiData.totalUsers)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(kpiData.activeUsers)} active</p>
      </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Gold Holdings</p>
                <p className="text-2xl font-bold text-yellow-600">{formatNumber(kpiData.totalGold, 4)} g</p>
                <p className="text-xs text-gray-500 mt-1">Across all users</p>
        </div>
              <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-xl">🥇</span>
              </div>
              </div>
            </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Crypto Volume</p>
                <p className="text-2xl font-bold text-green-600">{formatCompact(kpiData.totalCryptoVolume)}</p>
                <p className="text-xs text-gray-500 mt-1">Total trading volume</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            </div>
              </div>
            </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(kpiData.totalTransactions)}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">{kpiData.systemStatus}</p>
                <p className="text-xs text-gray-500 mt-1">All systems operational</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Trading Volume</h3>
              <select
                value={selectedChartPeriod}
                onChange={(e) => setSelectedChartPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="7 Days">7 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>
            
            <div className="h-64">
              {chartLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-16 w-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="h-8 w-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
              </div>
                    <p className="text-gray-500">Loading chart data...</p>
                </div>
                </div>
              ) : chartData && chartData.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Chart Header */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-600">
                      Total Volume: ${chartData.reduce((sum, item) => sum + (item.volume || 0), 0).toLocaleString()}
                </div>
                    <div className="text-sm text-gray-600">
                      {chartData.length} days
              </div>
            </div>
            
                  {/* Simple Bar Chart */}
                  <div className="flex-1 flex items-end justify-between space-x-1 px-2">
                    {chartData.map((item, index) => {
                      const maxVolume = Math.max(...chartData.map(d => d.volume || 0));
                      const height = maxVolume > 0 ? ((item.volume || 0) / maxVolume) * 80 + 10 : 10; // 10% minimum height
                      const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 max-w-[60px]">
                          <div className="w-full bg-gray-100 rounded-t-sm relative group h-32 flex items-end">
                            <div 
                              className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600 shadow-sm"
                              style={{ height: `${height}%` }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                <div>Date: {date}</div>
                                <div>Volume: ${(item.volume || 0).toLocaleString()}</div>
                                <div>Transactions: {item.transactions || 0}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left whitespace-nowrap">
                            {date}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Chart Legend */}
                  <div className="flex justify-center mt-4 space-x-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm text-gray-600">Trading Volume</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
                    </div>
                    <p className="text-gray-500">No trading data available</p>
                    <p className="text-sm text-gray-400">Data will appear when transactions are made</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
              <button
                onClick={() => {
                  setActivitiesLoading(true);
                  loadDashboardData();
                }}
                disabled={activitiesLoading}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activitiesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Loading activities...</p>
                </div>
              ) : recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.description || 'Unknown activity'}</p>
                      {activity.value && (
                        <p className="text-sm text-gray-500">{activity.value}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                    </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="h-16 w-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No recent activities</p>
              </div>
              )}
            </div>
                </div>
              </div>
              
        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/users"
              className="bg-white border border-gray-300 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200 text-center"
            >
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                </div>
              <p className="font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">View and manage user accounts</p>
            </a>

            <a
              href="/admin/gold-pricing"
              className="bg-white border border-gray-300 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200 text-center"
            >
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-yellow-600 text-xl">🥇</span>
                </div>
              <p className="font-medium text-gray-900">Gold Pricing</p>
              <p className="text-sm text-gray-500">Update gold prices and settings</p>
            </a>

            <a
              href="/admin/skrs"
              className="bg-white border border-gray-300 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200 text-center"
            >
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">SKR Management</p>
              <p className="text-sm text-gray-500">Manage gold holdings and receipts</p>
            </a>

            <a
              href="/admin/transactions"
              className="bg-white border border-gray-300 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200 text-center"
            >
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </div>
              <p className="font-medium text-gray-900">Transactions</p>
              <p className="text-sm text-gray-500">Monitor all platform transactions</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}