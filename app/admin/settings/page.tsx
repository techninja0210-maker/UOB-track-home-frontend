'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface Settings {
  system_name: string;
  gold_price_api: string;
  crypto_price_api: string;
  email_notifications: boolean;
  maintenance_mode: boolean;
  withdrawal_fee_btc: number;
  withdrawal_fee_eth: number;
  withdrawal_fee_usdt: number;
  max_withdrawal_daily: number;
  auto_withdrawal_approval: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    system_name: 'UOB Security House',
    gold_price_api: 'metals.dev',
    crypto_price_api: 'coin gecko',
    email_notifications: true,
    maintenance_mode: false,
    withdrawal_fee_btc: 0.0005,
    withdrawal_fee_eth: 0.005,
    withdrawal_fee_usdt: 0.01,
    max_withdrawal_daily: 10000,
    auto_withdrawal_approval: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/settings');
      if (response.data) {
        setSettings({ ...settings, ...response.data });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Keep default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await api.post('/api/admin/settings', settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetToDefaults = () => {
    setSettings({
      system_name: 'UOB Security House',
      gold_price_api: 'metals.dev',
      crypto_price_api: 'coin gecko',
      email_notifications: true,
      maintenance_mode: false,
      withdrawal_fee_btc: 0.0005,
      withdrawal_fee_eth: 0.005,
      withdrawal_fee_usdt: 0.01,
      max_withdrawal_daily: 10000,
      auto_withdrawal_approval: false
    });
  };

  return (
    <AdminLayout title="System Settings" subtitle="Configure platform settings and preferences">
      <div className="settings-management">
        {/* Message Display */}
        {message && (
          <div className={`message ${message.type}`}>
            <div className="message-icon">
              {message.type === 'success' ? '✅' : '❌'}
            </div>
            <span>{message.text}</span>
          </div>
        )}

        <div className="settings-grid">
          {/* General Settings */}
          <div className="settings-section">
            <h3 className="section-title">General Settings</h3>
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">System Name</label>
                <input
                  type="text"
                  value={settings.system_name}
                  onChange={(e) => handleInputChange('system_name', e.target.value)}
                  className="form-input"
                  placeholder="Enter system name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Maintenance Mode</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
                    className="toggle-input"
                    id="maintenance"
                  />
                  <label htmlFor="maintenance" className="toggle-label">
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-text">
                    {settings.maintenance_mode ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Notifications</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                    className="toggle-input"
                    id="email"
                  />
                  <label htmlFor="email" className="toggle-label">
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-text">
                    {settings.email_notifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div className="settings-section">
            <h3 className="section-title">API Configuration</h3>
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Gold Price API</label>
                <select
                  value={settings.gold_price_api}
                  onChange={(e) => handleInputChange('gold_price_api', e.target.value)}
                  className="form-select"
                >
                  <option value="metals.dev">Metals.dev</option>
                  <option value="goldapi.io">GoldAPI.io</option>
                  <option value="api.metals.live">Metals.live</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Crypto Price API</label>
                <select
                  value={settings.crypto_price_api}
                  onChange={(e) => handleInputChange('crypto_price_api', e.target.value)}
                  className="form-select"
                >
                  <option value="coin gecko">CoinGecko</option>
                  <option value="binance">Binance</option>
                  <option value="coinbase">Coinbase</option>
                </select>
              </div>
            </div>
          </div>

          {/* Withdrawal Settings */}
          <div className="settings-section">
            <h3 className="section-title">Withdrawal Configuration</h3>
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">BTC Withdrawal Fee (%)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="10"
                  value={settings.withdrawal_fee_btc}
                  onChange={(e) => handleInputChange('withdrawal_fee_btc', parseFloat(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">ETH Withdrawal Fee (%)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="10"
                  value={settings.withdrawal_fee_eth}
                  onChange={(e) => handleInputChange('withdrawal_fee_eth', parseFloat(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">USDT Withdrawal Fee (%)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="10"
                  value={settings.withdrawal_fee_usdt}
                  onChange={(e) => handleInputChange('withdrawal_fee_usdt', parseFloat(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Daily Withdrawal Limit ($)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.max_withdrawal_daily}
                  onChange={(e) => handleInputChange('max_withdrawal_daily', parseInt(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Auto-approve Withdrawals</label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.auto_withdrawal_approval}
                    onChange={(e) => handleInputChange('auto_withdrawal_approval', e.target.checked)}
                    className="toggle-input"
                    id="auto-approval"
                  />
                  <label htmlFor="auto-approval" className="toggle-label">
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-text">
                    {settings.auto_withdrawal_approval ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button
            onClick={resetToDefaults}
            className="action-btn reset-btn"
            disabled={saving}
          >
            🔄 Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="action-btn save-btn"
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <div className="loading-spinner"></div>
                Saving...
              </>
            ) : (
              <>
                💾 Save Settings
              </>
            )}
          </button>
        </div>

        {/* System Info */}
        <div className="system-info">
          <h3 className="section-title">System Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Platform Version</span>
              <span className="info-value">v1.0.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">Database Status</span>
              <span className="info-value status-online">Online</span>
            </div>
            <div className="info-item">
              <span className="info-label">API Status</span>
              <span className="info-value status-online">Online</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Backup</span>
              <span className="info-value">Today 12:00 AM</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-management {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid #4CAF50;
          color: #4CAF50;
        }

        .message.error {
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid #f44336;
          color: #f44336;
        }

        .message-icon {
          font-size: 1.2rem;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .settings-section {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
        }

        .section-title {
          color: #FFD700;
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          color: #CCCCCC;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .form-input,
        .form-select {
          padding: 0.75rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #FFD700;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .toggle-input {
          display: none;
        }

        .toggle-label {
          position: relative;
          width: 50px;
          height: 24px;
          background: #444;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .toggle-input:checked + .toggle-label {
          background: #FFD700;
        }

        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .toggle-input:checked + .toggle-label .toggle-slider {
          transform: translateX(26px);
        }

        .toggle-text {
          color: #CCCCCC;
          font-weight: 500;
        }

        .settings-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 2rem;
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reset-btn {
          background: #666;
          color: white;
        }

        .reset-btn:hover:not(:disabled) {
          background: #777;
        }

        .save-btn {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #1A1A1A;
          font-weight: 600;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .system-info {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #1A1A1A;
          border-radius: 8px;
          border: 1px solid #333;
        }

        .info-label {
          color: #CCCCCC;
          font-weight: 500;
        }

        .info-value {
          color: white;
          font-weight: 600;
        }

        .status-online {
          color: #4CAF50 !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
          
          .settings-actions {
            flex-direction: column;
          }
          
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .info-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </AdminLayout>
  );
}