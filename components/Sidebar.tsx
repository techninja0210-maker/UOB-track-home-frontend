'use client';

import { usePathname } from 'next/navigation';
import NavLink from '@/components/NavLink';

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">$</div>
          <div className="logo-text">Track Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink href="/">
          <div className="nav-icon">🏠</div>
          <span>Dashboard</span>
        </NavLink>

        {false && (
          <NavLink href="/wallet">
            <div className="nav-icon">💰</div>
            <span>Wallet</span>
          </NavLink>
        )}

        <NavLink href="/exchange">
          <div className="nav-icon">🔁</div>
          <span>Exchange</span>
        </NavLink>

        <NavLink href="/skrs">
          <div className="nav-icon">📄</div>
          <span>SKRs</span>
        </NavLink>

        <NavLink href="/transactions">
          <div className="nav-icon">📊</div>
          <span>Transactions</span>
        </NavLink>

        {userRole === 'admin' && (
          <>
            <div className="nav-divider"></div>
            
            <NavLink href="/admin">
              <div className="nav-icon">⚙️</div>
              <span>Admin</span>
            </NavLink>

            <NavLink href="/admin/transactions">
              <div className="nav-icon">📋</div>
              <span>All Transactions</span>
            </NavLink>

            <NavLink href="/admin/withdrawals">
              <div className="nav-icon">📤</div>
              <span>Withdrawals</span>
            </NavLink>

            <NavLink href="/admin/gold-pricing">
              <div className="nav-icon">💰</div>
              <span>Gold Pricing</span>
            </NavLink>

            <NavLink href="/admin/skrs">
              <div className="nav-icon">📜</div>
              <span>SKR Management</span>
            </NavLink>
          </>
        )}
      </nav>

      <style jsx>{`
        .sidebar {
          width: 250px;
          background: #2C2C2C;
          padding: 2rem 0;
          border-right: 1px solid #444;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          overflow-y: auto;
        }

        .sidebar-header {
          padding: 0 2rem 2rem;
          border-bottom: 1px solid #444;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(45deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          color: #000;
        }

        .logo-text {
          font-size: 1.1rem;
          font-weight: bold;
          color: #FFD700;
        }

        .sidebar-nav {
          padding: 2rem 0;
          display: flex;
          flex-direction: column;
        }

        .nav-divider {
          height: 1px;
          background: #444;
          margin: 1rem 2rem;
        }

        :global(.sidebar-nav .nav-item) {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          color: #999;
          text-decoration: none;
          transition: all 0.3s;
          border-left: 3px solid transparent;
        }

        :global(.sidebar-nav .nav-item:hover) {
          background: rgba(255, 215, 0, 0.1);
          color: #FFD700;
          border-left-color: #FFD700;
        }

        :global(.sidebar-nav .nav-item.active) {
          background: rgba(255, 215, 0, 0.15);
          color: #FFD700;
          border-left-color: #FFD700;
          font-weight: 600;
        }

        :global(.sidebar-nav .nav-icon) {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
            border-right: none;
            border-bottom: 1px solid #444;
          }
        }
      `}</style>
    </div>
  );
}


