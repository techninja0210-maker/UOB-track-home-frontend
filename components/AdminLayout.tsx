'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/transactions', label: 'Transactions' },
    { href: '/admin/withdrawals', label: 'Withdrawals' },
    { href: '/admin/skrs', label: 'SKRs' },
    { href: '/admin/crowdfunding', label: 'Crowdfunding' },
    { href: '/admin/gold-pricing', label: 'Gold Pricing' },
    { href: '/admin/pool-wallets', label: 'Pool Wallets' },
    { href: '/admin/ai-trading', label: 'AI Trading' }
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-profile')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      
      if (response.data.user.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(response.data.user);
    } catch (error) {
      console.error('Authentication error:', error);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        await api.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };


  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/admin" className="flex items-center">
                <Image
                  src="/UOB_logo.png"
                  alt="UOB Security House"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                      isActive
                        ? 'text-primary-600 border-b-2 border-primary-600 pb-1'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User Profile */}
            <div className="relative user-profile">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 text-sm rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {user?.fullName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">{user?.fullName}</div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/admin/account-settings"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </div>
                    </Link>
                  </div>
                  <div className="border-t border-gray-200 py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}