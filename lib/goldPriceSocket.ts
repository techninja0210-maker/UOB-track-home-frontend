/**
 * Real-time Gold Price WebSocket Service
 * Listens to gold price updates from backend via WebSocket
 * Similar to TradingView's real-time streaming
 */

import { io, Socket } from 'socket.io-client';

interface GoldPriceUpdate {
  price: number; // USD per gram
  pricePerOunce: number; // USD per troy ounce
  eurPrice?: number; // EUR per gram
  gbpPrice?: number; // GBP per gram
  change24h: number;
  timestamp: string;
  previousPrice: number;
}

type GoldPriceListener = (update: GoldPriceUpdate) => void;

class GoldPriceSocket {
  private socket: Socket | null = null;
  private listeners: GoldPriceListener[] = [];
  private currentPrice: GoldPriceUpdate | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket?.connected) {
      console.log('✅ Gold price socket already connected');
      return;
    }

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '').replace(/\/api\/?$/, '');

    this.socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('✅ Gold price WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('gold-price-update', (update: GoldPriceUpdate) => {
      console.log('📊 Real-time gold price update:', update);
      this.currentPrice = update;
      this.notifyListeners(update);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Gold price WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Gold price WebSocket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('⚠️ Max reconnection attempts reached for gold price socket');
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Gold price WebSocket disconnected');
    }
  }

  /**
   * Subscribe to gold price updates
   */
  subscribe(listener: GoldPriceListener) {
    this.listeners.push(listener);
    
    // Immediately notify with current price if available
    if (this.currentPrice) {
      listener(this.currentPrice);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current cached price
   */
  getCurrentPrice(): GoldPriceUpdate | null {
    return this.currentPrice;
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(update: GoldPriceUpdate) {
    this.listeners.forEach(listener => {
      try {
        listener(update);
      } catch (error) {
        console.error('Error in gold price listener:', error);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export default new GoldPriceSocket();

