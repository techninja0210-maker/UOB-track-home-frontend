'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import api from '@/lib/api';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
                   sessionStorage.getItem('authToken');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await api.get('/api/auth/me');
      
      if (response.data.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(response.data);
    } catch (error) {
      console.error('Authentication error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
        <style jsx>{`
          .admin-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #1A1A1A;
            color: white;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top: 4px solid #FFD700;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar userRole={user?.role} />
      
      {/* Main Content */}
      <div className="admin-main-content">
        {/* Dynamic Header for specific pages */}
        {(title || subtitle) && (
          <div className="page-header">
            <div className="page-header-content">
              {title && <h2 className="page-header-title">{title}</h2>}
              {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
            </div>
          </div>
        )}
        
        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>

      <style jsx>{`
        .admin-layout {
          min-height: 100vh;
          background: #1A1A1A;
          color: white;
        }

        .admin-main-content {
          margin-left: 250px;
          padding-top: 80px;
          min-height: 100vh;
        }

        .page-header {
          background: #2C2C2C;
          border-bottom: 1px solid #333;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .page-header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header-title {
          font-size: 2rem;
          font-weight: 700;
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .page-header-subtitle {
          font-size: 1rem;
          color: #CCCCCC;
          margin: 0;
        }

        .page-content {
          padding: 0 2rem 2rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .admin-main-content {
            margin-left: 200px;
            padding: 0 1rem;
          }
          
          .page-header {
            padding: 1rem;
            margin-bottom: 1rem;
          }
          
          .page-content {
            padding: 0 0 1rem 0;
          }
        }

        @media (max-width: 640px) {
          .admin-main-content {
            margin-left: 0;
            padding-top: 60px;
          }
        }
      `}</style>
    </div>
  );
}
