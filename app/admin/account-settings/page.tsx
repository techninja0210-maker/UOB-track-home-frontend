'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import Cookies from 'js-cookie';

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  withdrawalEnabled: boolean;
  depositEnabled: boolean;
  maxWithdrawalAmount: number;
  minWithdrawalAmount: number;
  withdrawalFee: number;
  sessionTimeout: number;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  ipWhitelist: string[];
  loginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

export default function AdminAccountSettingsPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
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

  // System settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    withdrawalEnabled: true,
    depositEnabled: true,
    maxWithdrawalAmount: 10000,
    minWithdrawalAmount: 0.001,
    withdrawalFee: 0.5,
    sessionTimeout: 30
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorRequired: false,
    ipWhitelist: [],
    loginAttempts: 5,
    lockoutDuration: 15,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false
    }
  });

  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadAdminData();
    loadSystemSettings();
  }, []);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle both possible response structures
      const userData = response.data.data || response.data;
      
      if (userData.role !== 'admin') {
        router.push('/');
        return;
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const loadAdminData = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle both possible response structures
      const adminData = response.data.data || response.data;
      setAdmin(adminData);
      setProfileForm({
        fullName: adminData.fullName || adminData.full_name || '',
        email: adminData.email || '',
        phone: adminData.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
      setMessage({ type: 'error', text: 'Failed to load admin data' });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/admin/system-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle both possible response structures
      const systemData = response.data.data || response.data;
      if (systemData) {
        setSystemSettings(systemData);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
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
      
      loadAdminData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileForm.newPassword !== profileForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (profileForm.newPassword.length < securitySettings.passwordPolicy.minLength) {
      setMessage({ type: 'error', text: `Password must be at least ${securitySettings.passwordPolicy.minLength} characters long` });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.put('/api/user/password', {
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const handleSystemSettingsUpdate = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.put('/api/admin/system-settings', systemSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'System settings updated successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update system settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySettingsUpdate = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.put('/api/admin/security-settings', securitySettings, {
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
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Account Settings</h1>
          <p className="mt-2 text-gray-600">Manage your admin account and system settings</p>
        </div>

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
              { id: 'system', name: 'System Settings', icon: '⚙️' },
              { id: 'security', name: 'Security', icon: '🔒' },
              { id: 'advanced', name: 'Advanced', icon: '🛠️' }
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
              <h3 className="text-lg font-medium text-gray-900">Admin Profile</h3>
              <p className="mt-1 text-sm text-gray-500">Update your admin profile information</p>
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
                      value={admin?.role || ''}
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

              {/* Password Change */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Change Password</h4>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Configure platform-wide settings</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Maintenance Mode</h4>
                      <p className="text-sm text-gray-500">Temporarily disable platform access</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        systemSettings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          systemSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Registration Enabled</h4>
                      <p className="text-sm text-gray-500">Allow new user registrations</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings(prev => ({ ...prev, registrationEnabled: !prev.registrationEnabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        systemSettings.registrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          systemSettings.registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Withdrawals Enabled</h4>
                      <p className="text-sm text-gray-500">Allow user withdrawals</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings(prev => ({ ...prev, withdrawalEnabled: !prev.withdrawalEnabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        systemSettings.withdrawalEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          systemSettings.withdrawalEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Deposits Enabled</h4>
                      <p className="text-sm text-gray-500">Allow user deposits</p>
                    </div>
                    <button
                      onClick={() => setSystemSettings(prev => ({ ...prev, depositEnabled: !prev.depositEnabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        systemSettings.depositEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          systemSettings.depositEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Withdrawal Amount</label>
                    <input
                      type="number"
                      value={systemSettings.maxWithdrawalAmount}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maxWithdrawalAmount: parseFloat(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Withdrawal Amount</label>
                    <input
                      type="number"
                      step="0.001"
                      value={systemSettings.minWithdrawalAmount}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, minWithdrawalAmount: parseFloat(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Withdrawal Fee (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={systemSettings.withdrawalFee}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, withdrawalFee: parseFloat(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSystemSettingsUpdate}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save System Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Configure security policies and access controls</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Require Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500">Force all users to enable 2FA</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactorRequired: !prev.twoFactorRequired }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.twoFactorRequired ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securitySettings.twoFactorRequired ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
                    <input
                      type="number"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, loginAttempts: parseInt(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lockout Duration (minutes)</label>
                    <input
                      type="number"
                      value={securitySettings.lockoutDuration}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Password Policy</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Minimum Length</label>
                      <input
                        type="number"
                        value={securitySettings.passwordPolicy.minLength}
                        onChange={(e) => setSecuritySettings(prev => ({ 
                          ...prev, 
                          passwordPolicy: { ...prev.passwordPolicy, minLength: parseInt(e.target.value) }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.passwordPolicy.requireUppercase}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            passwordPolicy: { ...prev.passwordPolicy, requireUppercase: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Require Uppercase</label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.passwordPolicy.requireLowercase}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            passwordPolicy: { ...prev.passwordPolicy, requireLowercase: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Require Lowercase</label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.passwordPolicy.requireNumbers}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            passwordPolicy: { ...prev.passwordPolicy, requireNumbers: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Require Numbers</label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.passwordPolicy.requireSymbols}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            passwordPolicy: { ...prev.passwordPolicy, requireSymbols: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Require Symbols</label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSecuritySettingsUpdate}
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

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Advanced Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Advanced system configuration and maintenance</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">System Maintenance</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Advanced system operations and maintenance tools.</p>
                      </div>
                      <div className="mt-4 space-x-3">
                        <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
                          Clear Cache
                        </button>
                        <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
                          Rebuild Indexes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
