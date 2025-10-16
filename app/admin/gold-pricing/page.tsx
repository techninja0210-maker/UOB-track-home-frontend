'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface GoldPrice {
  currency: string;
  price: number;
  change_24h: number;
  last_updated: string;
}

interface PriceSettings {
  markup_percentage: number;
  spread_percentage: number;
  minimum_order: number;
  maximum_order: number;
  auto_update: boolean;
}

export default function AdminGoldPricing() {
  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>({
    markup_percentage: 2.5,
    spread_percentage: 0.5,
    minimum_order: 1,
    maximum_order: 1000,
    auto_update: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadGoldPrices();
    loadPriceSettings();
  }, []);

  const loadGoldPrices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/gold-prices');
      const data = response.data;
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setGoldPrices(data);
      } else {
        console.warn('API returned non-array data:', data);
        setGoldPrices([]);
      }
    } catch (error) {
      console.error('Error loading gold prices:', error);
      // Mock data for development - always ensure it's an array
      setGoldPrices([
        {
          currency: 'USD',
          price: 2050.75,
          change_24h: 12.45,
          last_updated: new Date().toISOString()
        },
        {
          currency: 'EUR',
          price: 1890.32,
          change_24h: -8.23,
          last_updated: new Date().toISOString()
        },
        {
          currency: 'GBP',
          price: 1625.89,
          change_24h: 5.67,
          last_updated: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceSettings = async () => {
    try {
      const response = await api.get('/api/admin/gold-settings');
      if (response.data) {
        setPriceSettings({ ...priceSettings, ...response.data });
      }
    } catch (error) {
      console.error('Error loading price settings:', error);
      // Keep default settings
    }
  };

  const savePriceSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await api.post('/api/admin/gold-settings', priceSettings);
      setMessage({ type: 'success', text: 'Price settings saved successfully!' });
    } catch (error) {
      console.error('Error saving price settings:', error);
      setMessage({ type: 'error', text: 'Failed to save price settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const updatePrice = async (currency: string) => {
    try {
      await api.post('/api/admin/update-gold-price', { currency });
      await loadGoldPrices();
      alert(`${currency} gold price updated successfully!`);
    } catch (error: any) {
      console.error('Error updating price:', error);
      alert(`Failed to update ${currency} price: ${error.response?.data?.message || 'Unknown error'}`);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'GBP'
    }).format(price);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? '#4CAF50' : '#f44336';
    return { text: `${sign}${change.toFixed(2)}`, color };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateSpread = (price: number) => {
    const buyPrice = price * (1 + priceSettings.spread_percentage / 100);
    const sellPrice = price * (1 - priceSettings.spread_percentage / 100);
    return { buyPrice, sellPrice };
  };

  return (
    <AdminLayout title="Gold Pricing Management" subtitle="Manage gold prices and trading settings">
      <div className="gold-pricing-management">
        {/* Message Display */}
        {message && (
          <div className={`message ${message.type}`}>
            <div className="message-icon">
              {message.type === 'success' ? '✅' : '❌'}
            </div>
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Gold Prices */}
        <div className="prices-section">
          <div className="section-header">
            <h2 className="section-title">Current Gold Prices</h2>
            <button 
              onClick={loadGoldPrices}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? '🔄 Loading...' : '🔄 Refresh Prices'}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading gold prices...</p>
            </div>
          ) : (
            <div className="prices-grid">
              {Array.isArray(goldPrices) && goldPrices.length > 0 ? goldPrices.map((price) => {
                const change = formatChange(price.change_24h);
                const spread = calculateSpread(price.price);
                
                return (
                  <div key={price.currency} className="price-card">
                    <div className="price-header">
                      <h3 className="currency-name">{price.currency}</h3>
                      <button 
                        onClick={() => updatePrice(price.currency)}
                        className="update-btn"
                      >
                        Update
                      </button>
                    </div>
                    
                    <div className="price-main">
                      <div className="current-price">
                        {formatPrice(price.price, price.currency)}
                      </div>
                      <div 
                        className="price-change"
                        style={{ color: change.color }}
                      >
                        {change.text} ({((price.change_24h / price.price) * 100).toFixed(2)}%)
                      </div>
                    </div>
                    
                    <div className="price-spread">
                      <div className="spread-item">
                        <span className="spread-label">Buy Price:</span>
                        <span className="spread-value buy">
                          {formatPrice(spread.buyPrice, price.currency)}
                        </span>
                      </div>
                      <div className="spread-item">
                        <span className="spread-label">Sell Price:</span>
                        <span className="spread-value sell">
                          {formatPrice(spread.sellPrice, price.currency)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="price-footer">
                      <span className="last-updated">
                        Updated: {formatDate(price.last_updated)}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className="no-prices">
                  <div className="no-prices-icon">🏆</div>
                  <h3>No Gold Prices Available</h3>
                  <p>Unable to load gold prices. Please try refreshing or check your connection.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price Settings */}
        <div className="settings-section">
          <h2 className="section-title">Price Settings</h2>
          
          <div className="settings-grid">
            <div className="form-group">
              <label className="form-label">Markup Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={priceSettings.markup_percentage}
                onChange={(e) => setPriceSettings(prev => ({
                  ...prev,
                  markup_percentage: parseFloat(e.target.value)
                }))}
                className="form-input"
              />
              <span className="form-help">Additional markup on gold prices</span>
            </div>

            <div className="form-group">
              <label className="form-label">Spread Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={priceSettings.spread_percentage}
                onChange={(e) => setPriceSettings(prev => ({
                  ...prev,
                  spread_percentage: parseFloat(e.target.value)
                }))}
                className="form-input"
              />
              <span className="form-help">Buy/sell price spread</span>
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Order (oz)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={priceSettings.minimum_order}
                onChange={(e) => setPriceSettings(prev => ({
                  ...prev,
                  minimum_order: parseFloat(e.target.value)
                }))}
                className="form-input"
              />
              <span className="form-help">Minimum gold order size</span>
            </div>

            <div className="form-group">
              <label className="form-label">Maximum Order (oz)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={priceSettings.maximum_order}
                onChange={(e) => setPriceSettings(prev => ({
                  ...prev,
                  maximum_order: parseInt(e.target.value)
                }))}
                className="form-input"
              />
              <span className="form-help">Maximum gold order size</span>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Auto Update Prices</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={priceSettings.auto_update}
                  onChange={(e) => setPriceSettings(prev => ({
                    ...prev,
                    auto_update: e.target.checked
                  }))}
                  className="toggle-input"
                  id="auto-update"
                />
                <label htmlFor="auto-update" className="toggle-label">
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-text">
                  {priceSettings.auto_update ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <span className="form-help">Automatically update prices from API</span>
            </div>
          </div>

          <div className="settings-actions">
            <button
              onClick={savePriceSettings}
              className="action-btn save-btn"
              disabled={saving}
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
        </div>

        {/* Market Info */}
        <div className="market-info-section">
          <h2 className="section-title">Market Information</h2>
          <div className="market-cards">
            <div className="market-card">
              <div className="market-icon">📈</div>
              <div className="market-content">
                <h3>Market Status</h3>
                <p className="market-status online">Open</p>
              </div>
            </div>
            <div className="market-card">
              <div className="market-icon">🕐</div>
              <div className="market-content">
                <h3>Next Update</h3>
                <p>Every 5 minutes</p>
              </div>
            </div>
            <div className="market-card">
              <div className="market-icon">🔄</div>
              <div className="market-content">
                <h3>API Status</h3>
                <p className="api-status online">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gold-pricing-management {
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

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          color: #FFD700;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: none;
          border-radius: 8px;
          color: #1A1A1A;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .prices-section,
        .settings-section,
        .market-info-section {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
        }

        .prices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .price-card {
          background: #1A1A1A;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .price-card:hover {
          border-color: #FFD700;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
        }

        .price-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .currency-name {
          color: #FFD700;
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .update-btn {
          padding: 0.5rem 1rem;
          background: #4CAF50;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .update-btn:hover {
          background: #45a049;
        }

        .price-main {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .current-price {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.5rem;
        }

        .price-change {
          font-size: 1rem;
          font-weight: 600;
        }

        .price-spread {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .spread-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: #333;
          border-radius: 6px;
        }

        .spread-label {
          color: #CCCCCC;
          font-size: 0.9rem;
        }

        .spread-value {
          font-weight: 600;
        }

        .spread-value.buy {
          color: #4CAF50;
        }

        .spread-value.sell {
          color: #f44336;
        }

        .price-footer {
          text-align: center;
        }

        .last-updated {
          color: #CCCCCC;
          font-size: 0.8rem;
        }

        .no-prices {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
          text-align: center;
          grid-column: 1 / -1;
        }

        .no-prices-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-prices h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .no-prices p {
          margin: 0;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          color: #CCCCCC;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .form-input {
          padding: 0.75rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #FFD700;
        }

        .form-help {
          color: #999;
          font-size: 0.85rem;
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

        .save-btn {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #1A1A1A;
          font-weight: 600;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .market-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .market-card {
          background: #1A1A1A;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .market-icon {
          font-size: 2rem;
        }

        .market-content h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .market-content p {
          color: #CCCCCC;
          margin: 0;
          font-size: 0.9rem;
        }

        .market-status.online,
        .api-status.online {
          color: #4CAF50 !important;
          font-weight: 600;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .prices-grid {
            grid-template-columns: 1fr;
          }
          
          .settings-grid {
            grid-template-columns: 1fr;
          }
          
          .market-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
}