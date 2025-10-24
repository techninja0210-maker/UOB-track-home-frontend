'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function MobileSKRsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data.user;
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="mobile-skrs">
      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-left">#111112</span>
        <div className="status-right">
          <span className="signal">📶</span>
          <span className="wifi">📶</span>
          <span className="battery">🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <button className="back-btn">←</button>
        <h1 className="page-title">Mobile SKRs</h1>
        <button className="menu-btn">⋯</button>
      </div>

      {/* Content */}
      <div className="content">
        <div className="skrs-section">
          <h2 className="section-title">SKRs Coming Soon</h2>
          <p className="section-desc">Mobile SKR interface will be implemented here</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <Link href="/mobile-dashboard" className="nav-item">
          <div className="nav-icon">💰</div>
          <span>Dashboard</span>
        </Link>
        <Link href="/mobile-wallet" className="nav-item">
          <div className="nav-icon">💼</div>
          <span>Wallet</span>
        </Link>
        <Link href="/mobile-skrs" className="nav-item active">
          <div className="nav-icon">🏠</div>
          <span>SKRs</span>
        </Link>
        <Link href="/mobile-history" className="nav-item">
          <div className="nav-icon">⊞</div>
          <span>History</span>
        </Link>
        <Link href="/mobile-profile" className="nav-item">
          <div className="nav-icon">👤</div>
          <span>Profile</span>
        </Link>
      </div>

      <style jsx>{`
        .mobile-skrs {
          width: 375px;
          height: 812px;
          background: #1A1A1A;
          color: white;
          font-family: 'Arial', sans-serif;
          margin: 0 auto;
          position: relative;
          overflow-x: hidden;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background: #1A1A1A;
          font-size: 12px;
        }

        .status-left {
          color: #888;
        }

        .status-right {
          display: flex;
          gap: 4px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #1A1A1A;
        }

        .back-btn,
        .menu-btn {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        }

        .page-title {
          color: #FFD700;
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }

        .content {
          padding: 16px;
          padding-bottom: 100px;
        }

        .skrs-section {
          background: #2C2C2C;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
        }

        .section-title {
          color: white;
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 16px 0;
        }

        .section-desc {
          color: #888;
          font-size: 16px;
          margin: 0;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 375px;
          background: #2C2C2C;
          padding: 12px 16px;
          display: flex;
          justify-content: space-around;
          border-top: 1px solid #444;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }

        .nav-item.active {
          color: #FFD700;
        }

        .nav-icon {
          font-size: 20px;
        }

        .nav-item span {
          font-size: 10px;
          font-weight: bold;
        }

        .mobile-loading {
          width: 375px;
          height: 812px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1A1A1A;
          margin: 0 auto;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #333;
          border-top: 4px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 375px) {
          .mobile-skrs {
            width: 100%;
            height: 100vh;
          }
          
          .bottom-nav {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}












