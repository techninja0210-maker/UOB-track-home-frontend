'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NotificationCenter from './NotificationCenter';
import Cookies from 'js-cookie';
import api from '@/lib/api';

export default function NotificationWrapper({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        setUserId(undefined);
        return;
      }

      try {
        const response = await api.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.user) {
          setUserId(response.data.user.id);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUserId(undefined);
      }
    };

    checkAuth();
  }, [pathname]); // Re-check on route change

  return (
    <>
      {children}
      {userId && <NotificationCenter userId={userId} />}
    </>
  );
}


