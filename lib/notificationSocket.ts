import { io, Socket } from 'socket.io-client';

interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
  action?: {
    label: string;
    url: string;
  };
}

class NotificationSocket {
  private socket: Socket | null = null;
  private listeners: ((notification: Notification) => void)[] = [];
  private userId: string | null = null;

  /**
   * Initialize WebSocket connection
   */
  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) {
      return; // Already connected
    }

    this.userId = userId;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    this.socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      if (this.socket && userId) {
        this.socket.emit('authenticate', userId);
      }
    });

    this.socket.on('notification', (notification: Notification) => {
      console.log('📩 Notification received:', notification);
      this.notifyListeners(notification);
    });

    this.socket.on('announcement', (notification: Notification) => {
      console.log('📣 Announcement received:', notification);
      this.notifyListeners(notification);
    });

    this.socket.on('admin-notification', (notification: Notification) => {
      console.log('🔔 Admin notification received:', notification);
      this.notifyListeners(notification);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  /**
   * Add notification listener
   */
  addListener(callback: (notification: Notification) => void) {
    this.listeners.push(callback);
  }

  /**
   * Remove notification listener
   */
  removeListener(callback: (notification: Notification) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notification: Notification) {
    this.listeners.forEach(listener => listener(notification));
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
const notificationSocket = new NotificationSocket();
export default notificationSocket;


