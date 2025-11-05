'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Cookies from 'js-cookie';

interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export default function AccountSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 30
  });

  // 2FA setup state
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    qrCode: '',
    secret: '',
    manualEntryKey: '',
    verificationCode: '',
    showSetup: false,
    showDisable: false,
    loading: false
  });

  // Disable 2FA state
  const [disablePassword, setDisablePassword] = useState('');

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    withdrawalAlerts: true,
    depositAlerts: true,
    priceAlerts: false
  });

  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadUserData();
    loadSecuritySettings();
    loadNotificationSettings();
  }, []);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login');
      return;
    }
  };

  const loadUserData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await api.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle both possible response structures
      const userData = response.data.data || response.data; // Try nested data first, then direct data
      setUser(userData);
      
      const formData = {
        fullName: userData.fullName || userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      setProfileForm(formData);
    } catch (error) {
      console.error('Error loading user data:', error);
      setMessage({ type: 'error', text: 'Failed to load user data: ' + (error as any).message });
    } finally {
      setLoading(false);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        return;
      }
      
      // Load 2FA status
      try {
        const twoFactorResponse = await api.get('/api/auth/2fa/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: twoFactorResponse.data.enabled
        }));
      } catch (error) {
        console.error('Error loading 2FA status:', error);
      }

      // Load other security settings
      try {
        const response = await api.get('/api/user/security', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const securityData = response.data.data || response.data;
        setSecuritySettings(prev => ({
          ...prev,
          loginNotifications: securityData.loginNotifications ?? prev.loginNotifications,
          sessionTimeout: securityData.sessionTimeout ?? prev.sessionTimeout
        }));
      } catch (error) {
        console.error('Error loading security settings:', error);
        // Use default settings if API fails
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        return;
      }
      
      const response = await api.get('/api/user/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const notificationData = response.data.data || response.data;
      setNotificationSettings(notificationData);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      // Use default settings if API fails
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.put('/api/user/profile', {
        fullName: profileForm.fullName,
        phone: profileForm.phone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
      loadUserData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    if (securitySettings.twoFactorEnabled) {
      // Toggle OFF - show password input
      setTwoFactorSetup(prev => ({ ...prev, showDisable: true, showSetup: false }));
    } else {
      // Toggle ON - generate QR code
      setTwoFactorSetup(prev => ({ ...prev, loading: true, showDisable: false }));
      setMessage(null);

      try {
        const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
        const response = await api.post('/api/auth/2fa/generate', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setTwoFactorSetup({
          qrCode: response.data.qrCode,
          secret: response.data.secret,
          manualEntryKey: response.data.manualEntryKey,
          verificationCode: '',
          showSetup: true,
          showDisable: false,
          loading: false
        });

        setMessage({ type: 'success', text: response.data.message || 'QR code generated. Please scan with your authenticator app.' });
      } catch (error: any) {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to generate 2FA setup' });
        setTwoFactorSetup(prev => ({ ...prev, loading: false, showSetup: false }));
      }
    }
  };

  const handleVerify2FA = async () => {
    setTwoFactorSetup(prev => ({ ...prev, loading: true }));
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/auth/2fa/verify', {
        secret: twoFactorSetup.secret,
        token: twoFactorSetup.verificationCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: response.data.message || '2FA enabled successfully!' });
      
      // Reset setup state
      setTwoFactorSetup({ qrCode: '', secret: '', manualEntryKey: '', verificationCode: '', showSetup: false, showDisable: false, loading: false });
      
      // Reload 2FA status
      await loadSecuritySettings();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to verify 2FA code' });
      setTwoFactorSetup(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDisable2FA = async () => {
    setTwoFactorSetup(prev => ({ ...prev, loading: true }));
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/auth/2fa/disable', {
        password: disablePassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: response.data.message || '2FA disabled successfully.' });
      setDisablePassword('');
      setTwoFactorSetup(prev => ({ ...prev, showDisable: false }));
      
      // Reload 2FA status
      await loadSecuritySettings();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to disable 2FA' });
    } finally {
      setTwoFactorSetup(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSecurityUpdate = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.put('/api/user/security', securitySettings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Security settings updated successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update security settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.put('/api/user/notifications', notificationSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Notification settings updated successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update notification settings' });
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    Cookies.remove('authToken');
    sessionStorage.removeItem('authToken');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/" className="text-sm text-gray-600 hover:text-gray-900">← Back to Dashboard</a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'profile', name: 'Profile', icon: '👤' },
              { id: 'security', name: 'Security', icon: '🔒' },
              { id: 'notifications', name: 'Notifications', icon: '🔔' },
              { id: 'preferences', name: 'Preferences', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              <p className="mt-1 text-sm text-gray-500">Update your personal information</p>
            </div>
            
            <div className="px-6 py-6">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Manage your account security preferences</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* Two-Factor Authentication Section */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication (2FA)</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Add an extra layer of security using an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                      </p>
                      {securitySettings.twoFactorEnabled && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm text-green-800">
                            <strong>✓ 2FA Enabled:</strong> Your account is protected. You'll need both your password and a code from your authenticator app to log in.
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleToggle2FA}
                      disabled={twoFactorSetup.loading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 ${
                        securitySettings.twoFactorEnabled ? 'bg-green-600' : 'bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show QR code setup when toggling ON */}
                  {twoFactorSetup.showSetup && !securitySettings.twoFactorEnabled && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-2">Step 1: Scan QR Code</p>
                        <p className="mb-4">Open your authenticator app and scan this QR code:</p>
                        {twoFactorSetup.qrCode && (
                          <div className="flex justify-center mb-4">
                            <img src={twoFactorSetup.qrCode} alt="2FA QR Code" className="border-2 border-gray-200 rounded-lg p-2 bg-white" />
                          </div>
                        )}
                        <p className="font-medium mb-2">Or enter this key manually:</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 font-mono text-sm text-center">
                          {twoFactorSetup.manualEntryKey}
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium mb-2 text-sm text-gray-600">Step 2: Enter Verification Code</p>
                        <p className="text-xs text-gray-500 mb-2">Enter the 6-digit code from your authenticator app to verify setup:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={twoFactorSetup.verificationCode}
                            onChange={(e) => setTwoFactorSetup(prev => ({ ...prev, verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                            placeholder="000000"
                            maxLength={6}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono tracking-widest focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleVerify2FA}
                            disabled={twoFactorSetup.verificationCode.length !== 6 || twoFactorSetup.loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {twoFactorSetup.loading ? 'Verifying...' : 'Verify & Enable'}
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setTwoFactorSetup({ qrCode: '', secret: '', manualEntryKey: '', verificationCode: '', showSetup: false, showDisable: false, loading: false });
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Show password input when toggling OFF */}
                  {twoFactorSetup.showDisable && securitySettings.twoFactorEnabled && (
                    <div className="mt-4 border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter your password to disable 2FA
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder="Enter your password"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleDisable2FA}
                          disabled={!disablePassword || twoFactorSetup.loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Disable
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setTwoFactorSetup(prev => ({ ...prev, showDisable: false }));
                          setDisablePassword('');
                        }}
                        className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Login Notifications</h4>
                    <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings(prev => ({ ...prev, loginNotifications: !prev.loginNotifications }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.loginNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securitySettings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSecurityUpdate}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Choose how you want to be notified</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="space-y-6">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                  { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
                  { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive browser push notifications' },
                  { key: 'withdrawalAlerts', label: 'Withdrawal Alerts', description: 'Get notified about withdrawal activities' },
                  { key: 'depositAlerts', label: 'Deposit Alerts', description: 'Get notified about deposit activities' },
                  { key: 'priceAlerts', label: 'Price Alerts', description: 'Get notified about price changes' }
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ 
                        ...prev, 
                        [setting.key]: !prev[setting.key as keyof typeof prev] 
                      }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings[setting.key as keyof typeof notificationSettings] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings[setting.key as keyof typeof notificationSettings] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
                
                <div className="flex justify-end">
                  <button
                    onClick={handleNotificationUpdate}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Notification Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Account Preferences</h3>
              <p className="mt-1 text-sm text-gray-500">Manage your account preferences</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Danger Zone</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>These actions are irreversible. Please be careful.</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={logout}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}