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

  useEffect(() => {
    loadBots();
    
    // Auto-refresh every 10 seconds to keep data synchronized
    const interval = setInterval(() => {
      loadBots();
    }, 10000);
    
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
      
      const response = await api.get('/api/ai-trading/bots');
      
      if (response.data.success) {
        setBots(response.data.bots);
        
        // Calculate stats
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
      }
    } catch (error: any) {
      console.error('Error loading bots:', error);
      setError(error.response?.data?.message || 'Failed to load trading bots');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefresh(new Date());
    }
  };

  const handleStartBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/start`);
      // Add a small delay to ensure database update is complete
      setTimeout(() => {
        loadBots(); // Refresh the list
      }, 1000);
    } catch (error: any) {
      console.error('Error starting bot:', error);
      setError(error.response?.data?.message || 'Failed to start bot');
    }
  };

  const handleStopBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/stop`);
      // Add a small delay to ensure database update is complete
      setTimeout(() => {
        loadBots(); // Refresh the list
      }, 1000);
    } catch (error: any) {
      console.error('Error stopping bot:', error);
      setError(error.response?.data?.message || 'Failed to stop bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/ai-trading/bots/${botId}`);
      await loadBots(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting bot:', error);
      setError(error.response?.data?.message || 'Failed to delete bot');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout title="AI Trading Management" subtitle="Manage and monitor AI trading bots">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">🤖</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bots</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalBots}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">▶️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Running Bots</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.runningBots}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Trades</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalTrades}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total P&L</dt>
                    <dd className={`text-lg font-medium ${stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.totalPnl)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bots Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Trading Bots</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage all AI trading bots in the system
                  {lastRefresh && (
                    <span className="ml-2 text-xs text-gray-400">
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => loadBots(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-5 sm:px-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          ) : bots.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Trading Bots</h3>
                <p className="text-gray-500">No trading bots have been created yet.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {bots.map((bot) => (
                <li key={bot.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {bot.name}
                          </h4>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Strategy: {bot.strategy_type}</span>
                            <span>•</span>
                            <span>Exchange: {bot.exchange}</span>
                            <span>•</span>
                            <span>Pairs: {bot.trading_pairs.join(', ')}</span>
                            <span>•</span>
                            <span className={bot.is_paper_trading ? 'text-blue-600' : 'text-green-600'}>
                              {bot.is_paper_trading ? 'Paper Trading' : 'Live Trading'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                            {bot.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Trades:</span>
                          <span className="ml-1 font-medium">{bot.total_trades}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Win Rate:</span>
                          <span className="ml-1 font-medium">
                            {bot.total_trades > 0 ? Math.round((bot.winning_trades / bot.total_trades) * 100) : 0}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total P&L:</span>
                          <span className={`ml-1 font-medium ${bot.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(bot.total_pnl)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Daily P&L:</span>
                          <span className={`ml-1 font-medium ${bot.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(bot.daily_pnl)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        Created: {formatDate(bot.created_at)}
                        {bot.last_run_at && (
                          <span className="ml-4">Last Run: {formatDate(bot.last_run_at)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      {bot.status === 'running' ? (
                        <button
                          onClick={() => handleStopBot(bot.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartBot(bot.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Start
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteBot(bot.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
