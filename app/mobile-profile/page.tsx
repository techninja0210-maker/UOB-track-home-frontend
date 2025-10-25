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

export default function MobileProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
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

  const logout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };


  return (
    <div className="mobile-profile">
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
        <h1 className="page-title">Profile</h1>
        <button className="menu-btn">⋯</button>
      </div>

      {/* Content */}
      <div className="content">
        <div className="profile-section">
          <div className="profile-avatar">
            <img src="https://via.placeholder.com/100/FFD700/FFFFFF?text=U" alt="Profile" className="avatar-img" />
          </div>
          <h2 className="profile-name">{user.fullName}</h2>
          <p className="profile-email">{user.email}</p>
          
          <div className="profile-actions">
            <button className="action-btn">Edit Profile</button>
            <button className="action-btn">Settings</button>
            <button className="action-btn logout-btn" onClick={logout}>Logout</button>
          </div>
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
        <Link href="/mobile-skrs" className="nav-item">
          <div className="nav-icon">🏠</div>
          <span>SKRs</span>
        </Link>
        <Link href="/mobile-history" className="nav-item">
          <div className="nav-icon">⊞</div>
          <span>History</span>
        </Link>
        <Link href="/mobile-profile" className="nav-item active">
          <div className="nav-icon">👤</div>
          <span>Profile</span>
        </Link>
      </div>

      <style jsx>{`
        .mobile-profile {
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

        .profile-section {
          background: #2C2C2C;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
        }

        .profile-avatar {
          margin-bottom: 16px;
        }

        .avatar-img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 3px solid #FFD700;
        }

        .profile-name {
          color: white;
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 8px 0;
        }

        .profile-email {
          color: #888;
          font-size: 16px;
          margin: 0 0 24px 0;
        }

        .profile-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-btn {
          background: #3A3A3A;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-btn:hover {
          background: #4A4A4A;
        }

        .logout-btn {
          background: #FF5722;
          margin-top: 8px;
        }

        .logout-btn:hover {
          background: #FF7043;
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



        @media (max-width: 375px) {
          .mobile-profile {
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













