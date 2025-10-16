'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function DebugAdmin() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDebugInfo();
  }, []);

  const checkDebugInfo = async () => {
    const info: any = {};
    
    try {
      // Check token in sessionStorage
      const sessionToken = sessionStorage.getItem('authToken');
      info.sessionStorageToken = sessionToken ? 'Present' : 'Missing';
      
      // Check token in cookies
      const cookieToken = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1];
      info.cookieToken = cookieToken ? 'Present' : 'Missing';
      
      // Try to get user info
      if (sessionToken) {
        try {
          const response = await api.get('/api/auth/me');
          info.userInfo = response.data;
          info.authStatus = 'Success';
        } catch (error: any) {
          info.authStatus = `Failed: ${error.response?.data?.message || error.message}`;
        }
      } else {
        info.authStatus = 'No token available';
      }
      
      // Check if backend is running
      try {
        const healthResponse = await api.get('/health');
        info.backendStatus = 'Online';
        info.backendInfo = healthResponse.data;
      } catch (error) {
        info.backendStatus = 'Offline or Error';
      }
      
    } catch (error: any) {
      info.error = error.message;
    }
    
    setDebugInfo(info);
    setLoading(false);
  };

  const testLogin = async () => {
    try {
      const response = await api.post('/api/auth/login', {
        email: 'admin@uobsecurity.com',
        password: 'admin123'
      });
      
      // Store tokens
      sessionStorage.setItem('authToken', response.data.token);
      document.cookie = `authToken=${response.data.token}; path=/; max-age=86400`;
      
      alert('Login successful! Check debug info again.');
      checkDebugInfo();
    } catch (error: any) {
      alert(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#1A1A1A', color: 'white', minHeight: '100vh' }}>
      <h1>🔍 Admin Debug Information</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={testLogin}
          style={{
            padding: '1rem 2rem',
            background: '#FFD700',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Test Admin Login
        </button>
        
        <button 
          onClick={checkDebugInfo}
          style={{
            padding: '1rem 2rem',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Refresh Debug Info
        </button>
      </div>

      <div style={{ background: '#2C2C2C', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>🔑 Authentication Status</h2>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      <div style={{ background: '#2C2C2C', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>📋 Instructions</h2>
        <ol>
          <li>Click "Test Admin Login" to login with admin credentials</li>
          <li>Check if tokens are stored properly</li>
          <li>Verify user info is retrieved correctly</li>
          <li>If everything looks good, try accessing <a href="/admin" style={{ color: '#FFD700' }}>/admin</a></li>
        </ol>
        
        <h3>Default Admin Credentials:</h3>
        <ul>
          <li>Email: admin@uobsecurity.com</li>
          <li>Password: admin123</li>
        </ul>
      </div>
    </div>
  );
}
