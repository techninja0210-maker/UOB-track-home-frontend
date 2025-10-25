'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

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
  const [loading, setLoading] = useState(false);
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

  const updateGoldPrice = async (currency: string, newPrice: number) => {
    try {
      await api.post('/api/admin/update-gold-price', {
        currency,
        price: newPrice
      });
      
      // Update local state
      setGoldPrices(prev => prev.map(price => 
        price.currency === currency 
          ? { ...price, price: newPrice, last_updated: new Date().toISOString() }
          : price
      ));
      
      setMessage({ type: 'success', text: `${currency} gold price updated successfully!` });
    } catch (error) {
      console.error('Error updating gold price:', error);
      setMessage({ type: 'error', text: `Failed to update ${currency} gold price. Please try again.` });
    }
  };


  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gold Pricing Management</h1>
          <p className="mt-2 text-gray-600">Manage gold prices and pricing settings</p>
        </div>
        
        {/* Message Display */}
        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
                </div>
              )}

        {/* Current Gold Prices */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Current Gold Prices</h2>
                <button 
              onClick={loadGoldPrices}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200"
            >
              Refresh Prices
                </button>
              </div>
              
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {goldPrices.map((price) => (
              <div key={price.currency} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{price.currency} Gold</h3>
                  <span className={`text-sm font-medium ${
                    price.change_24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(price.change_24h)}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {formatCurrency(price.price)}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Last updated: {new Date(price.last_updated).toLocaleString()}
                </p>
                
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={price.price}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="New price"
                  />
                          <button 
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const newPrice = parseFloat(input.value);
                      if (!isNaN(newPrice) && newPrice > 0) {
                        updateGoldPrice(price.currency, newPrice);
                      }
                    }}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                  >
                    Update
                          </button>
              </div>
            </div>
            ))}
          </div>

          {goldPrices.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-yellow-600 text-3xl">🥇</span>
                  </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Gold Prices Available</h3>
              <p className="text-gray-500">Gold prices are not currently available.</p>
                </div>
          )}
                </div>

        {/* Price Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Pricing Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Percentage (%)
              </label>
                    <input 
                type="number"
                step="0.1"
                value={priceSettings.markup_percentage}
                onChange={(e) => setPriceSettings({
                  ...priceSettings,
                  markup_percentage: parseFloat(e.target.value) || 0
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spread Percentage (%)
              </label>
                    <input 
                type="number"
                step="0.1"
                value={priceSettings.spread_percentage}
                onChange={(e) => setPriceSettings({
                  ...priceSettings,
                  spread_percentage: parseFloat(e.target.value) || 0
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
                </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Order (grams)
              </label>
                    <input 
                type="number"
                step="0.1"
                value={priceSettings.minimum_order}
                onChange={(e) => setPriceSettings({
                  ...priceSettings,
                  minimum_order: parseFloat(e.target.value) || 0
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
                </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Order (grams)
              </label>
                    <input 
                type="number"
                step="0.1"
                value={priceSettings.maximum_order}
                onChange={(e) => setPriceSettings({
                  ...priceSettings,
                  maximum_order: parseFloat(e.target.value) || 0
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
                  </div>
                </div>

          <div className="mt-6">
            <label className="flex items-center">
                  <input 
                type="checkbox"
                checked={priceSettings.auto_update}
                onChange={(e) => setPriceSettings({
                  ...priceSettings,
                  auto_update: e.target.checked
                })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-update prices from external sources</span>
            </label>
                </div>

          <div className="mt-6">
            <button
              onClick={savePriceSettings}
              disabled={saving}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
    </AdminLayout>
  );
}