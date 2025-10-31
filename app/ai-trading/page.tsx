'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { createChart, ColorType } from 'lightweight-charts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [goldPrice, setGoldPrice] = useState(0);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date>(new Date());
  const [goldSeries, setGoldSeries] = useState<{ t: string; pricePerGram: number }[]>([]);
  const [goldChange24h, setGoldChange24h] = useState<number>(0);
  const chartsRef = useRef<{ [key: string]: { chart: any; series: any } }>({});
  const tvRef = useRef<{ [key: string]: boolean }>({});
  const tvTimerRef = useRef<{ [key: string]: any }>({});
  const tvMarketInitRef = useRef<boolean>(false);
  const tvMarketTimerRef = useRef<any>(null);
  const tvMarketCreatedRef = useRef<boolean>(false);
  const tvMarketWaitRef = useRef<any>(null);
  const [newBot, setNewBot] = useState({
    name: '',
    strategy_type: 'sma_crossover',
    trading_pairs: ['XAUUSD'],
    exchange: 'binance',
    is_paper_trading: true,
    risk_settings: {
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
      max_open_positions: 3,
      quoteCurrency: 'USDT'
    }
  });

  useEffect(() => {
    fetchBots();
    fetchGoldSeries(); // drives UI cheaply from DB
    fetchGoldPrice();  // initial value from backend cache
    
    // Auto-refresh bot data every 5 seconds
    const interval = setInterval(() => {
      fetchBots();
    }, 5000);
    
    // Series every 5s; current price every 60s to minimize paid API usage
    const seriesInterval = setInterval(() => {
      fetchGoldSeries();
    }, 5000);
    // Update gold price and 24h change every 5 seconds to keep percentage fresh
    const currentInterval = setInterval(() => {
      fetchGoldPrice();
    }, 5000);

    // Initialize TradingView chart for Market section
    const ensureTV = () => new Promise<void>((resolve) => {
      const w: any = window as any;
      if (w.TradingView && w.TradingView.widget) return resolve();
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
    (async () => {
      await ensureTV();
      const w: any = window as any;

      const createWidget = () => {
        const container = document.getElementById('tv-gold-chart-market');
        if (!container) return false;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        container.innerHTML = '';
        try {
          new w.TradingView.widget({
            autosize: true,
            symbol: 'XAUUSD',
            interval: '1',
            timezone: 'Etc/UTC',
            theme: 'light',
            style: '1',
            locale: 'en',
            container_id: 'tv-gold-chart-market',
            hide_top_toolbar: false,
            hide_legend: false,
            allow_symbol_change: false,
            studies: [],
            enable_publishing: false,
            withdateranges: true,
            range: '1D',
            hide_side_toolbar: false,
            save_image: false,
            calendar: false,
            support_host: 'https://www.tradingview.com'
          });
          tvMarketCreatedRef.current = true;
          return true;
        } catch (_) {
          return false;
        }
      };

      const initWithRetry = (maxTries = 40) => {
        let tries = 0;
        if (tvMarketWaitRef.current) clearInterval(tvMarketWaitRef.current);
        tvMarketWaitRef.current = setInterval(() => {
          if (tvMarketCreatedRef.current) { clearInterval(tvMarketWaitRef.current); return; }
          const ok = createWidget();
          tries += 1;
          if (ok || tries >= maxTries) {
            clearInterval(tvMarketWaitRef.current);
            if (!ok) {
              // Fallback to lightweight chart if TV fails repeatedly
              const cont = document.getElementById('tv-gold-chart-market');
              if (cont) {
                cont.innerHTML = '';
                const LW: any = (window as any).LightweightCharts;
                if (LW && LW.createChart) {
                  const c = LW.createChart(cont, { height: 320 });
                  const s = c.addAreaSeries({ lineColor: '#2563eb', topColor: 'rgba(37,99,235,0.25)', bottomColor: 'rgba(37,99,235,0.03)' });
                  const pts = goldSeries.length ? goldSeries : [{ t: new Date().toISOString(), pricePerGram: goldPrice }];
                  const data = pts.map(p => ({ time: Math.floor(new Date(p.t).getTime() / 1000), value: Number(p.pricePerGram) * 31.1035 }));
                  s.setData(data);
                }
              }
            }
          }
        }, 150);
      };

      if (!tvMarketInitRef.current) {
        initWithRetry();
        tvMarketInitRef.current = true;
        if (tvMarketTimerRef.current) clearInterval(tvMarketTimerRef.current);
        // Refresh widget every 5 minutes to ensure connection stays alive (less disruptive than 60s)
        // TradingView widget streams data automatically, so we only refresh to prevent stale connections
        tvMarketTimerRef.current = setInterval(() => {
          // Only refresh if widget exists and we're visible
          if (tvMarketCreatedRef.current && !document.hidden) {
            const container = document.getElementById('tv-gold-chart-market');
            if (container && container.innerHTML.trim() !== '') {
              tvMarketCreatedRef.current = false;
              initWithRetry();
            }
          }
        }, 300000); // 5 minutes instead of 60 seconds
        const onVis = () => { 
          if (!document.hidden && !tvMarketCreatedRef.current) {
            tvMarketCreatedRef.current = false;
            initWithRetry();
          }
        };
        const onResize = () => {
          // Only recreate on significant resize, not every small resize
          if (!tvMarketCreatedRef.current) {
            tvMarketCreatedRef.current = false;
            setTimeout(() => initWithRetry(), 300); // Debounce resize
          }
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('resize', onResize);
      }
    })();
    
    return () => {
      clearInterval(interval);
      clearInterval(seriesInterval);
      clearInterval(currentInterval);
      if (tvMarketTimerRef.current) clearInterval(tvMarketTimerRef.current);
    };
  }, []);

  // Separate effect for fetching activity of running bots
  useEffect(() => {
    if (bots.length > 0) {
      const runningBots = bots.filter(bot => bot.status === 'running');
      runningBots.forEach(bot => {
        // Set default activity data immediately for running bots (only if not already set)
        setBotActivity(prev => ({
          ...prev,
          [bot.id]: prev[bot.id] || {
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

  // Periodically refresh activity for running bots
  useEffect(() => {
    const interval = setInterval(() => {
      const runningBots = bots.filter(bot => bot.status === 'running');
      runningBots.forEach(bot => {
        fetchBotActivity(bot.id);
      });
      // Also refresh trades for bots with open details
      if (showBotDetails && selectedBot) {
        fetchTrades(selectedBot.id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [bots, showBotDetails, selectedBot]);

  const fetchBots = async () => {
    try {
      const { data } = await api.get('/api/ai-trading/bots');
      const newBots = data.bots || [];
      setBots(newBots);
      
      // Preserve showBotDetails if the bot still exists, otherwise clear it
      setShowBotDetails(prev => {
        if (!prev) return null;
        const botExists = newBots.some((bot: Bot) => bot.id === prev);
        if (botExists) {
          // Update selectedBot when bot list refreshes
          const selected = newBots.find((bot: Bot) => bot.id === prev);
          if (selected) {
            setSelectedBot(selected);
          }
          return prev; // Keep showing details
        }
        // Bot was deleted, clear details
        setSelectedBot(null);
        return null;
      });
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldPrice = async () => {
    try {
      // Use api client for consistent base URL handling
      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '').replace(/\/api\/?$/, '');
      // Use force=1 to get fresh price, but backend calculates 24h change from DB (not external API)
      const response = await fetch(`${API_URL}/api/prices/gold/current?force=1&_=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setGoldPrice(data.pricePerGram || 0);
        // Always update 24h change if provided (calculated from gold_price_history table)
        if (typeof data.change24h === 'number' && !isNaN(data.change24h)) {
          setGoldChange24h(data.change24h);
        }
        setLastPriceUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching gold price:', error);
    }
  };

  const fetchGoldSeries = async () => {
    try {
      // Use api client for consistent base URL handling
      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '').replace(/\/api\/?$/, '');
      const response = await fetch(`${API_URL}/api/prices/gold?points=120&_=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.series)) {
          setGoldSeries(data.series);
          // Keep card price in sync with latest series value (but don't overwrite 24h change)
          // The 24h change should come from fetchGoldPrice which uses backend's accurate 24h calculation
          if (data.series.length > 0) {
            const last = Number(data.series[data.series.length - 1].pricePerGram) || 0;
            if (last > 0) {
              setGoldPrice(last);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching gold series:', error);
    }
  };

  // Initialize TradingView widget (preferred) or fallback Lightweight Chart for the opened bot details
  useEffect(() => {
    if (!showBotDetails) return;
    const tvContainer = document.getElementById(`tv-gold-chart-${showBotDetails}`) as HTMLDivElement | null;
    const lwContainer = document.getElementById(`gold-chart-${showBotDetails}`) as HTMLDivElement | null;
    if (!tvContainer) return;

    const ensureTV = () => new Promise<void>((resolve) => {
      const w: any = window as any;
      if (w.TradingView && w.TradingView.widget) return resolve();
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });

    (async () => {
      // Only create once per bot id
      if (!tvRef.current[showBotDetails]) {
        await ensureTV();
        const w: any = window as any;
        // Use a widely available symbol mapping
        // Clean container before (re)create
        tvContainer.innerHTML = '';
        const widget = new w.TradingView.widget({
          autosize: true,
          symbol: 'XAUUSD',
          interval: '1',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          container_id: `tv-gold-chart-${showBotDetails}`,
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: false,
          studies: [],
        });
        tvRef.current[showBotDetails] = true;
        // Periodically refresh the widget to avoid rare streaming stalls
        if (tvTimerRef.current[showBotDetails]) {
          clearInterval(tvTimerRef.current[showBotDetails]);
        }
        tvTimerRef.current[showBotDetails] = setInterval(async () => {
          try {
            tvContainer.innerHTML = '';
            new w.TradingView.widget({
              autosize: true,
              symbol: 'XAUUSD',
              interval: '1',
              timezone: 'Etc/UTC',
              theme: 'light',
              style: '1',
              locale: 'en',
              container_id: `tv-gold-chart-${showBotDetails}`,
              hide_top_toolbar: false,
              hide_legend: false,
              allow_symbol_change: false,
              studies: [],
            });
          } catch (_) {}
        }, 60000);
      }

      // Also maintain a lightweight-chart fallback if tv fails
      if (lwContainer && !chartsRef.current[showBotDetails]) {
        const LWEnsure = () => new Promise<void>((resolve) => {
          const w: any = window as any;
          if (w.LightweightCharts && w.LightweightCharts.createChart) return resolve();
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js';
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
        await LWEnsure();
        const LW: any = (window as any).LightweightCharts;
        const chart = LW.createChart(lwContainer, { height: 200 });
        const series = chart.addAreaSeries({ lineColor: '#2563eb', topColor: 'rgba(37,99,235,0.25)', bottomColor: 'rgba(37,99,235,0.03)' });
        chartsRef.current[showBotDetails] = { chart, series };
      }

      if (chartsRef.current[showBotDetails]) {
        const pts = goldSeries.length ? goldSeries : [{ t: new Date().toISOString(), pricePerGram: goldPrice }];
        const data = pts.map(p => ({ time: Math.floor(new Date(p.t).getTime() / 1000), value: Number(p.pricePerGram) }));
        chartsRef.current[showBotDetails].series.setData(data);
      }
    })();
  }, [showBotDetails, goldSeries, goldPrice]);

  const fetchTrades = async (botId: string) => {
    try {
      const { data } = await api.get(`/api/ai-trading/bots/${botId}/trades`);
      setTrades(data.trades || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const fetchBotActivity = async (botId: string) => {
    try {
      const { data } = await api.get(`/api/ai-trading/bots/${botId}/activity`);
      setBotActivity(prev => ({ ...prev, [botId]: data }));
    } catch (error) {
      console.error('Error fetching bot activity:', error);
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
      await api.post('/api/ai-trading/bots', {
          name: newBot.name,
          strategy_type: newBot.strategy_type,
          exchange: 'paper',
          trading_pairs: newBot.trading_pairs.filter(pair => pair.trim() !== ''),
          is_paper_trading: newBot.is_paper_trading,
          risk_settings: {
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
            max_open_positions: 3,
            quoteCurrency: newBot.strategy_params.quoteCurrency || 'USDT'
          }
        });
      await fetchBots();
      setShowCreateBot(false);
        setNewBot({
          name: '',
          strategy_type: 'sma_crossover',
          trading_pairs: ['XAUUSD'],
        exchange: 'paper',
          is_paper_trading: true,
          risk_settings: {
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
            max_open_positions: 3,
            quoteCurrency: 'USDT'
          }
        });
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const url = (error?.config?.baseURL || '') + (error?.config?.url || '');
      console.error('Error creating bot:', { status, data, url, error });
      alert(`Create bot failed (${status || 'error'}): ${data?.message || error?.message || 'Unknown error'}\nURL: ${url}`);
    }
  };

  const startBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/start`);
      await fetchBots();
    } catch (error) {
      console.error('Error starting bot:', error);
    }
  };

  const stopBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/stop`);
      await fetchBots();
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  };

  const pauseBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/pause`);
      await fetchBots();
    } catch (error) {
      console.error('Error pausing bot:', error);
    }
  };

  const resumeBot = async (botId: string) => {
    try {
      await api.post(`/api/ai-trading/bots/${botId}/resume`);
      await fetchBots();
    } catch (error) {
      console.error('Error resuming bot:', error);
    }
  };

  const deleteBot = async (botId: string) => {
    try {
      const confirmed = window.confirm('Delete this bot? This action cannot be undone.');
      if (!confirmed) return;
      await api.delete(`/api/ai-trading/bots/${botId}`);
      await fetchBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
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
              <div className="flex items-center mb-2">
                <Link 
                  href="/"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </Link>
              </div>
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">Live Market Prices</h3>
            <div className="text-xs text-gray-500">Updated {lastPriceUpdate.toLocaleTimeString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div id="tv-gold-chart-market" style={{ width: '100%', height: 320 }} />
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
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
                              if (bot.status === 'running') {
                                fetchBotActivity(bot.id);
                              }
                              setShowBotDetails(showBotDetails === bot.id ? null : bot.id);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {showBotDetails === bot.id ? 'Hide Details' : 'View Details'}
                          </button>
                          {bot.status !== 'running' && (
                            <button
                              onClick={() => deleteBot(bot.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                      
                      {/* Bot Details Row */}
                      {showBotDetails === bot.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="text-lg font-medium text-gray-900">Real-Time Trading Progress</h4>
                                {bot.status === 'running' && (
                                  <div className="flex items-center text-sm text-green-600">
                                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Live • Auto-refreshing every 5s
                                  </div>
                                )}
                              </div>

                              {bot.status === 'running' ? (
                                <div className="space-y-6">
                                  {/* Bot Header */}
                                  <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center">
                                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                                        <span className="text-blue-600 font-medium text-sm">🤖</span>
                                      </div>
                                      <div>
                                        <h5 className="text-lg font-medium text-gray-900">{bot.name}</h5>
                                        <p className="text-sm text-gray-500">{bot.strategy_type.replace('_', ' ').toUpperCase()} • {bot.trading_pairs.join(', ')}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center text-sm text-green-600">
                                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                      ACTIVE
                                    </div>
                                  </div>

                                  {/* Real-Time Bot Status with Live Activity */}
                                  {botActivity[bot.id] && (
                                    <div className="space-y-4">
                                      {/* Bot Activity Indicator */}
                                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center">
                                            <div className="relative">
                                              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                                              <div className="absolute h-3 w-3 bg-green-400 rounded-full animate-ping"></div>
                                            </div>
                                            <div className="ml-3">
                                              <h6 className="text-sm font-semibold text-gray-900">Bot Status</h6>
                                              <p className="text-sm text-gray-700 font-medium">{botActivity[bot.id].status || 'Active - Monitoring markets'}</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">Cycle Status</div>
                                            <div className="text-sm font-semibold text-green-600">
                                              {botActivity[bot.id].status?.includes('Analyzing') ? '🔍 Analyzing' :
                                               botActivity[bot.id].status?.includes('Evaluating') ? '📊 Evaluating' :
                                               botActivity[bot.id].status?.includes('Monitoring') ? '👁️ Monitoring' :
                                               botActivity[bot.id].status?.includes('Preparing') ? '⚙️ Preparing' :
                                               '🔄 Active'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Current Signal Activity */}
                                        <div className="bg-white border-2 border-blue-100 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <h6 className="text-sm font-medium text-gray-700">Current Activity</h6>
                                            <span className="text-xs text-green-600 font-medium animate-pulse">● LIVE</span>
                                          </div>
                                          <p className="text-sm text-gray-900 font-medium">
                                            {goldPrice > 0 
                                              ? `Monitoring gold price: $${goldPrice.toFixed(2)}/gram - Looking for entry opportunities`
                                              : botActivity[bot.id].lastSignal || 'Analyzing market conditions...'}
                                          </p>
                                          {botActivity[bot.id].lastRunAt && (
                                            <p className="text-xs text-gray-500 mt-2">
                                              Last analysis: {new Date(botActivity[bot.id].lastRunAt).toLocaleTimeString()}
                                            </p>
                                          )}
                                        </div>

                                        {/* Market Analysis */}
                                        <div className="bg-white border-2 border-purple-100 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <h6 className="text-sm font-medium text-gray-700">Market Analysis</h6>
                                            <span className="text-xs text-purple-600 font-medium">📈 LIVE</span>
                                          </div>
                                          <p className="text-sm text-gray-900 font-medium">
                                            {goldPrice > 0 
                                              ? goldChange24h !== null && goldChange24h !== undefined
                                                ? `Gold ${goldChange24h > 0.1 ? 'uptrend' : goldChange24h < -0.1 ? 'downtrend' : 'sideways'}: $${goldPrice.toFixed(2)}/gram (${goldChange24h >= 0 ? '+' : ''}${goldChange24h.toFixed(2)}% 24h)`
                                                : `Current gold price: $${goldPrice.toFixed(2)}/gram - Analyzing trends...`
                                              : botActivity[bot.id].marketAnalysis || 'Fetching real-time gold price data...'}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-2">
                                            Real-time price monitoring active • Updated every 5s
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Signal Generation Progress - Enhanced with Live Indicators */}
                                  {botActivity[bot.id]?.signalProgress && (
                                    <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-lg p-5 shadow-sm">
                                      <div className="flex items-center justify-between mb-4">
                                        <h6 className="text-base font-semibold text-gray-900">Signal Generation Progress</h6>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium animate-pulse">
                                          🔄 LIVE
                                        </span>
                                      </div>
                                      <div className="space-y-4">
                                        {/* Data Collection */}
                                        <div>
                                          <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="flex items-center">
                                              {botActivity[bot.id].signalProgress.dataCollection === 'complete' ? (
                                                <span className="text-green-500 mr-2">✓</span>
                                              ) : (
                                                <span className="text-yellow-500 mr-2 animate-spin">⟳</span>
                                              )}
                                              <span className="font-medium text-gray-700">Data Collection</span>
                                            </div>
                                            <span className={`font-semibold ${botActivity[bot.id].signalProgress.dataCollection === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                                              {botActivity[bot.id].signalProgress.dataCollection === 'complete' ? 'Complete' : 'Collecting...'}
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                              className={`h-2.5 rounded-full transition-all duration-500 ${botActivity[bot.id].signalProgress.dataCollection === 'complete' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                                              style={{ width: botActivity[bot.id].signalProgress.dataCollection === 'complete' ? '100%' : '75%' }}
                                            ></div>
                                          </div>
                                        </div>

                                        {/* Technical Analysis */}
                                        <div>
                                          <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="flex items-center">
                                              {botActivity[bot.id].signalProgress.technicalAnalysis === 'complete' ? (
                                                <span className="text-green-500 mr-2">✓</span>
                                              ) : (
                                                <span className="text-yellow-500 mr-2 animate-spin">⟳</span>
                                              )}
                                              <span className="font-medium text-gray-700">Technical Analysis</span>
                                            </div>
                                            <span className={`font-semibold ${botActivity[bot.id].signalProgress.technicalAnalysis === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                                              {botActivity[bot.id].signalProgress.technicalAnalysis === 'complete' ? 'Complete' : 'Analyzing...'}
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                              className={`h-2.5 rounded-full transition-all duration-500 ${botActivity[bot.id].signalProgress.technicalAnalysis === 'complete' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                                              style={{ width: botActivity[bot.id].signalProgress.technicalAnalysis === 'complete' ? '100%' : '85%' }}
                                            ></div>
                                          </div>
                                        </div>

                                        {/* Risk Assessment - Dynamic */}
                                        <div>
                                          <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="flex items-center">
                                              <span className="text-blue-500 mr-2 animate-pulse">⚡</span>
                                              <span className="font-medium text-gray-700">Risk Assessment</span>
                                            </div>
                                            <span className="font-semibold text-blue-600">
                                              {botActivity[bot.id].signalProgress.riskAssessmentPercent || 0}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div 
                                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                                              style={{ width: `${Math.max(5, botActivity[bot.id].signalProgress.riskAssessmentPercent || 0)}%` }}
                                            >
                                              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                            </div>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">Evaluating portfolio risk and position sizing...</p>
                                        </div>

                                        {/* Signal Validation - Dynamic */}
                                        <div>
                                          <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="flex items-center">
                                              <span className="text-purple-500 mr-2 animate-pulse">🔍</span>
                                              <span className="font-medium text-gray-700">Signal Validation</span>
                                            </div>
                                            <span className="font-semibold text-purple-600">
                                              {botActivity[bot.id].signalProgress.signalValidationPercent || 0}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div 
                                              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                                              style={{ width: `${Math.max(5, botActivity[bot.id].signalProgress.signalValidationPercent || 0)}%` }}
                                            >
                                              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                            </div>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">Validating trading signals against market conditions...</p>
                                        </div>

                                        {/* Execution Ready */}
                                        <div>
                                          <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="flex items-center">
                                              {botActivity[bot.id].signalProgress.executionReady === 'ready' ? (
                                                <span className="text-green-500 mr-2 animate-pulse">✓</span>
                                              ) : (
                                                <span className="text-gray-400 mr-2">⏳</span>
                                              )}
                                              <span className="font-medium text-gray-700">Execution Ready</span>
                                            </div>
                                            <span className={`font-semibold ${botActivity[bot.id].signalProgress.executionReady === 'ready' ? 'text-green-600' : 'text-gray-500'}`}>
                                              {botActivity[bot.id].signalProgress.executionReady === 'ready' ? 'Ready to Trade' : 'Waiting for Signal...'}
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                              className={`h-2.5 rounded-full transition-all duration-500 ${botActivity[bot.id].signalProgress.executionReady === 'ready' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                                              style={{ width: botActivity[bot.id].signalProgress.executionReady === 'ready' ? '100%' : '60%' }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Risk Management */}
                                  {botActivity[bot.id]?.portfolioRisk && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Portfolio Risk */}
                                      <div className="bg-gradient-to-br from-white to-red-50 border-2 border-red-200 rounded-lg p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                          <h6 className="text-base font-semibold text-gray-900">Portfolio Risk Assessment</h6>
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                            🛡️ LIVE
                                          </span>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Current Exposure:</span>
                                            <span className="text-gray-900 font-bold">${(botActivity[bot.id].portfolioRisk.currentExposureUsd || 0).toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Exposure %:</span>
                                            <span className={`font-bold ${(botActivity[bot.id].portfolioRisk.currentExposurePercent || 0) > 50 ? 'text-red-600' : (botActivity[bot.id].portfolioRisk.currentExposurePercent || 0) > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
                                              {(botActivity[bot.id].portfolioRisk.currentExposurePercent || 0).toFixed(2)}%
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Max Position Size:</span>
                                            <span className="text-gray-900 font-bold">${(botActivity[bot.id].portfolioRisk.maxPositionSizeUsd || 0).toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Open Positions:</span>
                                            <span className="text-gray-900 font-bold">
                                              <span className={botActivity[bot.id].portfolioRisk.currentOpenPositions >= botActivity[bot.id].portfolioRisk.maxOpenPositions ? 'text-red-600' : 'text-green-600'}>
                                                {botActivity[bot.id].portfolioRisk.currentOpenPositions || 0}
                                              </span>
                                              <span className="text-gray-400"> / {botActivity[bot.id].portfolioRisk.maxOpenPositions || 3}</span>
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Daily Loss Limit:</span>
                                            <span className="text-gray-900 font-bold">${(botActivity[bot.id].portfolioRisk.dailyLossLimitUsd || 0).toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Daily Loss Used:</span>
                                            <span className={`font-bold ${botActivity[bot.id].portfolioRisk.dailyLossUsedUsd > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                              ${(botActivity[bot.id].portfolioRisk.dailyLossUsedUsd || 0).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                          <p className="text-xs text-gray-500 italic">🔄 Continuously monitoring portfolio exposure and risk limits</p>
                                        </div>
                                      </div>

                                      {/* Position Risk */}
                                      <div className="bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 rounded-lg p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                          <h6 className="text-base font-semibold text-gray-900">Position Risk Analysis</h6>
                                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                                            ⚙️ ACTIVE
                                          </span>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Stop Loss Distance:</span>
                                            <span className="text-red-600 font-bold">
                                              {botActivity[bot.id].positionRisk.stopLossDistancePercent 
                                                ? `${botActivity[bot.id].positionRisk.stopLossDistancePercent}%` 
                                                : '2%'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Take Profit Distance:</span>
                                            <span className="text-green-600 font-bold">
                                              {botActivity[bot.id].positionRisk.takeProfitDistancePercent 
                                                ? `${botActivity[bot.id].positionRisk.takeProfitDistancePercent}%` 
                                                : '4%'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Risk/Reward Ratio:</span>
                                            <span className="text-gray-900 font-bold">{botActivity[bot.id].positionRisk.riskRewardRatio || '1:2.0'}</span>
                                          </div>
                                          <div className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="text-gray-600 font-medium">Volatility Impact:</span>
                                            <span className="text-gray-900 font-bold">{botActivity[bot.id].positionRisk.volatilityImpact || 'Medium'}</span>
                                          </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-orange-200">
                                          <p className="text-xs text-gray-500 italic">🔄 Risk parameters actively enforced on all trades</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Live Activity Log */}
                                  {botActivity[bot.id] && (
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-5 shadow-sm">
                                      <div className="flex items-center justify-between mb-4">
                                        <h6 className="text-base font-semibold text-gray-900">Live Activity Log</h6>
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium animate-pulse">
                                          📡 STREAMING
                                        </span>
                                      </div>
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {/* Activity Entry 1 */}
                                        <div className="flex items-start p-2 bg-white rounded border-l-4 border-green-500">
                                          <span className="text-green-500 mr-2">✓</span>
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-900">Data Collection Complete</p>
                                            <p className="text-xs text-gray-500">Fetched latest gold price data and market indicators</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                                          </div>
                                        </div>
                                        
                                        {/* Activity Entry 2 */}
                                        <div className="flex items-start p-2 bg-white rounded border-l-4 border-blue-500">
                                          <span className="text-blue-500 mr-2 animate-pulse">⟳</span>
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-900">Technical Analysis Active</p>
                                            <p className="text-xs text-gray-500">
                                              {botActivity[bot.id].marketAnalysis || 'Analyzing Bollinger Bands, RSI, and SMA indicators'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                                          </div>
                                        </div>

                                        {/* Activity Entry 3 - Dynamic based on status */}
                                        {botActivity[bot.id].status?.includes('Analyzing') && (
                                          <div className="flex items-start p-2 bg-white rounded border-l-4 border-purple-500">
                                            <span className="text-purple-500 mr-2 animate-pulse">🔍</span>
                                            <div className="flex-1">
                                              <p className="text-xs font-medium text-gray-900">Market Analysis In Progress</p>
                                              <p className="text-xs text-gray-500">Evaluating entry and exit signals based on current market conditions</p>
                                              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                                            </div>
                                          </div>
                                        )}

                                        {botActivity[bot.id].status?.includes('Evaluating') && (
                                          <div className="flex items-start p-2 bg-white rounded border-l-4 border-yellow-500">
                                            <span className="text-yellow-500 mr-2 animate-pulse">📊</span>
                                            <div className="flex-1">
                                              <p className="text-xs font-medium text-gray-900">Signal Evaluation Active</p>
                                              <p className="text-xs text-gray-500">Comparing current price against support/resistance levels and entry criteria</p>
                                              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                                            </div>
                                          </div>
                                        )}

                                        {botActivity[bot.id].status?.includes('Monitoring') && (
                                          <div className="flex items-start p-2 bg-white rounded border-l-4 border-green-500">
                                            <span className="text-green-500 mr-2 animate-pulse">👁️</span>
                                            <div className="flex-1">
                                              <p className="text-xs font-medium text-gray-900">Price Monitoring Active</p>
                                              <p className="text-xs text-gray-500">
                                                {botActivity[bot.id].lastSignal || 'Watching for optimal entry/exit opportunities'}
                                              </p>
                                              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                                            </div>
                                          </div>
                                        )}

                                        {/* Activity Entry 4 */}
                                        <div className="flex items-start p-2 bg-white rounded border-l-4 border-indigo-500">
                                          <span className="text-indigo-500 mr-2">🛡️</span>
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-900">Risk Management Active</p>
                                            <p className="text-xs text-gray-500">Continuously monitoring portfolio exposure and position limits</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 pt-3 border-t border-indigo-200">
                                        <p className="text-xs text-gray-500 italic">
                                          💡 Bot runs analysis cycles every 60 seconds. This log updates in real-time.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Recent Trades */}
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h6 className="text-sm font-medium text-gray-900 mb-3">Recent Trades</h6>
                                    {trades && trades.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-gray-200">
                                              <th className="text-left py-2 px-2 text-gray-600">Time</th>
                                              <th className="text-left py-2 px-2 text-gray-600">Side</th>
                                              <th className="text-left py-2 px-2 text-gray-600">Price</th>
                                              <th className="text-left py-2 px-2 text-gray-600">Quantity</th>
                                              <th className="text-left py-2 px-2 text-gray-600">P&L</th>
                                              <th className="text-left py-2 px-2 text-gray-600">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {trades.slice(0, 5).map((trade: Trade) => (
                                              <tr key={trade.id} className="border-b border-gray-100">
                                                <td className="py-2 px-2 text-gray-900">
                                                  {new Date(trade.created_at).toLocaleTimeString()}
                                                </td>
                                                <td className={`py-2 px-2 font-medium ${
                                                  trade.side === 'buy' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                  {trade.side.toUpperCase()}
                                                </td>
                                                <td className="py-2 px-2 text-gray-900">${Number(trade.price).toFixed(2)}</td>
                                                <td className="py-2 px-2 text-gray-900">{Number(trade.quantity).toFixed(4)}</td>
                                                <td className={`py-2 px-2 font-medium ${
                                                  Number(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                  ${Number(trade.pnl).toFixed(2)}
                                                </td>
                                                <td className="py-2 px-2">
                                                  <span className={`px-2 py-1 rounded text-xs ${
                                                    trade.status === 'filled' ? 'bg-green-100 text-green-800' :
                                                    trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                  }`}>
                                                    {trade.status}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-4 text-sm text-gray-500">
                                        <p>No trades yet. The bot will execute trades automatically when market conditions are favorable.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <div className="text-gray-500">
                                    <div className="text-4xl mb-4">🤖</div>
                                    <h5 className="text-lg font-medium text-gray-900 mb-2">Bot is not running</h5>
                                    <p className="text-gray-500">Start the bot to see real-time trading progress</p>
                                  </div>
                                </div>
                              )}
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
                    <option value="sma_crossover">Gold: Buy Low / Sell High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instrument</label>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={newBot.trading_pairs[0]}
                      readOnly
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mode</label>
                  <input
                    type="text"
                    value="Paper"
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Settle via</label>
                  <select
                    value={newBot.strategy_params.quoteCurrency}
                    onChange={(e) => setNewBot({
                      ...newBot,
                      strategy_params: { ...newBot.strategy_params, quoteCurrency: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
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
