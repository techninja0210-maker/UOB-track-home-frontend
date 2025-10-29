'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Bot {
  id: string;
  name: string;
  strategy_type: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  is_paper_trading: boolean;
  exchange: string;
  trading_pairs: string[];
  risk_settings: any;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  daily_pnl: number;
  created_at: string;
  last_run_at: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  status: string;
  signal_strength: number;
  strategy_signal: string;
  created_at: string;
  pnl: number;
}

export default function AITradingPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [showBotDetails, setShowBotDetails] = useState<string | null>(null);
  const [botActivity, setBotActivity] = useState<{[key: string]: any}>({});
  const [marketPrices, setMarketPrices] = useState({
    BTCUSDT: { price: 0, change24h: 0 },
    ETHUSDT: { price: 0, change24h: 0 },
    ADAUSDT: { price: 0, change24h: 0 },
    SOLUSDT: { price: 0, change24h: 0 }
  });
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date>(new Date());
  const [newBot, setNewBot] = useState({
    name: '',
    strategy_type: 'sma_crossover',
    trading_pairs: ['BTCUSDT', 'ETHUSDT'],
    exchange: 'binance',
    is_paper_trading: true,
    risk_params: {
      max_position_size: 1000,
      stop_loss_percent: 2,
      take_profit_percent: 4,
      daily_loss_limit_percent: 5,
      max_open_positions: 3
    },
    strategy_params: {
      max_position_size: 1000,
      stop_loss_percent: 2,
      take_profit_percent: 4,
      daily_loss_limit_percent: 5,
      max_open_positions: 3
    }
  });

  useEffect(() => {
    fetchBots();
    fetchMarketPrices();
    
    // Auto-refresh bot data every 5 seconds
    const interval = setInterval(() => {
      fetchBots();
    }, 5000);
    
    // Auto-refresh market prices every 30 seconds
    const marketInterval = setInterval(() => {
      fetchMarketPrices();
    }, 30000);
    
    return () => {
      clearInterval(interval);
      clearInterval(marketInterval);
    };
  }, []);

  // Separate effect for fetching activity of running bots
  useEffect(() => {
    if (bots.length > 0) {
      const runningBots = bots.filter(bot => bot.status === 'running');
      runningBots.forEach(bot => {
        // Set default activity data immediately for running bots
        setBotActivity(prev => ({
          ...prev,
          [bot.id]: {
            status: 'Active - Monitoring markets',
            lastSignal: 'Analyzing market conditions...',
            marketAnalysis: 'Market analysis in progress...',
            recentTrades: [],
            marketData: []
          }
        }));
        // Then try to fetch real activity data
        fetchBotActivity(bot.id);
      });
    }
  }, [bots]);

  const fetchBots = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/ai-trading/bots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketPrices = async () => {
    try {
      // Fetch real-time prices from backend (which uses Binance API)
      const response = await fetch('http://localhost:5000/api/prices/crypto');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Real crypto prices fetched from Binance via backend:', data);
        
        setMarketPrices({
          BTCUSDT: { 
            price: data.BTC || 112547, 
            change24h: data.BTC_change24h || 0
          },
          ETHUSDT: { 
            price: data.ETH || 3972, 
            change24h: data.ETH_change24h || 0
          },
          ADAUSDT: { 
            price: data.ADA || 0.45, 
            change24h: data.ADA_change24h || 0
          },
          SOLUSDT: { 
            price: data.SOL || 98.50, 
            change24h: data.SOL_change24h || 0
          }
        });
        setLastPriceUpdate(new Date());
      } else {
        // Fallback to CoinGecko API directly
        const coinGeckoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana&vs_currencies=usd&include_24hr_change=true');
        
        if (coinGeckoResponse.ok) {
          const coinGeckoData = await coinGeckoResponse.json();
          console.log('Fallback to CoinGecko API:', coinGeckoData);
          
          setMarketPrices({
            BTCUSDT: { 
              price: coinGeckoData.bitcoin?.usd || 112547, 
              change24h: coinGeckoData.bitcoin?.usd_24h_change || 0
            },
            ETHUSDT: { 
              price: coinGeckoData.ethereum?.usd || 3972, 
              change24h: coinGeckoData.ethereum?.usd_24h_change || 0
            },
            ADAUSDT: { 
              price: coinGeckoData.cardano?.usd || 0.45, 
              change24h: coinGeckoData.cardano?.usd_24h_change || 0
            },
            SOLUSDT: { 
              price: coinGeckoData.solana?.usd || 98.50, 
              change24h: coinGeckoData.solana?.usd_24h_change || 0
            }
          });
          setLastPriceUpdate(new Date());
        } else {
          throw new Error(`Both APIs failed: Backend ${response.status}, CoinGecko ${coinGeckoResponse.status}`);
        }
      }
    } catch (error) {
      console.error('Error fetching market prices:', error);
      // Use current market data as fallback if all APIs fail
      setMarketPrices({
        BTCUSDT: { price: 112547, change24h: 2.3 },
        ETHUSDT: { price: 3972, change24h: 1.8 },
        ADAUSDT: { price: 0.45, change24h: -0.5 },
        SOLUSDT: { price: 98.50, change24h: 3.2 }
      });
    }
  };

  const fetchTrades = async (botId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/ai-trading/bots/${botId}/trades`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const fetchBotActivity = async (botId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/ai-trading/bots/${botId}/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBotActivity(prev => ({
          ...prev,
          [botId]: data
        }));
      } else {
        // If activity endpoint fails, set default activity data
        setBotActivity(prev => ({
          ...prev,
          [botId]: {
            status: 'Active - Monitoring markets',
            lastSignal: 'Analyzing market conditions...',
            marketAnalysis: 'Market analysis in progress...',
            recentTrades: [],
            marketData: []
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching bot activity:', error);
      // Set default activity data on error
      setBotActivity(prev => ({
        ...prev,
        [botId]: {
          status: 'Active - Monitoring markets',
          lastSignal: 'Analyzing market conditions...',
          marketAnalysis: 'Market analysis in progress...',
          recentTrades: [],
          marketData: []
        }
      }));
    }
  };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/ai-trading/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newBot.name,
          strategy_type: newBot.strategy_type,
          exchange: newBot.exchange,
          trading_pairs: newBot.trading_pairs.filter(pair => pair.trim() !== ''),
          is_paper_trading: newBot.is_paper_trading,
          risk_params: {
            max_position_size: 1000,
            stop_loss_percent: 2,
            take_profit_percent: 4,
            daily_loss_limit_percent: 5,
            max_open_positions: 3
          },
          strategy_params: {
            max_position_size: 1000,
            stop_loss_percent: 2,
            take_profit_percent: 4,
            daily_loss_limit_percent: 5,
            max_open_positions: 3
          }
        })
      });
      
      if (response.ok) {
        await fetchBots();
        setShowCreateBot(false);
        setNewBot({
          name: '',
          strategy_type: 'sma_crossover',
          trading_pairs: ['BTCUSDT', 'ETHUSDT'],
          exchange: 'binance',
          is_paper_trading: true,
          risk_params: {
            max_position_size: 1000,
            stop_loss_percent: 2,
            take_profit_percent: 4,
            daily_loss_limit_percent: 5,
            max_open_positions: 3
          },
          strategy_params: {
            max_position_size: 1000,
            stop_loss_percent: 2,
            take_profit_percent: 4,
            daily_loss_limit_percent: 5,
            max_open_positions: 3
          }
        });
      }
    } catch (error) {
      console.error('Error creating bot:', error);
    }
  };

  const startBot = async (botId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/ai-trading/bots/${botId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await fetchBots();
      }
    } catch (error) {
      console.error('Error starting bot:', error);
    }
  };

  const stopBot = async (botId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/ai-trading/bots/${botId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await fetchBots();
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  };

  const pauseBot = async (botId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/ai-trading/bots/${botId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await fetchBots();
      }
    } catch (error) {
      console.error('Error pausing bot:', error);
    }
  };

  const resumeBot = async (botId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/ai-trading/bots/${botId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await fetchBots();
      }
    } catch (error) {
      console.error('Error resuming bot:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-gray-600 bg-gray-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Trading Dashboard</h1>
              <p className="mt-2 text-gray-600">Automated trading with AI-powered strategies</p>
            </div>
            <button
              onClick={() => setShowCreateBot(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Bot
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">🤖</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Bots</p>
                <p className="text-2xl font-semibold text-gray-900">{bots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-sm font-medium">▶</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Bots</p>
                <p className="text-2xl font-semibold text-gray-900">{bots.filter(bot => bot.status === 'running').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-sm font-medium">💰</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total P&L</p>
                <p className={`text-2xl font-semibold ${getPnLColor((bots || []).reduce((sum, bot) => sum + (Number(bot.total_pnl) || 0), 0))}`}>
                  ${(bots || []).reduce((sum, bot) => sum + (Number(bot.total_pnl) || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-medium">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Trades</p>
                <p className="text-2xl font-semibold text-gray-900">{(bots || []).reduce((sum, bot) => sum + (Number(bot.total_trades) || 0), 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Prices Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Live Market Prices</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">BTCUSDT</div>
                  <div className="text-lg font-semibold text-gray-900">${marketPrices.BTCUSDT.price.toLocaleString()}</div>
                  <div className={`text-sm ${marketPrices.BTCUSDT.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketPrices.BTCUSDT.change24h >= 0 ? '+' : ''}{marketPrices.BTCUSDT.change24h}% (24h)
                  </div>
                </div>
                <div className="text-2xl">₿</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">ETHUSDT</div>
                  <div className="text-lg font-semibold text-gray-900">${marketPrices.ETHUSDT.price.toLocaleString()}</div>
                  <div className={`text-sm ${marketPrices.ETHUSDT.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketPrices.ETHUSDT.change24h >= 0 ? '+' : ''}{marketPrices.ETHUSDT.change24h}% (24h)
                  </div>
                </div>
                <div className="text-2xl">Ξ</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">ADAUSDT</div>
                  <div className="text-lg font-semibold text-gray-900">${marketPrices.ADAUSDT.price}</div>
                  <div className={`text-sm ${marketPrices.ADAUSDT.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketPrices.ADAUSDT.change24h >= 0 ? '+' : ''}{marketPrices.ADAUSDT.change24h}% (24h)
                  </div>
                </div>
                <div className="text-2xl">₳</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">SOLUSDT</div>
                  <div className="text-lg font-semibold text-gray-900">${marketPrices.SOLUSDT.price}</div>
                  <div className={`text-sm ${marketPrices.SOLUSDT.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketPrices.SOLUSDT.change24h >= 0 ? '+' : ''}{marketPrices.SOLUSDT.change24h}% (24h)
                  </div>
                </div>
                <div className="text-2xl">◎</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 text-center">
            Prices update every 30 seconds • Last updated: {lastPriceUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Bots Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Trading Bots</h3>
          </div>
          
          {!bots || bots.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Trading Bots</h3>
                <p className="text-gray-500">You haven't created any trading bots yet.</p>
                <button
                  onClick={() => setShowCreateBot(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Bot
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trades</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bots.map((bot) => (
                    <React.Fragment key={bot.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">🤖</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{bot.name}</div>
                              <div className="text-sm text-gray-500">{bot.trading_pairs.join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">{bot.strategy_type.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-500">{bot.exchange}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bot.status)}`}>
                            {bot.status === 'running' && '● Live'} {bot.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getPnLColor(Number(bot.total_pnl) || 0)}`}>
                            ${(Number(bot.total_pnl) || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Daily: ${(Number(bot.daily_pnl) || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Number(bot.total_trades) || 0}
                          <div className="text-sm text-gray-500">
                            Win Rate: {bot.total_trades > 0 ? Math.round(((Number(bot.winning_trades) || 0) / (Number(bot.total_trades) || 1)) * 100) : 0}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {bot.status === 'running' ? (
                            <>
                              <button
                                onClick={() => pauseBot(bot.id)}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Pause
                              </button>
                              <button
                                onClick={() => stopBot(bot.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Stop
                              </button>
                            </>
                          ) : bot.status === 'paused' ? (
                            <>
                              <button
                                onClick={() => resumeBot(bot.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Resume
                              </button>
                              <button
                                onClick={() => stopBot(bot.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Stop
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startBot(bot.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBot(bot);
                              fetchTrades(bot.id);
                              setShowBotDetails(showBotDetails === bot.id ? null : bot.id);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {showBotDetails === bot.id ? 'Hide Details' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Bot Details Row */}
                      {showBotDetails === bot.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Bot Activity & Performance</h4>
                              {bot.status === 'running' ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-green-50 p-3 rounded-lg">
                                      <div className="text-xs text-green-600 font-medium">Current Status</div>
                                      <div className="text-sm text-green-800">
                                        {botActivity[bot.id]?.status || 'Analyzing markets...'}
                                      </div>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                      <div className="text-xs text-blue-600 font-medium">Last Signal</div>
                                      <div className="text-sm text-blue-800">
                                        {botActivity[bot.id]?.lastSignal || 'No recent signals'}
                                      </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                      <div className="text-xs text-purple-600 font-medium">Market Analysis</div>
                                      <div className="text-sm text-purple-800">
                                        {botActivity[bot.id]?.marketAnalysis || 'Analysis in progress...'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Recent Activity Log */}
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-600 font-medium mb-2">Recent Activity</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {botActivity[bot.id]?.recentTrades?.length > 0 ? (
                                        botActivity[bot.id].recentTrades.map((trade: any, index: number) => (
                                          <div key={index} className="text-xs text-gray-700 flex justify-between">
                                            <span className={`font-medium ${trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                                              {trade.side.toUpperCase()} {trade.symbol}
                                            </span>
                                            <span>${trade.price} • {new Date(trade.created_at).toLocaleTimeString()}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-xs text-gray-500">No recent trades</div>
                                      )}
                                    </div>
                                  </div>
                                  
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <div className="text-sm">Bot is not running</div>
                                  <div className="text-xs mt-1">Start the bot to see live activity</div>
                                </div>
                              )}
                              <div className="mt-4">
                                <button
                                  onClick={() => {
                                    setSelectedBot(bot);
                                    fetchTrades(bot.id);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View Trade History →
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Bot Modal */}
      {showCreateBot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Trading Bot</h3>
                <button
                  onClick={() => setShowCreateBot(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={createBot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bot Name</label>
                  <input
                    type="text"
                    value={newBot.name}
                    onChange={(e) => setNewBot({...newBot, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="My Trading Bot"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Strategy</label>
                  <select
                    value={newBot.strategy_type}
                    onChange={(e) => setNewBot({...newBot, strategy_type: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sma_crossover">SMA Crossover</option>
                    <option value="rsi_strategy">RSI Strategy</option>
                    <option value="bollinger_bands">Bollinger Bands</option>
                    <option value="momentum">Momentum</option>
                    <option value="dca">Dollar Cost Averaging</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trading Pairs</label>
                  <div className="mt-2 space-y-2">
                    {newBot.trading_pairs.map((pair, index) => (
                      <div key={index} className="flex">
                        <input
                          type="text"
                          value={pair}
                          onChange={(e) => {
                            const newPairs = [...newBot.trading_pairs];
                            newPairs[index] = e.target.value;
                            setNewBot({...newBot, trading_pairs: newPairs});
                          }}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="BTCUSDT"
                        />
                        {newBot.trading_pairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPairs = newBot.trading_pairs.filter((_, i) => i !== index);
                              setNewBot({...newBot, trading_pairs: newPairs});
                            }}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewBot({...newBot, trading_pairs: [...newBot.trading_pairs, '']})}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Trading Pair
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Exchange</label>
                  <select
                    value={newBot.exchange}
                    onChange={(e) => setNewBot({...newBot, exchange: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="binance">Binance</option>
                    <option value="coinbase">Coinbase</option>
                    <option value="kraken">Kraken</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="paper_trading"
                    checked={newBot.is_paper_trading}
                    onChange={(e) => setNewBot({...newBot, is_paper_trading: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="paper_trading" className="ml-2 block text-sm text-gray-700">
                    Paper Trading (Test Mode)
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateBot(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Create Bot
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
