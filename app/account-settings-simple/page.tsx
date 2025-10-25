'use client';

import { useState } from 'react';

export default function SimpleAccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    defaultValue="John Doe"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    defaultValue="john@example.com"
                    disabled
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    defaultValue="+1 (555) 123-4567"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    defaultValue="User"
                    disabled
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Update Profile
                </button>
              </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Login Notifications</h4>
                    <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
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
                    <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      setting.key === 'emailNotifications' || setting.key === 'pushNotifications' || setting.key === 'withdrawalAlerts' || setting.key === 'depositAlerts' 
                        ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        setting.key === 'emailNotifications' || setting.key === 'pushNotifications' || setting.key === 'withdrawalAlerts' || setting.key === 'depositAlerts'
                          ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
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
                      <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
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
