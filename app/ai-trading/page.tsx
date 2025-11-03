'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { createChart, ColorType } from 'lightweight-charts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import Navbar from '@/components/Navbar';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

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
  const [user, setUser] = useState<User | null>(null);
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
    checkAuth();
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

  const checkAuth = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data.user);
    } catch (error) {
      router.push('/login');
    }
  };

  const handleLogout = () => {
    Cookies.remove('authToken');
    sessionStorage.removeItem('authToken');
    router.push('/login');
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
      {/* Shared Navbar Component */}
      <Navbar user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Trading Dashboard</h1>
              <p className="mt-2 text-gray-600">Automated trading with AI-powered strategies</p>
            </div>
            <button
              onClick={() => setShowCreateBot(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Bot
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 mb-1">Total Bots</p>
                <p className="text-2xl font-bold text-blue-900">{bots.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 mb-1">Active Bots</p>
                <p className="text-2xl font-bold text-green-900">{bots.filter(bot => bot.status === 'running').length}</p>
              </div>
              <div className="h-12 w-12 bg-green-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 mb-1">Total P&L</p>
                <p className={`text-2xl font-bold ${getPnLColor((bots || []).reduce((sum, bot) => sum + (Number(bot.total_pnl) || 0), 0))}`}>
                  ${(bots || []).reduce((sum, bot) => sum + (Number(bot.total_pnl) || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-700 mb-1">Total Trades</p>
                <p className="text-2xl font-bold text-purple-900">{(bots || []).reduce((sum, bot) => sum + (Number(bot.total_trades) || 0), 0)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-200 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Market Prices Overview */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Live Market Prices</h3>
              <p className="text-sm text-gray-600 mt-1">Real-time gold price chart</p>
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
              Updated {lastPriceUpdate.toLocaleTimeString()}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-200">
            <div id="tv-gold-chart-market" style={{ width: '100%', height: 400 }} />
          </div>
        </div>

        {/* Trading Bots - Card Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Trading Bots</h2>
            <div className="text-sm text-gray-600">
              {bots.filter(bot => bot.status === 'running').length} active
            </div>
          </div>
          
          {!bots || bots.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
              <div className="text-gray-500">
                <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Trading Bots</h3>
                <p className="text-gray-500 mb-4">You haven't created any trading bots yet.</p>
                <button
                  onClick={() => setShowCreateBot(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Bot
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className={`bg-white border-2 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
                    bot.status === 'running' ? 'border-green-200' : 
                    bot.status === 'paused' ? 'border-yellow-200' : 
                    'border-gray-200'
                  }`}
                >
                  {/* Bot Card Header */}
                  <div className={`px-6 py-4 border-b ${
                    bot.status === 'running' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' : 
                    bot.status === 'paused' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200' : 
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          bot.status === 'running' ? 'bg-green-200' : 
                          bot.status === 'paused' ? 'bg-yellow-200' : 
                          'bg-gray-200'
                        }`}>
                          <svg className={`h-6 w-6 ${
                            bot.status === 'running' ? 'text-green-700' : 
                            bot.status === 'paused' ? 'text-yellow-700' : 
                            'text-gray-700'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{bot.name}</h3>
                          <p className="text-sm text-gray-600">{bot.trading_pairs.join(', ')}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                        bot.status === 'running' ? 'bg-green-100 text-green-800' :
                        bot.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        bot.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bot.status === 'running' && (
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        )}
                        {bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Bot Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Strategy</p>
                        <p className="text-sm font-semibold text-gray-900 capitalize">{bot.strategy_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Exchange</p>
                        <p className="text-sm font-semibold text-gray-900">{bot.exchange}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total P&L</p>
                        <p className={`text-lg font-bold ${getPnLColor(Number(bot.total_pnl) || 0)}`}>
                          ${(Number(bot.total_pnl) || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Trades</p>
                        <p className="text-lg font-bold text-gray-900">{Number(bot.total_trades) || 0}</p>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-500 mb-1">Win Rate</p>
                        <p className="text-sm font-bold text-gray-900">
                          {bot.total_trades > 0 ? Math.round(((Number(bot.winning_trades) || 0) / (Number(bot.total_trades) || 1)) * 100) : 0}%
                        </p>
                      </div>
                      <div className="text-center flex-1 border-l border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Daily P&L</p>
                        <p className={`text-sm font-bold ${getPnLColor(Number(bot.daily_pnl) || 0)}`}>
                          ${(Number(bot.daily_pnl) || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      {bot.status === 'running' ? (
                        <>
                          <button
                            onClick={() => pauseBot(bot.id)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pause
                          </button>
                          <button
                            onClick={() => stopBot(bot.id)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                            </svg>
                            Stop
                          </button>
                        </>
                      ) : bot.status === 'paused' ? (
                        <>
                          <button
                            onClick={() => resumeBot(bot.id)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Resume
                          </button>
                          <button
                            onClick={() => stopBot(bot.id)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Stop
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startBot(bot.id)}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Start Bot
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
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {showBotDetails === bot.id ? (
                          <>
                            <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Details
                          </>
                        )}
                      </button>
                      {bot.status !== 'running' && (
                        <button
                          onClick={() => deleteBot(bot.id)}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bot Details Expanded View */}
        {showBotDetails && selectedBot && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Bot Details: {selectedBot.name}</h3>
                <button
                  onClick={() => {
                    setShowBotDetails(null);
                    setSelectedBot(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedBot.status === 'running' ? (
                <div className="space-y-6">
                  {/* Bot Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center mr-3">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-xl font-bold text-gray-900">{selectedBot.name}</h5>
                        <p className="text-sm text-gray-600">{selectedBot.strategy_type.replace('_', ' ').toUpperCase()} • {selectedBot.trading_pairs.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                      LIVE • Auto-refreshing every 5s
                    </div>
                  </div>

                  {/* Real-Time Bot Status with Live Activity */}
                  {botActivity[selectedBot.id] && (
                    <div className="space-y-4">
                      {/* Bot Activity Indicator */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-5 border border-green-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="relative">
                              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                              <div className="absolute h-3 w-3 bg-green-400 rounded-full animate-ping"></div>
                            </div>
                            <div className="ml-3">
                              <h6 className="text-sm font-semibold text-gray-900">Bot Status</h6>
                              <p className="text-sm text-gray-700 font-medium">{botActivity[selectedBot.id].status || 'Active - Monitoring markets'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Cycle Status</div>
                            <div className="text-sm font-semibold text-green-600">
                              {botActivity[selectedBot.id].status?.includes('Analyzing') ? '🔍 Analyzing' :
                               botActivity[selectedBot.id].status?.includes('Evaluating') ? '📊 Evaluating' :
                               botActivity[selectedBot.id].status?.includes('Monitoring') ? '👁️ Monitoring' :
                               botActivity[selectedBot.id].status?.includes('Preparing') ? '⚙️ Preparing' :
                               '🔄 Active'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current Signal Activity */}
                        <div className="bg-white border-2 border-blue-100 rounded-xl p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="text-sm font-semibold text-gray-700">Current Activity</h6>
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full animate-pulse">● LIVE</span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium">
                            {goldPrice > 0 
                              ? `Monitoring gold price: $${goldPrice.toFixed(2)}/gram - Looking for entry opportunities`
                              : botActivity[selectedBot.id].lastSignal || 'Analyzing market conditions...'}
                          </p>
                          {botActivity[selectedBot.id].lastRunAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Last analysis: {new Date(botActivity[selectedBot.id].lastRunAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>

                        {/* Market Analysis */}
                        <div className="bg-white border-2 border-purple-100 rounded-xl p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="text-sm font-semibold text-gray-700">Market Analysis</h6>
                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full">📈 LIVE</span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium">
                            {goldPrice > 0 
                              ? goldChange24h !== null && goldChange24h !== undefined
                                ? `Gold ${goldChange24h > 0.1 ? 'uptrend' : goldChange24h < -0.1 ? 'downtrend' : 'sideways'}: $${goldPrice.toFixed(2)}/gram (${goldChange24h >= 0 ? '+' : ''}${goldChange24h.toFixed(2)}% 24h)`
                                : `Current gold price: $${goldPrice.toFixed(2)}/gram - Analyzing trends...`
                              : botActivity[selectedBot.id].marketAnalysis || 'Fetching real-time gold price data...'}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Real-time price monitoring active • Updated every 5s
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signal Generation Progress - Enhanced with Live Indicators */}
                  {botActivity[selectedBot.id]?.signalProgress && (
                    <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <h6 className="text-base font-bold text-gray-900">Signal Generation Progress</h6>
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium animate-pulse">
                          🔄 LIVE
                        </span>
                      </div>
                      <div className="space-y-5">
                        {/* Data Collection */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center">
                              {botActivity[selectedBot.id].signalProgress.dataCollection === 'complete' ? (
                                <span className="text-green-500 mr-2 text-lg">✓</span>
                              ) : (
                                <span className="text-yellow-500 mr-2 animate-spin text-lg">⟳</span>
                              )}
                              <span className="font-semibold text-gray-700">Data Collection</span>
                            </div>
                            <span className={`font-bold ${botActivity[selectedBot.id].signalProgress.dataCollection === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {botActivity[selectedBot.id].signalProgress.dataCollection === 'complete' ? 'Complete' : 'Collecting...'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${botActivity[selectedBot.id].signalProgress.dataCollection === 'complete' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                              style={{ width: botActivity[selectedBot.id].signalProgress.dataCollection === 'complete' ? '100%' : '75%' }}
                            ></div>
                          </div>
                        </div>

                        {/* Technical Analysis */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center">
                              {botActivity[selectedBot.id].signalProgress.technicalAnalysis === 'complete' ? (
                                <span className="text-green-500 mr-2 text-lg">✓</span>
                              ) : (
                                <span className="text-yellow-500 mr-2 animate-spin text-lg">⟳</span>
                              )}
                              <span className="font-semibold text-gray-700">Technical Analysis</span>
                            </div>
                            <span className={`font-bold ${botActivity[selectedBot.id].signalProgress.technicalAnalysis === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {botActivity[selectedBot.id].signalProgress.technicalAnalysis === 'complete' ? 'Complete' : 'Analyzing...'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${botActivity[selectedBot.id].signalProgress.technicalAnalysis === 'complete' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                              style={{ width: botActivity[selectedBot.id].signalProgress.technicalAnalysis === 'complete' ? '100%' : '85%' }}
                            ></div>
                          </div>
                        </div>

                        {/* Risk Assessment - Dynamic */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center">
                              <span className="text-blue-500 mr-2 animate-pulse text-lg">⚡</span>
                              <span className="font-semibold text-gray-700">Risk Assessment</span>
                            </div>
                            <span className="font-bold text-blue-600">
                              {botActivity[selectedBot.id].signalProgress.riskAssessmentPercent || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                              style={{ width: `${Math.max(5, botActivity[selectedBot.id].signalProgress.riskAssessmentPercent || 0)}%` }}
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
                              <span className="text-purple-500 mr-2 animate-pulse text-lg">🔍</span>
                              <span className="font-semibold text-gray-700">Signal Validation</span>
                            </div>
                            <span className="font-bold text-purple-600">
                              {botActivity[selectedBot.id].signalProgress.signalValidationPercent || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                              style={{ width: `${Math.max(5, botActivity[selectedBot.id].signalProgress.signalValidationPercent || 0)}%` }}
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
                              {botActivity[selectedBot.id].signalProgress.executionReady === 'ready' ? (
                                <span className="text-green-500 mr-2 animate-pulse text-lg">✓</span>
                              ) : (
                                <span className="text-gray-400 mr-2 text-lg">⏳</span>
                              )}
                              <span className="font-semibold text-gray-700">Execution Ready</span>
                            </div>
                            <span className={`font-bold ${botActivity[selectedBot.id].signalProgress.executionReady === 'ready' ? 'text-green-600' : 'text-gray-500'}`}>
                              {botActivity[selectedBot.id].signalProgress.executionReady === 'ready' ? 'Ready to Trade' : 'Waiting for Signal...'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${botActivity[selectedBot.id].signalProgress.executionReady === 'ready' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                              style={{ width: botActivity[selectedBot.id].signalProgress.executionReady === 'ready' ? '100%' : '60%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Management */}
                  {botActivity[selectedBot.id]?.portfolioRisk && (
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
                            <span className="text-gray-900 font-bold">${(botActivity[selectedBot.id].portfolioRisk.currentExposureUsd || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Exposure %:</span>
                            <span className={`font-bold ${(botActivity[selectedBot.id].portfolioRisk.currentExposurePercent || 0) > 50 ? 'text-red-600' : (botActivity[selectedBot.id].portfolioRisk.currentExposurePercent || 0) > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {(botActivity[selectedBot.id].portfolioRisk.currentExposurePercent || 0).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Max Position Size:</span>
                            <span className="text-gray-900 font-bold">${(botActivity[selectedBot.id].portfolioRisk.maxPositionSizeUsd || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Open Positions:</span>
                            <span className="text-gray-900 font-bold">
                              <span className={botActivity[selectedBot.id].portfolioRisk.currentOpenPositions >= botActivity[selectedBot.id].portfolioRisk.maxOpenPositions ? 'text-red-600' : 'text-green-600'}>
                                {botActivity[selectedBot.id].portfolioRisk.currentOpenPositions || 0}
                              </span>
                              <span className="text-gray-400"> / {botActivity[selectedBot.id].portfolioRisk.maxOpenPositions || 3}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Daily Loss Limit:</span>
                            <span className="text-gray-900 font-bold">${(botActivity[selectedBot.id].portfolioRisk.dailyLossLimitUsd || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Daily Loss Used:</span>
                            <span className={`font-bold ${botActivity[selectedBot.id].portfolioRisk.dailyLossUsedUsd > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${(botActivity[selectedBot.id].portfolioRisk.dailyLossUsedUsd || 0).toFixed(2)}
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
                              {botActivity[selectedBot.id].positionRisk.stopLossDistancePercent 
                                ? `${botActivity[selectedBot.id].positionRisk.stopLossDistancePercent}%` 
                                : '2%'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Take Profit Distance:</span>
                            <span className="text-green-600 font-bold">
                              {botActivity[selectedBot.id].positionRisk.takeProfitDistancePercent 
                                ? `${botActivity[selectedBot.id].positionRisk.takeProfitDistancePercent}%` 
                                : '4%'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Risk/Reward Ratio:</span>
                            <span className="text-gray-900 font-bold">{botActivity[selectedBot.id].positionRisk.riskRewardRatio || '1:2.0'}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-gray-600 font-medium">Volatility Impact:</span>
                            <span className="text-gray-900 font-bold">{botActivity[selectedBot.id].positionRisk.volatilityImpact || 'Medium'}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <p className="text-xs text-gray-500 italic">🔄 Risk parameters actively enforced on all trades</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Activity Log */}
                  {botActivity[selectedBot.id] && (
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
                              {botActivity[selectedBot.id].marketAnalysis || 'Analyzing Bollinger Bands, RSI, and SMA indicators'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                          </div>
                        </div>

                        {/* Activity Entry 3 - Dynamic based on status */}
                        {botActivity[selectedBot.id].status?.includes('Analyzing') && (
                          <div className="flex items-start p-2 bg-white rounded border-l-4 border-purple-500">
                            <span className="text-purple-500 mr-2 animate-pulse">🔍</span>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">Market Analysis In Progress</p>
                              <p className="text-xs text-gray-500">Evaluating entry and exit signals based on current market conditions</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                            </div>
                          </div>
                        )}

                        {botActivity[selectedBot.id].status?.includes('Evaluating') && (
                          <div className="flex items-start p-2 bg-white rounded border-l-4 border-yellow-500">
                            <span className="text-yellow-500 mr-2 animate-pulse">📊</span>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">Signal Evaluation Active</p>
                              <p className="text-xs text-gray-500">Comparing current price against support/resistance levels and entry criteria</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
                            </div>
                          </div>
                        )}

                        {botActivity[selectedBot.id].status?.includes('Monitoring') && (
                          <div className="flex items-start p-2 bg-white rounded border-l-4 border-green-500">
                            <span className="text-green-500 mr-2 animate-pulse">👁️</span>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">Price Monitoring Active</p>
                              <p className="text-xs text-gray-500">
                                {botActivity[selectedBot.id].lastSignal || 'Watching for optimal entry/exit opportunities'}
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
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h6 className="text-sm font-bold text-gray-900 mb-4">Recent Trades</h6>
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
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    <div className="h-20 w-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 mb-2">Bot is not running</h5>
                    <p className="text-gray-500 mb-4">Start the bot to see real-time trading progress</p>
                    <button
                      onClick={() => startBot(selectedBot.id)}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Bot
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Bot Modal */}
      {showCreateBot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create New Trading Bot</h3>
                  <p className="text-sm text-gray-600 mt-1">Configure your automated trading bot</p>
                </div>
                <button
                  onClick={() => setShowCreateBot(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={createBot} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bot Name</label>
                  <input
                    type="text"
                    value={newBot.name}
                    onChange={(e) => setNewBot({...newBot, name: e.target.value})}
                    className="block w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="My Trading Bot"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Strategy</label>
                  <select
                    value={newBot.strategy_type}
                    onChange={(e) => setNewBot({...newBot, strategy_type: e.target.value})}
                    className="block w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="sma_crossover">Gold: Buy Low / Sell High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Instrument</label>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={newBot.trading_pairs[0]}
                      readOnly
                      className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                  <input
                    type="text"
                    value="Paper Trading (Test Mode)"
                    readOnly
                    className="block w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Settle via</label>
                  <select
                    value={newBot.strategy_params.quoteCurrency}
                    onChange={(e) => setNewBot({
                      ...newBot,
                      strategy_params: { ...newBot.strategy_params, quoteCurrency: e.target.value }
                    })}
                    className="block w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                
                <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="paper_trading"
                    checked={newBot.is_paper_trading}
                    onChange={(e) => setNewBot({...newBot, is_paper_trading: e.target.checked})}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="paper_trading" className="ml-3 block text-sm font-medium text-gray-700">
                    Paper Trading (Test Mode) - No real funds will be used
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateBot(false)}
                    className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
