'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface AdminSidebarProps {
  userRole?: string;
}

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const logout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and redirect
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const navItems = [
    { href: '/admin', icon: '🏠', label: 'Dashboard' },
    { href: '/admin/users', icon: '👥', label: 'Users' },
    { href: '/admin/transactions', icon: '📊', label: 'Transactions' },
    { href: '/admin/withdrawals', icon: '💸', label: 'Withdrawals' },
    { href: '/admin/receipts', icon: '📄', label: 'Receipts' },
    { href: '/admin/skrs', icon: '📋', label: 'SKRs' },
    { href: '/admin/gold-pricing', icon: '🏷️', label: 'Gold Pricing' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <>
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🏦</div>
            <div className="logo-text">
              <div className="logo-main">UOB Security</div>
              <div className="logo-sub">House</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon">{item.icon}</div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Info */}
        <div className="sidebar-footer">
          <div className="admin-info">
            <div className="admin-badge">
              <span className="badge-icon">👑</span>
              <span className="badge-text">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="admin-header">
        <div className="header-left">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage your platform</p>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <button 
              className="profile-button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-avatar">👤</div>
              <span className="profile-name">Admin User</span>
              <div className="profile-arrow">▼</div>
            </button>
            
            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-item">
                  <span className="dropdown-icon">👤</span>
                  <span>Profile</span>
                </div>
                <div className="dropdown-item">
                  <span className="dropdown-icon">⚙️</span>
                  <span>Settings</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" onClick={logout}>
                  <span className="dropdown-icon">🚪</span>
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          width: 250px;
          height: 100vh;
          background: linear-gradient(180deg, #1A1A1A 0%, #2C2C2C 100%);
          border-right: 1px solid #333;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid #333;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: #1A1A1A;
          font-weight: bold;
        }

        .logo-text {
          color: white;
        }

        .logo-main {
          font-size: 1.1rem;
          font-weight: 700;
          color: #FFD700;
        }

        .logo-sub {
          font-size: 0.85rem;
          color: #CCCCCC;
          margin-top: -2px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          color: #CCCCCC;
          text-decoration: none;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255, 215, 0, 0.1);
          color: #FFD700;
          border-left-color: #FFD700;
        }

        .nav-item.active {
          background: linear-gradient(90deg, rgba(255, 215, 0, 0.2), transparent);
          color: #FFD700;
          border-left-color: #FFD700;
          font-weight: 600;
        }

        .nav-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #333;
        }

        .admin-info {
          text-align: center;
        }

        .admin-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 20px;
          color: #1A1A1A;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .badge-icon {
          font-size: 1rem;
        }

        .admin-header {
          position: fixed;
          top: 0;
          left: 250px;
          right: 0;
          height: 80px;
          background: #2C2C2C;
          border-bottom: 1px solid #333;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          z-index: 999;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #FFD700;
          margin: 0;
        }

        .page-subtitle {
          font-size: 0.9rem;
          color: #CCCCCC;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .user-profile {
          position: relative;
        }

        .profile-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .profile-button:hover {
          background: #333;
          border-color: #FFD700;
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1A1A;
          font-weight: bold;
        }

        .profile-name {
          font-weight: 500;
        }

        .profile-arrow {
          font-size: 0.8rem;
          transition: transform 0.3s ease;
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: #2C2C2C;
          border: 1px solid #444;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          min-width: 180px;
          z-index: 1001;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: #CCCCCC;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .dropdown-item:hover {
          background: #333;
          color: #FFD700;
        }

        .dropdown-icon {
          width: 16px;
          text-align: center;
        }

        .dropdown-divider {
          height: 1px;
          background: #444;
          margin: 0.5rem 0;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 200px;
          }
          
          .admin-header {
            left: 200px;
            padding: 0 1rem;
          }
          
          .logo-text {
            display: none;
          }
          
          .nav-item span {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
