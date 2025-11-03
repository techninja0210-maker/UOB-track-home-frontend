'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface NavbarProps {
  user?: User | null;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);

  useEffect(() => {
    if (!user && !currentUser) {
      checkAuthentication();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-profile')) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const checkAuthentication = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
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
      setShowProfileDropdown(false);
      if (onLogout) {
        onLogout();
      } else {
        router.push('/login');
      }
    }
  };

  const activeUser = user || currentUser;
  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/wallet', label: 'Wallet' },
    { href: '/skrs', label: 'SKRs' },
    { href: '/transactions', label: 'Transactions' },
    { href: '/exchange', label: 'Exchange' },
    { href: '/ai-trading', label: 'AI Trading' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Top Navigation Bar - Clean & Modern */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Image
                  src="/UOB_logo.png"
                  alt="UOB Security House"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg object-contain"
                  priority
                />
              </Link>
              <span className="hidden sm:block text-sm font-semibold text-gray-900">UOB Security</span>
            </div>

            {/* Navigation Links - Cleaner spacing */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* User Profile */}
            {activeUser && (
              <div className="relative user-profile">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-3 text-sm rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {activeUser.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">{activeUser.fullName}</div>
                    <div className="text-xs text-gray-500">{activeUser.role}</div>
                  </div>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{activeUser.fullName}</p>
                    </div>
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-500">
                        User: {activeUser.role}
                      </div>
                    </div>
                    <div className="border-t border-gray-200 py-1">
                      <Link
                        href="/referrals"
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Referral Program
                        </div>
                      </Link>
                      <Link
                        href="/account-settings"
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
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}

