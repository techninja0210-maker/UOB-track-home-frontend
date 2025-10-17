'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import notificationSocket, { addLocalNotificationListener, removeLocalNotificationListener } from '@/lib/notificationSocket';

interface Notification {
  id: string;
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

export default function NotificationCenter({ userId }: { userId?: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Connect to WebSocket
    notificationSocket.connect(userId);

    // Listen for notifications
    const handleNotification = (notification: any) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        ...notification,
      };

      setNotifications(prev => [newNotification, ...prev]);
      
      // Auto-show notification
      setIsVisible(true);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 3000);

      // Play notification sound (optional)
      playNotificationSound();
    };

    notificationSocket.addListener(handleNotification);

    return () => {
      notificationSocket.removeListener(handleNotification);
    };
  }, [userId]);

  // Local programmatic notifications (reusable across app)
  useEffect(() => {
    const handler = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...notification,
      };
      setNotifications(prev => [newNotification, ...prev]);
      setIsVisible(true);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 3000);
      playNotificationSound();
    };

    addLocalNotificationListener(handler);
    return () => removeLocalNotificationListener(handler);
  }, []);

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const handleActionClick = (notification: Notification) => {
    if (notification.action) {
      router.push(notification.action.url);
      removeNotification(notification.id);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#f44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-center">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          style={{ borderLeftColor: getNotificationColor(notification.type) }}
        >
          <div className="notification-icon">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
            {notification.action && (
              <button
                className="notification-action"
                onClick={() => handleActionClick(notification)}
              >
                {notification.action.label} →
              </button>
            )}
          </div>
          <button
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
          >
            ✕
          </button>
        </div>
      ))}

      <style jsx>{`
        .notification-center {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
          pointer-events: none;
        }

        .notification {
          background: #2C2C2C;
          border-left: 4px solid;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s ease-out;
          pointer-events: auto;
          position: relative;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          color: #FFFFFF;
          font-weight: bold;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          color: #B0B0B0;
          font-size: 0.875rem;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .notification-action {
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #FFD700, #B8860B);
          color: #1A1A1A;
          border: none;
          border-radius: 5px;
          font-size: 0.875rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 10px rgba(255, 215, 0, 0.4);
        }

        .notification-close {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: transparent;
          border: none;
          color: #888;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          transition: color 0.2s ease;
        }

        .notification-close:hover {
          color: #FFF;
        }

        .notification-success {
          border-left-color: #4CAF50;
        }

        .notification-error {
          border-left-color: #f44336;
        }

        .notification-warning {
          border-left-color: #FF9800;
        }

        .notification-info {
          border-left-color: #2196F3;
        }

        @media (max-width: 768px) {
          .notification-center {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }

          .notification {
            padding: 0.75rem;
          }

          .notification-title {
            font-size: 0.9rem;
          }

          .notification-message {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}


