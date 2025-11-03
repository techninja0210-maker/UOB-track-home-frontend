'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface TradingBot {
  id: string;
  name: string;
  strategy_type: string;
  status: string;
  is_paper_trading: boolean;
  exchange: string;
  trading_pairs: string[];
  risk_params: any;
  strategy_params: any;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  daily_pnl: number;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
}

interface BotStats {
  totalBots: number;
  runningBots: number;
  totalTrades: number;
  totalPnl: number;
}

export default function AdminAITradingPage() {
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [stats, setStats] = useState<BotStats>({
    totalBots: 0,
    runningBots: 0,
    totalTrades: 0,
    totalPnl: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'trades' | 'pnl' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    loadBots();
    
    // Reduced auto-refresh to every 60 seconds (1 minute) for better UX
    // Users can manually refresh using the refresh button
    const interval = setInterval(() => {
      loadBots();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadBots = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      
      const response = await api.get('/api/ai-trading/admin/bots');
      
      if (response.data.success) {
        setBots(response.data.bots);
        
        const totalBots = response.data.bots.length;
        const runningBots = response.data.bots.filter((bot: TradingBot) => bot.status === 'running').length;
        const totalTrades = response.data.bots.reduce((sum: number, bot: TradingBot) => sum + bot.total_trades, 0);
        const totalPnl = response.data.bots.reduce((sum: number, bot: TradingBot) => sum + bot.total_pnl, 0);
        
        setStats({
          totalBots,
          runningBots,
          totalTrades,
          totalPnl
        });
        
        setLastRefresh(new Date());
      }
    } catch (error: any) {
      console.error('Error loading bots:', error);
      setError(error.response?.data?.message || 'Failed to load trading bots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/start`);
      loadBots(true);
    } catch (error: any) {
      console.error('Error starting bot:', error);
      alert(error.response?.data?.message || 'Failed to start bot');
    }
  };

  const handleStopBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/stop`);
      loadBots(true);
    } catch (error: any) {
      console.error('Error stopping bot:', error);
      alert(error.response?.data?.message || 'Failed to stop bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/api/ai-trading/bots/${botId}`);
      loadBots(true);
    } catch (error: any) {
      console.error('Error deleting bot:', error);
      alert(error.response?.data?.message || 'Failed to delete bot');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped':
      case 'paused':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSort = (column: 'name' | 'status' | 'trades' | 'pnl' | 'created') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedBots = [...bots].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      case 'trades':
        aValue = a.total_trades;
        bValue = b.total_trades;
        break;
      case 'pnl':
        aValue = a.total_pnl;
        bValue = b.total_pnl;
        break;
      case 'created':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return (
      <svg className={`w-4 h-4 inline-block ml-1 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Trading Bots</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor and manage all automated trading bots
              {lastRefresh && isClient && (
                <span className="ml-2 text-xs text-gray-400">
                  • Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refresh: 60s
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => loadBots(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bots</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalBots}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Running</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.runningBots}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Trades</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalTrades.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total P&L</dt>
                    <dd className={`text-lg font-semibold ${stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.totalPnl)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bots Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading trading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No trading bots</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new trading bot.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[140px]" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Bot Name
                        <SortIcon column="name" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        <SortIcon column="status" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      Owner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Strategy
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Trading Pairs
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('trades')}>
                      <div className="flex items-center">
                        Trades
                        <SortIcon column="trades" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pnl')}>
                      <div className="flex items-center">
                        Total P&L
                        <SortIcon column="pnl" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[200px]" onClick={() => handleSort('created')}>
                      <div className="flex items-center">
                        Created
                        <SortIcon column="created" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedBots.map((bot) => (
                    <tr key={bot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 min-w-[140px]">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 break-words">{bot.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {bot.is_paper_trading ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                  Paper
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                  Live
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(bot.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${bot.status === 'running' ? 'bg-green-500' : bot.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                          {bot.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[180px]">
                        <div className="text-sm text-gray-900 break-words">{bot.user_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 break-all">{bot.user_email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{bot.strategy_type}</span>
                      </td>
                      <td className="px-6 py-4 min-w-[120px]">
                        <div className="flex flex-wrap gap-1">
                          {bot.trading_pairs && bot.trading_pairs.length > 0 ? (
                            bot.trading_pairs.slice(0, 2).map((pair, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                                {pair}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {bot.trading_pairs && bot.trading_pairs.length > 2 && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">+{bot.trading_pairs.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bot.total_trades}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {bot.total_trades > 0
                            ? `${Math.round((bot.winning_trades / bot.total_trades) * 100)}%`
                            : '0%'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${bot.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(bot.total_pnl)}
                        </div>
                        {bot.daily_pnl !== 0 && (
                          <div className={`text-xs ${bot.daily_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {bot.daily_pnl >= 0 ? '+' : ''}{formatCurrency(bot.daily_pnl)} today
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="text-sm text-gray-900 break-words">{formatDate(bot.created_at)}</div>
                        {bot.last_run_at && (
                          <div className="text-xs text-gray-500 break-words mt-1">Last: {formatDate(bot.last_run_at)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {bot.status === 'running' ? (
                            <button
                              onClick={() => handleStopBot(bot.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Stop bot"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartBot(bot.id)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Start bot"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete bot"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
